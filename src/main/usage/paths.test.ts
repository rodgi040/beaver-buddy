import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { discoverPaths } from './paths';

// Synthetic directory trees only, built under a fresh temp "home" per test
// (CLAUDE.md: never the operator's real ~/.claude or ~/.codex). Fake project
// slugs ("project-a"), no real usernames or paths.

let home: string;

beforeEach(() => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), 'bb-paths-'));
});

afterEach(() => {
  fs.rmSync(home, { recursive: true, force: true });
});

function touch(filePath: string, content = '{}'): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

describe.each(['win32', 'darwin', 'linux'] as const)('discoverPaths — Claude on %s', (platform) => {
  it('finds top-level session files and subagent files, ignores non-jsonl entries', () => {
    touch(path.join(home, '.claude', 'projects', 'project-a', 'session-1.jsonl'));
    touch(path.join(home, '.claude', 'projects', 'project-a', 'session-1', 'subagents', 'sub-1.jsonl'));
    touch(path.join(home, '.claude', 'projects', 'project-a', 'notes.txt'));

    const { claudeFiles } = discoverPaths({}, home, platform);
    expect([...claudeFiles].sort()).toEqual(
      [
        path.join(home, '.claude', 'projects', 'project-a', 'session-1.jsonl'),
        path.join(home, '.claude', 'projects', 'project-a', 'session-1', 'subagents', 'sub-1.jsonl'),
      ].sort(),
    );
  });

  it('honors a comma-separated CLAUDE_CONFIG_DIR override', () => {
    const dirA = path.join(home, 'custom-a');
    const dirB = path.join(home, 'custom-b');
    touch(path.join(dirA, 'projects', 'project-a', 'session-1.jsonl'));
    touch(path.join(dirB, 'projects', 'project-c', 'session-3.jsonl'));

    const { claudeFiles } = discoverPaths({ CLAUDE_CONFIG_DIR: `${dirA}, ${dirB}` }, home, platform);
    expect(claudeFiles).toHaveLength(2);
  });

  it('returns an empty array when nothing exists', () => {
    expect(discoverPaths({}, home, platform).claudeFiles).toEqual([]);
  });
});

describe.each(['darwin', 'linux'] as const)('discoverPaths — Claude on %s (XDG)', (platform) => {
  it('prefers XDG (~/.config/claude) and legacy (~/.claude) together when both exist', () => {
    touch(path.join(home, '.config', 'claude', 'projects', 'project-b', 'session-2.jsonl'));
    touch(path.join(home, '.claude', 'projects', 'project-a', 'session-1.jsonl'));

    const { claudeFiles } = discoverPaths({}, home, platform);
    expect(claudeFiles).toHaveLength(2);
  });
});

describe('discoverPaths — Claude on Windows', () => {
  it('ignores XDG path and uses legacy ~/.claude on win32', () => {
    touch(path.join(home, '.config', 'claude', 'projects', 'project-x', 'session-x.jsonl'));
    touch(path.join(home, '.claude', 'projects', 'project-y', 'session-y.jsonl'));

    const { claudeFiles } = discoverPaths({}, home, 'win32');
    expect(claudeFiles).toHaveLength(1);
    expect(claudeFiles[0]).toBe(path.join(home, '.claude', 'projects', 'project-y', 'session-y.jsonl'));
  });

  it('returns empty array when only XDG exists on win32', () => {
    touch(path.join(home, '.config', 'claude', 'projects', 'project-x', 'session-x.jsonl'));

    const { claudeFiles } = discoverPaths({}, home, 'win32');
    expect(claudeFiles).toEqual([]);
  });

  it('still honors CLAUDE_CONFIG_DIR override on win32 (single path)', () => {
    const customDir = path.join(home, 'custom-claude');
    touch(path.join(customDir, 'projects', 'project-z', 'session-z.jsonl'));

    const { claudeFiles } = discoverPaths({ CLAUDE_CONFIG_DIR: customDir }, home, 'win32');
    expect(claudeFiles).toHaveLength(1);
  });

  it('honors semicolon-separated CLAUDE_CONFIG_DIR override on win32', () => {
    const dirA = path.join(home, 'custom-a');
    const dirB = path.join(home, 'custom-b');
    touch(path.join(dirA, 'projects', 'project-a', 'session-1.jsonl'));
    touch(path.join(dirB, 'projects', 'project-b', 'session-2.jsonl'));

    const { claudeFiles } = discoverPaths(
      { CLAUDE_CONFIG_DIR: `${dirA}; ${dirB}` },
      home,
      'win32',
    );
    expect(claudeFiles).toHaveLength(2);
  });
});

describe('discoverPaths — Codex', () => {
  it('finds rollout files under sessions/YYYY/MM/DD/', () => {
    touch(path.join(home, '.codex', 'sessions', '2026', '07', '13', 'rollout-abc.jsonl'));

    const { codexFiles } = discoverPaths({}, home, 'linux');
    expect(codexFiles).toEqual([path.join(home, '.codex', 'sessions', '2026', '07', '13', 'rollout-abc.jsonl')]);
  });

  it('sessions/ wins over archived_sessions/ on a duplicate relative path', () => {
    const relPath = ['2026', '07', '13', 'rollout-dup.jsonl'];
    touch(path.join(home, '.codex', 'sessions', ...relPath), '{"marker":"live"}');
    touch(path.join(home, '.codex', 'archived_sessions', ...relPath), '{"marker":"archived"}');

    const { codexFiles } = discoverPaths({}, home, 'linux');
    expect(codexFiles).toHaveLength(1);
    expect(codexFiles[0]).toBe(path.join(home, '.codex', 'sessions', ...relPath));
  });

  it('includes archived-only files that have no sessions/ counterpart', () => {
    touch(path.join(home, '.codex', 'archived_sessions', '2025', '01', '01', 'rollout-old.jsonl'));
    const { codexFiles } = discoverPaths({}, home, 'linux');
    expect(codexFiles).toHaveLength(1);
  });

  it('honors a CODEX_HOME override', () => {
    const customHome = path.join(home, 'custom-codex');
    touch(path.join(customHome, 'sessions', '2026', '01', '01', 'rollout-x.jsonl'));

    const { codexFiles } = discoverPaths({ CODEX_HOME: customHome }, home, 'linux');
    expect(codexFiles).toHaveLength(1);
  });

  it('returns an empty array when nothing exists', () => {
    expect(discoverPaths({}, home, 'linux').codexFiles).toEqual([]);
  });
});

describe('discoverPaths — Codex on Windows', () => {
  it('prefers %LOCALAPPDATA%\\Codex over ~/.codex when both exist', () => {
    const localAppData = path.join(home, 'AppData', 'Local');
    const legacy = path.join(home, '.codex');
    touch(path.join(localAppData, 'Codex', 'sessions', '2026', '07', '13', 'rollout-local.jsonl'));
    touch(path.join(legacy, 'sessions', '2026', '07', '13', 'rollout-legacy.jsonl'));

    const { codexFiles } = discoverPaths({ LOCALAPPDATA: localAppData }, home, 'win32');
    expect(codexFiles).toHaveLength(1);
    expect(codexFiles[0]).toBe(path.join(localAppData, 'Codex', 'sessions', '2026', '07', '13', 'rollout-local.jsonl'));
  });

  it('falls back to %APPDATA%\\Codex when LOCALAPPDATA is missing', () => {
    const appData = path.join(home, 'AppData', 'Roaming');
    touch(path.join(appData, 'Codex', 'sessions', '2026', '07', '13', 'rollout-roaming.jsonl'));

    const { codexFiles } = discoverPaths({ APPDATA: appData }, home, 'win32');
    expect(codexFiles).toHaveLength(1);
    expect(codexFiles[0]).toBe(path.join(appData, 'Codex', 'sessions', '2026', '07', '13', 'rollout-roaming.jsonl'));
  });

  it('falls back to ~/.codex when no AppData paths exist', () => {
    touch(path.join(home, '.codex', 'sessions', '2026', '07', '13', 'rollout-legacy.jsonl'));

    const { codexFiles } = discoverPaths({}, home, 'win32');
    expect(codexFiles).toHaveLength(1);
    expect(codexFiles[0]).toBe(path.join(home, '.codex', 'sessions', '2026', '07', '13', 'rollout-legacy.jsonl'));
  });

  it('honors CODEX_HOME above all Windows AppData candidates', () => {
    const localAppData = path.join(home, 'AppData', 'Local');
    const customHome = path.join(home, 'custom-codex');
    touch(path.join(localAppData, 'Codex', 'sessions', '2026', '07', '13', 'rollout-local.jsonl'));
    touch(path.join(customHome, 'sessions', '2026', '07', '13', 'rollout-custom.jsonl'));

    const { codexFiles } = discoverPaths({ CODEX_HOME: customHome, LOCALAPPDATA: localAppData }, home, 'win32');
    expect(codexFiles).toHaveLength(1);
    expect(codexFiles[0]).toBe(path.join(customHome, 'sessions', '2026', '07', '13', 'rollout-custom.jsonl'));
  });
});
