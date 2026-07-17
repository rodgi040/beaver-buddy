// Secret store is mocked (never the real one); the handlers under test are
// Electron-free by construction (createSettingsHandlers takes the frame
// check as a predicate), so importing settings-window.ts here is safe the
// same way tray.test.ts's import of tray.ts is — no Electron API is called.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IpcMainInvokeEvent } from 'electron';
import { createSettingsHandlers, nextModeAfterDisconnect, nextModeAfterSave, type SettingsWindowDeps } from './settings-window';
import { deleteSecret, setSecret } from './secrets';
import type { SettingsState } from './settings-store';

vi.mock('./secrets', () => ({
  setSecret: vi.fn().mockResolvedValue(undefined),
  deleteSecret: vi.fn().mockResolvedValue(undefined),
}));

const setSecretMock = vi.mocked(setSecret);
const deleteSecretMock = vi.mocked(deleteSecret);

describe('nextModeAfterSave', () => {
  it('forces tokens when mrr is requested with nothing connected', () => {
    expect(nextModeAfterSave('mrr', false, false)).toBe('tokens');
  });

  it('preserves mrr when a source is connected', () => {
    expect(nextModeAfterSave('mrr', true, false)).toBe('mrr');
    expect(nextModeAfterSave('mrr', false, true)).toBe('mrr');
  });

  it('tokens always stays tokens', () => {
    expect(nextModeAfterSave('tokens', true, true)).toBe('tokens');
    expect(nextModeAfterSave('tokens', false, false)).toBe('tokens');
  });
});

describe('nextModeAfterDisconnect', () => {
  it('forces tokens when the last connected source is removed', () => {
    expect(nextModeAfterDisconnect('mrr', false, false)).toBe('tokens');
  });

  it('preserves mrr when one of two sources remains', () => {
    expect(nextModeAfterDisconnect('mrr', true, false)).toBe('mrr');
    expect(nextModeAfterDisconnect('mrr', false, true)).toBe('mrr');
  });

  it('tokens stays tokens regardless', () => {
    expect(nextModeAfterDisconnect('tokens', false, false)).toBe('tokens');
    expect(nextModeAfterDisconnect('tokens', true, true)).toBe('tokens');
  });
});

describe('createSettingsHandlers', () => {
  let stateDir: string;
  let settings: SettingsState;
  let changed: SettingsState[];

  const fakeEvent = {} as IpcMainInvokeEvent;

  function deps(): SettingsWindowDeps {
    return {
      stateDir,
      keychainService: 'svc',
      getSettings: () => settings,
      onSettingsChanged: (next) => {
        settings = next;
        changed.push(next);
      },
      onProgressReset: vi.fn().mockResolvedValue(undefined),
    };
  }

  beforeEach(() => {
    stateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bb-settings-window-'));
    settings = { mode: 'tokens', stripeConnected: false, revenuecatConnected: false };
    changed = [];
    setSecretMock.mockClear();
    deleteSecretMock.mockClear();
  });

  afterEach(() => {
    fs.rmSync(stateDir, { recursive: true, force: true });
  });

  it('unauthorized sender is rejected on all four handlers, with no state change', async () => {
    const d = deps();
    const handlers = createSettingsHandlers(d, () => false);
    expect(handlers.readStatus(fakeEvent)).toEqual({ error: 'unauthorized' });
    await expect(handlers.save(fakeEvent, { stripeKey: 'rk_fake' })).resolves.toEqual({ ok: false, error: 'unauthorized' });
    await expect(handlers.disconnect(fakeEvent, { target: 'stripe' })).resolves.toEqual({ ok: false, error: 'unauthorized' });
    await expect(handlers.resetProgress(fakeEvent)).resolves.toEqual({ ok: false, error: 'unauthorized' });
    expect(changed).toHaveLength(0);
    expect(d.onProgressReset).not.toHaveBeenCalled();
  });

  it('readStatus returns only the three booleans/mode fields', () => {
    const handlers = createSettingsHandlers(deps(), () => true);
    expect(handlers.readStatus(fakeEvent)).toEqual({ stripeConnected: false, revenuecatConnected: false, mode: 'tokens' });
  });

  it('save with a key connects the source and persists', async () => {
    const handlers = createSettingsHandlers(deps(), () => true);
    await expect(handlers.save(fakeEvent, { stripeKey: 'rk_fake' })).resolves.toEqual({ ok: true });
    expect(settings).toEqual({ mode: 'tokens', stripeConnected: true, revenuecatConnected: false });
    expect(setSecretMock).toHaveBeenCalledWith(stateDir, 'svc', 'stripe-key', 'rk_fake');
  });

  it('save with revenuecat credentials stores both key and project id', async () => {
    const handlers = createSettingsHandlers(deps(), () => true);
    await expect(
      handlers.save(fakeEvent, { revenuecatKey: 'rc_fake', revenuecatProjectId: 'proj_1' }),
    ).resolves.toEqual({ ok: true });
    expect(setSecretMock).toHaveBeenCalledWith(stateDir, 'svc', 'revenuecat-key', 'rc_fake');
    expect(setSecretMock).toHaveBeenCalledWith(stateDir, 'svc', 'revenuecat-project', 'proj_1');
  });

  it('save requesting mrr with nothing connected is forced back to tokens', async () => {
    const handlers = createSettingsHandlers(deps(), () => true);
    await handlers.save(fakeEvent, { mode: 'mrr' });
    expect(settings.mode).toBe('tokens');
  });

  it('disconnecting the last source forces mode back to tokens', async () => {
    settings = { mode: 'mrr', stripeConnected: true, revenuecatConnected: false };
    const handlers = createSettingsHandlers(deps(), () => true);
    await handlers.disconnect(fakeEvent, { target: 'stripe' });
    expect(settings).toEqual({ mode: 'tokens', stripeConnected: false, revenuecatConnected: false });
    expect(deleteSecretMock).toHaveBeenCalledWith(stateDir, 'svc', 'stripe-key');
  });

  it('disconnecting one of two sources preserves mrr mode', async () => {
    settings = { mode: 'mrr', stripeConnected: true, revenuecatConnected: true };
    const handlers = createSettingsHandlers(deps(), () => true);
    await handlers.disconnect(fakeEvent, { target: 'revenuecat' });
    expect(settings).toEqual({ mode: 'mrr', stripeConnected: true, revenuecatConnected: false });
    expect(deleteSecretMock).toHaveBeenCalledWith(stateDir, 'svc', 'revenuecat-key');
    expect(deleteSecretMock).toHaveBeenCalledWith(stateDir, 'svc', 'revenuecat-project');
  });

  it('resetProgress calls the dep exactly once and reports success', async () => {
    const d = deps();
    const handlers = createSettingsHandlers(d, () => true);
    await expect(handlers.resetProgress(fakeEvent)).resolves.toEqual({ ok: true });
    expect(d.onProgressReset).toHaveBeenCalledTimes(1);
  });

  it('resetProgress maps a dep failure onto { ok: false }', async () => {
    const d = deps();
    vi.mocked(d.onProgressReset).mockRejectedValue(new Error('boom'));
    const handlers = createSettingsHandlers(d, () => true);
    await expect(handlers.resetProgress(fakeEvent)).resolves.toEqual({ ok: false, error: 'reset failed' });
  });
});
