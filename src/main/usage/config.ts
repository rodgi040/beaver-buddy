// Tuning constants for usage-log parsing (PRD R7). Kept in one small domain
// config module per CLAUDE.md's "no magic numbers in logic" rule.

// Defensive bound on a single JSONL line. Real Claude Code / Codex log lines
// are normally well under this; an oversized line is either corrupt or a
// pathological edge case, and is skipped rather than risking a huge
// JSON.parse on untrusted-by-default log content.
export const MAX_LINE_BYTES = 1_000_000;

// How often the tracker re-scans usage-log files for changes.
export const USAGE_REFRESH_MS = 60_000;
