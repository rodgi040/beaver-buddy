import { describe, expect, it } from 'vitest';
import { encodeIndexedPng } from './png.ts';
import { buildSheet } from './sheet.ts';
import { buildContactSheet } from './contact-sheet.ts';
import { ANIMATIONS, ANIMATION_ORDER } from './pixel-maps/baby.ts';

const TILE = 32;
const FPS = 10;

describe('sprite generator', () => {
  it('is deterministic: two runs produce byte-identical PNGs', () => {
    const a = buildSheet(ANIMATIONS, ANIMATION_ORDER, TILE, FPS);
    const b = buildSheet(ANIMATIONS, ANIMATION_ORDER, TILE, FPS);
    expect(encodeIndexedPng(a.image).equals(encodeIndexedPng(b.image))).toBe(true);
    expect(a.meta).toEqual(b.meta);
  });

  it('every pixel is either the transparent index or a valid palette index', () => {
    const { image } = buildSheet(ANIMATIONS, ANIMATION_ORDER, TILE, FPS);
    const inRange = image.pixels.every((v) => v >= 0 && v < image.palette.length);
    expect(inRange).toBe(true);
    expect(image.transparentIndex).toBe(0);
  });

  it('sheet dimensions match the JSON metadata', () => {
    const { image, meta } = buildSheet(ANIMATIONS, ANIMATION_ORDER, TILE, FPS);
    expect(image.width).toBe(meta.sheetWidth);
    expect(image.height).toBe(meta.sheetHeight);
    expect(meta.sheetHeight).toBe(meta.rows.length * meta.tile);
    const maxFrames = Math.max(...meta.rows.map((r) => r.frames));
    expect(meta.sheetWidth).toBe(maxFrames * meta.tile);
    expect(meta.rows.map((r) => r.name)).toEqual([...ANIMATION_ORDER]);
    meta.rows.forEach((row, i) => {
      expect(row.frames).toBe(ANIMATIONS[ANIMATION_ORDER[i]].length);
    });
  });

  // The flat paddle tail is the beaver's signature silhouette — it must
  // never degrade into a ball or vanish in any frame: a horizontal run of
  // >=8 filled pixels starting at x<=6, and the far-tail zone (x<=7) no
  // taller than 5 rows.
  it('every frame keeps the flat tail-paddle silhouette', () => {
    for (const [name, frames] of Object.entries(ANIMATIONS)) {
      frames.forEach((frame, i) => {
        let hasRun = false;
        for (const row of frame) {
          let run = 0;
          let start = -1;
          for (let x = 0; x < row.length; x += 1) {
            if (row[x] !== '.') {
              if (run === 0) start = x;
              run += 1;
              if (run >= 8 && start <= 6) hasRun = true;
            } else {
              run = 0;
            }
          }
        }
        expect(hasRun, `${name}[${i}] lost the tail paddle`).toBe(true);

        const tailRows = frame
          .map((row, y) => ({ y, filled: [...row.slice(0, 8)].some((ch) => ch !== '.') }))
          .filter((r) => r.filled)
          .map((r) => r.y);
        const span = Math.max(...tailRows) - Math.min(...tailRows) + 1;
        expect(span, `${name}[${i}] tail zone too tall (${span} rows)`).toBeLessThanOrEqual(5);
      });
    }
  });

  it('rejects a frame with an off-palette character', () => {
    const bad = {
      ...ANIMATIONS,
      idle: [
        [...ANIMATIONS.idle[0]].map((row, i) => (i === 0 ? row.slice(0, -1) + 'Z' : row)),
        ANIMATIONS.idle[1],
      ],
    };
    expect(() => buildSheet(bad, ANIMATION_ORDER, TILE, FPS)).toThrow();
  });

  it('contact sheet renders at the expected nearest-neighbor scale', () => {
    const contact = buildContactSheet(ANIMATIONS, ANIMATION_ORDER, TILE, 8);
    expect(contact.width % 8).toBe(0);
    expect(contact.height % 8).toBe(0);
    const inRange = contact.pixels.every((v) => v < contact.palette.length);
    expect(inRange).toBe(true);
  });
});
