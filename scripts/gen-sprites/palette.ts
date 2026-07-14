// Shared warm-toned palette for all beaver sprites (assets/STYLE.md pins
// this). One char in a pixel-map string = one key here; '.' is always
// transparent and never appears in this table. Kept to only the colors
// actually used — extend when a later stage needs a new tone, don't
// pre-allocate unused slots.
//
// Cap is 16 colors (design-gate rule); we're at 16.

export type PaletteChar = keyof typeof PALETTE;

export const PALETTE = {
  k: [0x2b, 0x17, 0x14], // outline — dark chocolate
  '1': [0x57, 0x29, 0x20], // deepest fur shadow
  '2': [0x7a, 0x3b, 0x27], // dark warm-brown fur
  '3': [0xa6, 0x54, 0x2e], // warm-brown fur midtone
  '4': [0xca, 0x70, 0x36], // golden-brown fur
  '5': [0xe9, 0x95, 0x45], // honey fur highlight
  b: [0xd1, 0x9a, 0x62], // tan belly shadow
  c: [0xf0, 0xc7, 0x85], // cream belly and muzzle
  w: [0xff, 0xf4, 0xdc], // teeth and eye shine
  e: [0xd9, 0x7b, 0x73], // pink inner ear
  t: [0x45, 0x25, 0x1f], // dark paddle tail
  T: [0x71, 0x40, 0x35], // tail texture highlight
  B: [0x0b, 0x68, 0x96], // pacifier dark blue
  C: [0x20, 0xa9, 0xd8], // pacifier blue
  D: [0x7a, 0xdc, 0xf5], // pacifier shine
  q: [0x12, 0x0d, 0x0d], // black eye and nose
} as const satisfies Record<string, readonly [number, number, number]>;

export const TRANSPARENT = '.';

export interface PaletteTable {
  /** char -> PNG palette index (index 0 is always the transparent slot). */
  readonly indexOf: Readonly<Record<string, number>>;
  /** PNG PLTE entries, index-aligned; index 0 is a transparent placeholder. */
  readonly colors: readonly (readonly [number, number, number])[];
}

/**
 * Palette + PNG index table, index 0 reserved for transparency. `extra`
 * lets callers (e.g. the contact sheet) append more colors — like a
 * checkerboard background — under their own char keys without touching the
 * sprite palette itself.
 */
export function buildPaletteTable(extra: Record<string, readonly [number, number, number]> = {}): PaletteTable {
  const indexOf: Record<string, number> = {};
  const colors: (readonly [number, number, number])[] = [[0, 0, 0]];
  for (const [ch, rgb] of [...Object.entries(PALETTE), ...Object.entries(extra)]) {
    indexOf[ch] = colors.length;
    colors.push(rgb);
  }
  return { indexOf, colors };
}
