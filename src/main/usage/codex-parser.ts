// Defensive per-line JSONL parse of a single Codex rollout file. Codex logs
// cumulative `total_token_usage` per `token_count` event, so per-turn usage
// requires taking deltas between consecutive events within the file (a
// rollout file == one session). Same defensive-by-default rules as the
// Claude parser: bounded reads, try/catch per line, missing fields -> 0.
//
// `input_tokens` is the FULL input for that snapshot and `cached_input_tokens`
// is a subset of it (cache-served, not additional) — split fresh-input from
// cache-read the same way ccusage does, so `inputTokens + cacheReadTokens`
// reconstructs the raw total rather than double-counting the cached portion.

import fs from 'node:fs';
import { MAX_LINE_BYTES } from './config.ts';
import type { UsageEntry } from './totals.ts';

interface RawCodexLine {
  readonly timestamp?: string;
  readonly type?: string;
  readonly payload?: {
    readonly type?: string;
    readonly info?: {
      readonly total_token_usage?: {
        readonly input_tokens?: number;
        readonly cached_input_tokens?: number;
        readonly output_tokens?: number;
      };
    };
  };
}

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

// Cumulative counters can drop below the previous reading on a session
// restart/replay — treat the drop as a new baseline (count the current
// cumulative value in full) instead of emitting a negative delta.
function delta(current: number, previous: number): number {
  return current < previous ? current : current - previous;
}

export function parseCodexFile(filePath: string): UsageEntry[] {
  let raw: string;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch {
    return [];
  }

  const entries: UsageEntry[] = [];
  let prevInput = 0;
  let prevCached = 0;
  let prevOutput = 0;

  for (const line of raw.split('\n')) {
    if (line.length === 0) continue;
    if (Buffer.byteLength(line, 'utf8') > MAX_LINE_BYTES) continue;

    let parsed: RawCodexLine;
    try {
      parsed = JSON.parse(line) as RawCodexLine;
    } catch {
      continue;
    }

    if (parsed.type !== 'event_msg' || parsed.payload?.type !== 'token_count') continue;
    const usage = parsed.payload.info?.total_token_usage;
    if (!usage) continue;

    const timestampMs = parsed.timestamp ? Date.parse(parsed.timestamp) : NaN;
    if (!Number.isFinite(timestampMs)) continue;

    const curInput = toNumber(usage.input_tokens);
    const curCached = toNumber(usage.cached_input_tokens);
    const curOutput = toNumber(usage.output_tokens);

    const deltaInput = delta(curInput, prevInput);
    const deltaCached = delta(curCached, prevCached);
    const deltaOutput = delta(curOutput, prevOutput);

    prevInput = curInput;
    prevCached = curCached;
    prevOutput = curOutput;

    // deltaInput includes deltaCached (cached is a subset of input) — keep
    // them as separate, non-overlapping totals fields.
    const freshInput = Math.max(0, deltaInput - deltaCached);

    if (freshInput === 0 && deltaCached === 0 && deltaOutput === 0) continue;

    entries.push({
      timestampMs,
      inputTokens: freshInput,
      outputTokens: deltaOutput,
      cacheCreationTokens: 0,
      cacheReadTokens: deltaCached,
    });
  }

  return entries;
}
