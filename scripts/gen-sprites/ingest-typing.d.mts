// Hand-written type declarations for ingest-typing.mjs (plain JS, no TS syntax
// allowed — see that file's header) so its test gets real types.

import type { SheetMeta } from './ingest-images.mjs';

export interface AdultTypeResult {
  readonly png: Buffer;
  readonly meta: SheetMeta;
  readonly scale: number;
}

export function buildAdultTypeSheet(): AdultTypeResult;
