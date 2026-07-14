import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { parseCodexFile } from './codex-parser';

// Synthetic fixtures only, written to a fresh temp dir per test (CLAUDE.md:
// never the operator's real ~/.codex). Fake token counts only.

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bb-codex-parser-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function writeFixture(name: string, lines: readonly string[]): string {
  const filePath = path.join(tmpDir, name);
  fs.writeFileSync(filePath, `${lines.join('\n')}\n`);
  return filePath;
}

function tokenCountLine(timestamp: string, inputTokens: number, outputTokens: number, cachedInputTokens = 0): string {
  return JSON.stringify({
    timestamp,
    type: 'event_msg',
    payload: {
      type: 'token_count',
      info: { total_token_usage: { input_tokens: inputTokens, cached_input_tokens: cachedInputTokens, output_tokens: outputTokens } },
    },
  });
}

describe('parseCodexFile', () => {
  it('takes deltas between consecutive cumulative snapshots', () => {
    const file = writeFixture('rollout-1.jsonl', [
      tokenCountLine('2026-07-13T09:00:00.000Z', 100, 20),
      tokenCountLine('2026-07-13T09:05:00.000Z', 250, 60),
    ]);

    const entries = parseCodexFile(file);
    expect(entries).toEqual([
      { timestampMs: Date.parse('2026-07-13T09:00:00.000Z'), inputTokens: 100, outputTokens: 20, cacheCreationTokens: 0, cacheReadTokens: 0 },
      { timestampMs: Date.parse('2026-07-13T09:05:00.000Z'), inputTokens: 150, outputTokens: 40, cacheCreationTokens: 0, cacheReadTokens: 0 },
    ]);
  });

  it('sums deltas across multiple sessions independently (fresh baseline per file)', () => {
    const fileA = writeFixture('rollout-a.jsonl', [tokenCountLine('2026-07-13T09:00:00.000Z', 100, 20)]);
    const fileB = writeFixture('rollout-b.jsonl', [tokenCountLine('2026-07-13T10:00:00.000Z', 40, 10)]);

    expect(parseCodexFile(fileA)[0]).toMatchObject({ inputTokens: 100, outputTokens: 20 });
    expect(parseCodexFile(fileB)[0]).toMatchObject({ inputTokens: 40, outputTokens: 10 });
  });

  it('treats a drop in cumulative totals as a new baseline, never a negative delta', () => {
    const file = writeFixture('rollout-restart.jsonl', [
      tokenCountLine('2026-07-13T09:00:00.000Z', 500, 200),
      tokenCountLine('2026-07-13T09:10:00.000Z', 30, 10), // session restarted/replayed
    ]);

    const entries = parseCodexFile(file);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ inputTokens: 500, outputTokens: 200 });
    expect(entries[1]).toMatchObject({ inputTokens: 30, outputTokens: 10 });
    for (const e of entries) {
      expect(e.inputTokens).toBeGreaterThanOrEqual(0);
      expect(e.outputTokens).toBeGreaterThanOrEqual(0);
    }
  });

  it('ignores non-token_count event lines', () => {
    const file = writeFixture('rollout-mixed.jsonl', [
      JSON.stringify({ timestamp: '2026-07-13T09:00:00.000Z', type: 'event_msg', payload: { type: 'agent_message' } }),
      tokenCountLine('2026-07-13T09:01:00.000Z', 10, 5),
    ]);
    expect(parseCodexFile(file)).toHaveLength(1);
  });

  it('skips malformed JSON lines without throwing', () => {
    const file = writeFixture('rollout-bad.jsonl', ['{broken', tokenCountLine('2026-07-13T09:00:00.000Z', 10, 5)]);
    expect(parseCodexFile(file)).toHaveLength(1);
  });

  it('returns an empty array for a missing file', () => {
    expect(parseCodexFile(path.join(tmpDir, 'missing.jsonl'))).toEqual([]);
  });

  it('splits cached_input_tokens out of input_tokens (cached is a subset, not additive)', () => {
    const file = writeFixture('rollout-cached.jsonl', [tokenCountLine('2026-07-13T09:00:00.000Z', 1000, 300, 700)]);
    const entries = parseCodexFile(file);
    expect(entries).toHaveLength(1);
    // fresh input = 1000 - 700 cached; cacheReadTokens carries the cached portion.
    expect(entries[0]).toMatchObject({ inputTokens: 300, cacheReadTokens: 700, outputTokens: 300 });
  });
});
