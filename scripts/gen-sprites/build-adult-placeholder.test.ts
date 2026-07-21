import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { decodePng } from './ingest-images.mjs';
import { buildAdultPlaceholder } from './build-adult-placeholder.ts';

// The committed teen sheet is the only input — like build-icons.test.ts
// there is no gitignored assets-src/ dependency, so this suite runs on
// every checkout (a fresh clone can always regenerate the placeholder).

const ADULT_SHEET_URL = new URL('../../assets/sprites/beaver-adult.png', import.meta.url);
const ADULT_META_URL = new URL('../../assets/sprites/beaver-adult.json', import.meta.url);
const TEEN_SHEET_URL = new URL('../../assets/sprites/beaver-teen.png', import.meta.url);
const TEEN_META_URL = new URL('../../assets/sprites/beaver-teen.json', import.meta.url);

describe('buildAdultPlaceholder', () => {
  it('is deterministic: two runs produce byte-identical output', () => {
    const a = buildAdultPlaceholder();
    const b = buildAdultPlaceholder();
    expect(a.png.equals(b.png)).toBe(true);
    expect(a.meta).toEqual(b.meta);
  });

  // Guards against stale or hand-edited committed idle/walk art. The committed
  // adult sheet is the placeholder's idle/walk block with a `type` row appended
  // by ingest-typing.mjs (which needs the gitignored green source, so it can't
  // be regenerated here); the placeholder block sits at the sheet's top-left,
  // so we byte-check that region. Fails => run `npm run assets:adult` and commit.
  it('committed beaver-adult idle/walk block matches the placeholder generator byte-for-byte', () => {
    const { png, meta } = buildAdultPlaceholder();
    const placeholder = decodePng(png);
    const committed = decodePng(fs.readFileSync(ADULT_SHEET_URL));

    // Extract the top-left placeholder-sized region out of the (wider) committed
    // sheet and compare it byte-for-byte to the placeholder's pixels.
    const region = Buffer.alloc(placeholder.width * placeholder.height * 4);
    for (let y = 0; y < placeholder.height; y += 1) {
      const srcStart = y * committed.width * 4;
      region.set(committed.data.subarray(srcStart, srcStart + placeholder.width * 4), y * placeholder.width * 4);
    }
    const placeholderBytes = Buffer.from(placeholder.data.buffer, placeholder.data.byteOffset, placeholder.data.length);
    expect(region.equals(placeholderBytes)).toBe(true);

    const committedMeta = JSON.parse(fs.readFileSync(ADULT_META_URL, 'utf8'));
    expect(committedMeta.tile).toBe(meta.tile);
    expect(committedMeta.fps).toBe(meta.fps);
    // idle + walk rows are inherited verbatim; `type` is appended.
    expect(committedMeta.rows.slice(0, 2)).toEqual(meta.rows);
    expect(committedMeta.rows[2]).toEqual({ name: 'type', frames: 8 });
  });

  it('sheet dimensions match the meta; tile/fps/rows are inherited from the teen sheet', () => {
    const { png, meta } = buildAdultPlaceholder();
    const teenMeta = JSON.parse(fs.readFileSync(TEEN_META_URL, 'utf8')) as typeof meta;

    const decoded = decodePng(png);
    expect(decoded.width).toBe(meta.sheetWidth);
    expect(decoded.height).toBe(meta.sheetHeight);
    expect(meta.sheetHeight).toBe(meta.rows.length * meta.tile);
    const maxFrames = Math.max(...meta.rows.map((row) => row.frames));
    expect(meta.sheetWidth).toBe(maxFrames * meta.tile);

    expect(meta.tile).toBe(teenMeta.tile);
    expect(meta.fps).toBe(teenMeta.fps);
    expect(meta.rows).toEqual(teenMeta.rows);
  });

  it('every frame fills the tile vertically: content touches the top and bottom rows', () => {
    const { png, meta } = buildAdultPlaceholder();
    const decoded = decodePng(png);
    const { tile } = meta;

    meta.rows.forEach((row, rowIndex) => {
      for (let frame = 0; frame < row.frames; frame += 1) {
        const originX = frame * tile;
        const originY = rowIndex * tile;
        let opaqueCount = 0;
        let topRowOpaque = false;
        let bottomRowOpaque = false;
        for (let y = 0; y < tile; y += 1) {
          for (let x = 0; x < tile; x += 1) {
            const alpha = decoded.data[((originY + y) * decoded.width + originX + x) * 4 + 3];
            if (alpha > 0) {
              opaqueCount += 1;
              if (y === 0) topRowOpaque = true;
              if (y === tile - 1) bottomRowOpaque = true;
            }
          }
        }
        expect(opaqueCount, `adult.${row.name}[${frame}] is empty`).toBeGreaterThan(0);
        // The defining placeholder property: content is upscaled to the
        // full tile height (teen content tops out at 92px), so every frame
        // spans the tile from its top pixel row to its bottom one.
        expect(topRowOpaque, `adult.${row.name}[${frame}]: content does not reach the tile top`).toBe(true);
        expect(bottomRowOpaque, `adult.${row.name}[${frame}]: content does not reach the tile bottom`).toBe(true);
      }
    });
  });

  // Placeholder guard: the adult sheet must stay distinct from its teen
  // source. If this fails, someone "fixed" the placeholder by copying the
  // teen sheet over it (or the generator lost its upscale) — either way the
  // stage would stop reading as larger on screen.
  it('placeholder guard: the adult sheet differs from the teen sheet', () => {
    const { png } = buildAdultPlaceholder();
    expect(png.equals(fs.readFileSync(TEEN_SHEET_URL))).toBe(false);
  });
});
