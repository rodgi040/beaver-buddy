// Dev-only CLI (like scripts/gen-sprites) — not part of the app runtime.
// Prints derived daily + lifetime token totals from the real machine's
// Claude Code / Codex usage logs. Used for the ccusage ±5% cross-check
// (PRD R7 acceptance) and future debugging. Run directly with Node's
// built-in TypeScript support: `node scripts/usage-cli.ts`.
//
// CLAUDE.md: derived counts only — this prints aggregate token numbers,
// never raw log content, prompts, or paths.

import { UsageTracker } from '../src/main/usage/tracker.ts';
import type { Totals } from '../src/main/usage/totals.ts';

function dailyToPlainObject(daily: ReadonlyMap<string, Totals>): Record<string, Totals> {
  const out: Record<string, Totals> = {};
  for (const [date, totals] of daily) out[date] = totals;
  return out;
}

const tracker = new UsageTracker();
tracker.refresh();
const totals = tracker.getTotals();

process.stdout.write(
  `${JSON.stringify({ daily: dailyToPlainObject(totals.daily), lifetime: totals.lifetime }, null, 2)}\n`,
);
