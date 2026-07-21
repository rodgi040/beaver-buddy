// Bakes the "typing on a laptop" animation row into the beaver-adult sheet.
//
// Source: one Comfy Cloud run (prompt_id b99d59bf) — the beaver alone, holding
// a small laptop, typing, on a solid #00FF00 chroma-key background. The model
// (Gemini Nano Banana) emits an irregular 6x4 grid of near-identical frames;
// we hand-pick 8 clean typing frames (all holding the laptop, both eyes open,
// calm face) from the top two rows. Raw sheet stays local in the gitignored
// assets-src/comfyui/adult-type/sheet.png (asset rule: only baked art ships).
//
// Same mechanical discipline as the other sprite ingests (never retouch a
// pixel): chroma-key the green out, crop to content, area-average downscale to
// one locked scale, composite bottom-aligned + centered onto a 96px tile. The
// idle + walk tiles are copied byte-for-byte out of the existing adult sheet so
// the shipped stills are untouched; only the `type` row is appended.
//
// PROVISIONAL: the adult sheet is still the teen-derived placeholder
// (build-adult-placeholder.ts; flight-plan #7 owns final adult art). This row
// rides on that placeholder and is expected to be regenerated against the final
// adult beaver — the committed record is this script + prompt recipe.
//
// CLI: `node scripts/gen-sprites/ingest-typing.mjs` (Node 24 type-stripping).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  TILE,
  FPS,
  decodePng,
  cropToBbox,
  resizeAreaAverage,
  placeOnTile,
  computeStageScale,
} from './ingest-images.mjs';
import { encodeRgbaPng } from './png.ts';
import { buildAdultPlaceholder } from './build-adult-placeholder.ts';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC_SHEET = path.join(repoRoot, 'assets-src', 'comfyui', 'adult-type', 'sheet.png');
const ADULT_PNG = path.join(repoRoot, 'assets', 'sprites', 'beaver-adult.png');
const ADULT_JSON = path.join(repoRoot, 'assets', 'sprites', 'beaver-adult.json');

// The generated grid is 6 columns x 4 rows. The 8 loop frames are the top two
// rows in reading order — the most uniform poses (laptop held, typing, eyes
// open). [col, row] in the source grid.
const GRID_COLS = 6;
const GRID_ROWS = 4;
const FRAMES = [
  [0, 0], [1, 0], [2, 0], [3, 0],
  [4, 0], [5, 0], [0, 1], [1, 1],
];

// Sitting-and-typing is a wide pose; give it the same content height budget as
// the other adult frames. computeStageScale's width term keeps the laptop from
// spilling past the tile.
const TARGET_CONTENT_HEIGHT_PX = 84;

// A pixel belongs to the green screen if green clearly dominates red and blue.
// The beaver (browns/tans), its laptop (blue-grey) and eyes (white/black) have
// no green-dominant pixels, so this keys the background — including the
// anti-aliased fringe — without eating character detail. De-spill isn't needed:
// the area-average downscale blends the few remaining semi-green edge pixels.
function chromaKeyGreen(img) {
  const { width, height, data } = img;
  const out = new Uint8ClampedArray(data.length);
  out.set(data);
  for (let i = 0; i < out.length; i += 4) {
    const r = out[i];
    const g = out[i + 1];
    const b = out[i + 2];
    if (g > 90 && g > r * 1.3 && g > b * 1.3) {
      out[i + 3] = 0;
    }
  }
  return { width, height, data: out };
}

// Slice cell [col,row] out of the grid. Boundaries are rounded so adjacent
// cells tile the full sheet exactly even though the cell size isn't integral.
function extractCell(sheet, col, row) {
  const x0 = Math.round((col * sheet.width) / GRID_COLS);
  const x1 = Math.round(((col + 1) * sheet.width) / GRID_COLS);
  const y0 = Math.round((row * sheet.height) / GRID_ROWS);
  const y1 = Math.round(((row + 1) * sheet.height) / GRID_ROWS);
  const w = x1 - x0;
  const h = y1 - y0;
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y += 1) {
    const srcStart = ((y0 + y) * sheet.width + x0) * 4;
    out.set(sheet.data.subarray(srcStart, srcStart + w * 4), y * w * 4);
  }
  return { width: w, height: h, data: out };
}

// Pull one existing TILE tile (col,row) out of the current adult sheet so idle
// and walk survive untouched.
function extractTile(sheet, col, row) {
  const out = new Uint8ClampedArray(TILE * TILE * 4);
  for (let y = 0; y < TILE; y += 1) {
    const srcStart = ((row * TILE + y) * sheet.width + col * TILE) * 4;
    out.set(sheet.data.subarray(srcStart, srcStart + TILE * 4), y * TILE * 4);
  }
  return { width: TILE, height: TILE, data: out };
}

function blit(dst, dstW, tile, col, row) {
  for (let y = 0; y < TILE; y += 1) {
    const dstStart = ((row * TILE + y) * dstW + col * TILE) * 4;
    dst.set(tile.data.subarray(y * TILE * 4, (y + 1) * TILE * 4), dstStart);
  }
}

export function buildAdultTypeSheet() {
  const src = decodePng(fs.readFileSync(SRC_SHEET));
  const cropped = FRAMES.map(([c, r]) => cropToBbox(chromaKeyGreen(extractCell(src, c, r))));
  const scale = computeStageScale(cropped, TILE, TARGET_CONTENT_HEIGHT_PX);
  const typeTiles = cropped.map((img) => {
    const destW = Math.max(1, Math.round(img.width * scale));
    const destH = Math.max(1, Math.round(img.height * scale));
    return placeOnTile(resizeAreaAverage(img, destW, destH), TILE);
  });

  // idle + walk come from the placeholder generator itself (not the committed
  // png), so this stays a pure function of the teen sheet + green source and
  // doesn't depend on the current on-disk adult sheet.
  const adult = decodePng(buildAdultPlaceholder().png);
  const idle = extractTile(adult, 0, 0);
  const walk0 = extractTile(adult, 0, 1);
  const walk1 = extractTile(adult, 1, 1);

  // Sheet grows to hold the 8-frame type row: 8 cols wide, 3 rows tall.
  const cols = FRAMES.length;
  const rows = 3;
  const width = cols * TILE;
  const height = rows * TILE;
  const data = new Uint8ClampedArray(width * height * 4);
  blit(data, width, idle, 0, 0);
  blit(data, width, walk0, 0, 1);
  blit(data, width, walk1, 1, 1);
  typeTiles.forEach((tile, i) => blit(data, width, tile, i, 2));

  const png = encodeRgbaPng({ width, height, data });
  const meta = {
    tile: TILE,
    fps: FPS,
    sheetWidth: width,
    sheetHeight: height,
    rows: [
      { name: 'idle', frames: 1 },
      { name: 'walk', frames: 2 },
      { name: 'type', frames: cols },
    ],
  };
  return { png, meta, scale };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { png, meta, scale } = buildAdultTypeSheet();
  fs.writeFileSync(ADULT_PNG, png);
  fs.writeFileSync(ADULT_JSON, `${JSON.stringify(meta, null, 2)}\n`);
  console.log(`baked beaver-adult type row (${meta.sheetWidth}x${meta.sheetHeight}, scale ${scale.toFixed(4)})`);
}
