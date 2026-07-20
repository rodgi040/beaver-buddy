// Hand-written type declarations for ingest-animation-frames.mjs (plain
// JS, no TS syntax allowed — see that file's header) so its test gets real
// types instead of implicit any.

import type { SheetMeta } from './ingest-images.mjs';

export interface BabySheetResult {
  readonly png: Buffer;
  readonly meta: SheetMeta;
  readonly scales: Readonly<Record<string, number>>;
}

export function buildBabySheet(repoRoot: string): BabySheetResult;
