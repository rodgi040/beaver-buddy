// Main-process-only tracker: refreshes on a coalesced timer, re-parses only
// files whose mtime changed since the last scan, and exposes a plain
// getTotals()/onChange() API for later items (BL-6/BL-8) to consume — no
// IPC/renderer wiring here (renderer never sees paths or log content).

import fs from 'node:fs';
import os from 'node:os';
import { discoverPaths, type PathEnv } from './paths.ts';
import { parseClaudeFile } from './claude-parser.ts';
import { parseCodexFile } from './codex-parser.ts';
import { aggregate, type UsageEntry, type UsageTotals } from './totals.ts';
import { USAGE_REFRESH_MS } from './config.ts';

interface FileCacheEntry {
  readonly mtimeMs: number;
  readonly entries: readonly UsageEntry[];
}

export class UsageTracker {
  private readonly env: PathEnv;
  private readonly home: string;
  private readonly fileCache = new Map<string, FileCacheEntry>();
  private readonly listeners = new Set<(totals: UsageTotals) => void>();
  private totals: UsageTotals = aggregate([]);
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(env: PathEnv = process.env, home: string = os.homedir()) {
    this.env = env;
    this.home = home;
  }

  getTotals(): UsageTotals {
    return this.totals;
  }

  // Returns an unsubscribe function.
  onChange(callback: (totals: UsageTotals) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  start(): void {
    this.refresh();
    if (this.timer) return;
    this.timer = setInterval(() => this.refresh(), USAGE_REFRESH_MS);
    // Never keep the process alive just to poll usage logs.
    this.timer.unref?.();
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  // Missing dirs/files produce empty discovery results, not errors, so this
  // never throws and never retries — a single scan per call is enough.
  refresh(): void {
    const { claudeFiles, codexFiles } = discoverPaths(this.env, this.home);
    const liveFiles = new Set<string>();
    const allEntries: UsageEntry[] = [];
    let changed = false;

    const processFile = (filePath: string, parse: (f: string) => UsageEntry[]): void => {
      liveFiles.add(filePath);

      let mtimeMs: number;
      try {
        mtimeMs = fs.statSync(filePath).mtimeMs;
      } catch {
        return; // vanished between discovery and stat; treat as absent this pass
      }

      const cached = this.fileCache.get(filePath);
      if (!cached || cached.mtimeMs !== mtimeMs) {
        const entries = parse(filePath);
        this.fileCache.set(filePath, { mtimeMs, entries });
        changed = true;
      }

      allEntries.push(...(this.fileCache.get(filePath)?.entries ?? []));
    };

    for (const filePath of claudeFiles) processFile(filePath, parseClaudeFile);
    for (const filePath of codexFiles) processFile(filePath, parseCodexFile);

    // Drop cache entries for files that no longer show up in discovery
    // (rotated/deleted logs) so they stop contributing to totals.
    for (const cachedPath of this.fileCache.keys()) {
      if (!liveFiles.has(cachedPath)) {
        this.fileCache.delete(cachedPath);
        changed = true;
      }
    }

    if (!changed) return;

    this.totals = aggregate(allEntries);
    for (const listener of this.listeners) listener(this.totals);
  }
}
