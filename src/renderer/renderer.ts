// Renderer entry point, loaded as a native ES module (no bundler — ADR 001
// §Animation/roaming). Two clocks: a single rAF loop advances movement
// (roam.tick, real elapsed dt) and, inside the same callback, a dt
// accumulator advances the sprite-frame index at the fixed SPRITE_FPS
// cadence — the two are driven by separate math so render Hz and sprite fps
// are never conflated (CLAUDE.md "Overlay etiquette"). Draws only when
// something actually changed (dirty flag) and fully skips work while the
// document is hidden.

import { createRoamState, tick, type RoamState, type Bounds } from './roam.js';
import { MAX_DT_S, SPRITE_FPS } from './pet-config.js';
import { loadSheet, drawFrame, type Sheet, type Stage } from './sprites.js';

declare global {
  interface Window {
    beaverBuddy: {
      onPausedChanged(callback: (paused: boolean) => void): void;
    };
  }
}

const canvasEl = document.getElementById('stage');
if (!(canvasEl instanceof HTMLCanvasElement)) {
  throw new Error('missing #stage canvas element');
}
const canvas: HTMLCanvasElement = canvasEl;

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const context = canvas.getContext('2d');
if (!context) {
  throw new Error('2d canvas context unavailable');
}
const ctx: CanvasRenderingContext2D = context;
ctx.imageSmoothingEnabled = false;

function bounds(): Bounds {
  return { width: canvas.width, height: canvas.height };
}

let paused = false;
let stage: Stage = 'baby';
let sheet: Sheet | null = null;
let roamState: RoamState = createRoamState(bounds(), Math.random);
let frameIndex = 0;
let frameAccumulatorS = 0;
let reactUntilMs: number | null = null;
let lastTimestampMs: number | null = null;
let needsDraw = true;

function loadCurrentSheet(): void {
  loadSheet(stage)
    .then((loaded) => {
      sheet = loaded;
      needsDraw = true;
    })
    .catch((error: unknown) => console.error('Failed to load sprite sheet:', error));
}

// Exported for later items (BL-6 evolution): switches the active sprite
// sheet. Not wired to any UI yet — this is this module's API surface.
export function setStage(next: Stage): void {
  if (next === stage) {
    return;
  }
  stage = next;
  loadCurrentSheet();
}

// Exported for later items (BL-6/BL-8): one-shot react animation overlay,
// not part of the random roam rotation. Overlays the drawn anim only —
// movement keeps roaming underneath.
export function celebrate(): void {
  if (!sheet) {
    return;
  }
  const reactRow = sheet.meta.rows.find((row) => row.name === 'react');
  const frames = reactRow ? reactRow.frames : 0;
  const durationMs = (frames / sheet.meta.fps) * 1000;
  reactUntilMs = performance.now() + durationMs;
  needsDraw = true;
}

window.beaverBuddy.onPausedChanged((nextPaused) => {
  paused = nextPaused;
  needsDraw = true;
});

function draw(): void {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!sheet) {
    return;
  }
  const anim = reactUntilMs !== null ? 'react' : roamState.anim;
  drawFrame(ctx, sheet, anim, frameIndex, roamState.x, roamState.y, {
    mirror: roamState.facing === 'left',
    rotationDeg: roamState.rotation,
  });
}

function frame(timestampMs: number): void {
  requestAnimationFrame(frame);

  if (document.hidden) {
    // Fully skip: no movement, no frame advance, no draw. Reset the clock
    // baseline so the next visible frame doesn't see a huge stale dt.
    lastTimestampMs = null;
    return;
  }

  if (lastTimestampMs === null) {
    lastTimestampMs = timestampMs;
  }
  const dtSeconds = Math.min((timestampMs - lastTimestampMs) / 1000, MAX_DT_S);
  lastTimestampMs = timestampMs;

  const prev = roamState;
  roamState = tick(roamState, dtSeconds, bounds(), paused, Math.random);
  const moved =
    roamState.x !== prev.x ||
    roamState.y !== prev.y ||
    roamState.anim !== prev.anim ||
    roamState.rotation !== prev.rotation ||
    roamState.facing !== prev.facing;

  let frameAdvanced = false;
  if (!roamState.frameHold) {
    frameAccumulatorS += dtSeconds;
    const frameIntervalS = 1 / SPRITE_FPS;
    while (frameAccumulatorS >= frameIntervalS) {
      frameAccumulatorS -= frameIntervalS;
      frameIndex += 1;
      frameAdvanced = true;
    }
  }

  if (reactUntilMs !== null && timestampMs >= reactUntilMs) {
    reactUntilMs = null;
    frameAdvanced = true;
  }

  if (moved || frameAdvanced || needsDraw) {
    draw();
    needsDraw = false;
  }
}

loadCurrentSheet();
requestAnimationFrame(frame);
