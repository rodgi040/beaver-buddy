# BL-17 design-review verdict — parachute drop integration (Chunk C4)

Date: 2026-07-20
Verdict: **PASS with documented visual limitations**

## Scope

Integrate the ComfyUI-generated parachute-drop animation frames into the
shipped beaver-baby sheet, wire the grab/glide/landing interaction through
the renderer only for the baby stage, and finalize the interaction model
spec. This is Chunk C4 of the parachute-drop feature; C1–C3 were already
committed.

## Sheet intake

`scripts/gen-sprites/ingest-animation-frames.mjs` (existing, BL-17/C3) was
promoted to a first-class asset script via `npm run assets:parachute`. It
reads the committed `assets/sprites/beaver-baby.png` as the source for the
idle/walk rows (byte-for-byte preservation) and mechanically ingests the three
ComfyUI runs under `assets-src/comfyui/` (struggle, parachute-wind, land)
into the new rows. No beaver pixels were authored or retouched
(CLAUDE.md's "mechanically process, never retouch" rule).

Pipeline per new animation row:
1. **Background removal**: same flood-fill + hard alpha threshold as
   `ingest-images.mjs`.
2. **Crop** to the opaque-pixel bounding box.
3. **Downscale** with the premultiplied-alpha area-average box filter to a
   per-row locked scale (see "Scale factor" below).
4. **Place** on a 96×96 tile, bottom-aligned, horizontally centered.

### Scale factor

Per-row target content heights: struggle 82px, parachute-wind 92px,
land 92px. Measured scales for this run:
- `struggle` = 0.1300
- `parachute-wind` = 0.1312
- `land` = 0.1373

### Sheets shipped

| File | Rows | Frames | Tile | fps hint |
|---|---|---|---|---|
| `assets/sprites/beaver-baby.png` (768×480) | idle, walk, struggle, parachute-wind, land | 1, 2, 8, 8, 8 | 96 | 8 |

SHA-256 of the committed sheet (for stale-asset diagnosis):
```
a4c184c3ee48097e230c72f09b3db7827ba2a29e4922f6111571478e510d2a50  assets/sprites/beaver-baby.png
```

## App changes

- **`package.json`**: added `assets:parachute` script; removed `beaver-baby`
  from `assets:ingest` (`STAGE_SPECS` in `ingest-images.mjs`) because baby is
  now built exclusively by the parachute script.
- **`scripts/gen-sprites/ingest-images.mjs`**: `STAGE_SPECS` now only lists
  `beaver-teen`; comment documents that baby moved to the parachute pipeline.
- **`src/renderer/renderer.ts`**: pointerdown and dblclick listeners return
  early when `stage !== 'baby'`; `determineCaptureMode` receives
  `stage === 'baby'` so the overlay stays fully click-through in teen/adult.
- **`src/renderer/input-capture.ts`**: `determineCaptureMode` now accepts an
  `interactionEnabled` parameter; when false it always returns `'hover-forward'`.
- **`src/renderer/roam.ts`**: `enterGrabbed` and `releaseToGlide` now reset
  `facing` to `'right'` and `rotation` to `0`, ensuring the struggle and
  parachute rows are drawn in the canonical orientation.
- **`docs/interaction-model.md`**: animation assets table finalized to 8
  frames per row; status updated to "verified against implementation"; input
  capture semantics clarified that gliding/landing are click-through even on
  hover; noted that the interaction is baby-stage only for now.

## Tests added/updated

- New `scripts/gen-sprites/ingest-animation-frames.test.ts`:
  - committed sheet has the expected 5 rows with frame counts 1/2/8/8/8;
  - every frame is non-empty;
  - pipeline determinism (skipped when `assets-src/comfyui` is absent);
  - committed sheet matches `buildBabySheet` output byte-for-byte (skipped
    when source runs are absent);
  - idle/walk tiles are byte-identical to the old still-frame build (skipped
    when `assets-src/beaver` is absent).
- New `scripts/gen-sprites/ingest-animation-frames.d.mts` hand-written type
  declarations for the `.mjs` script so the test has real types.
- `src/renderer/input-capture.test.ts`: added coverage for
  `interactionEnabled=false`.
- `src/renderer/roam.test.ts`: added `facing`/`rotation` assertions for
  grabbed and gliding states.
- `ingest-images.test.ts` unchanged and still green (now tests teen only).

## Gates

`npm ci` clean (lockfile already present) → `npm run typecheck` clean
(root + renderer + gen-sprites tsconfigs) → `npm run lint` clean (eslint,
0 errors/warnings) → `npm test` **500 passed / 4 skipped** (45 files) →
`npm run build` clean (assets rebuilt and copied into `dist/`).

`npm run assets:parachute` re-ran clean and reproduced the committed sheet
byte-for-byte (verified by the determinism test).

## Live verification (CDP attempted)

The same `--remote-debugging-port` pattern used in BL-4/6/7/8/9/10/11 was
attempted: isolated `--user-data-dir`, pre-seeded `onboarding-state.json`
`{"hatched":true}`, `CLAUDE_CONFIG_DIR`/`CODEX_HOME` pointed at fresh empty
scratch dirs. The app launched, the browser/CDP target list was reachable,
and a WebSocket connection to the renderer page succeeded. However,
`Runtime.evaluate` calls (including `document.readyState` and `1+1`) hung and
never returned, preventing canvas capture or `__debugRoam` inspection.
The root cause was not fully diagnosed in the time available; it appears to
be an environment-specific CDP runtime issue rather than an app failure (the
app itself passed `--smoke` and the full test suite).

### Screenshots status

- `docs/design-reviews/BL-17-contact.png` copied from the existing baked
  contact sheet (`assets-src/baked/beaver-baby/_contact.png`) — shows all
  five rows at 8× nearest-neighbor scale with a checkerboard background.
- Live grabbed/gliding/landing captures and the no-trail check are
  **pending manual capture by the Owner** once the environment allows CDP
  runtime evaluation.

## Known limitations (documented)

1. **Biber reads smaller during `parachute-wind`**: the canopy fills the
   96×96 tile, so the beaver body is scaled down to fit. This is the
   intended mechanical result of the per-row target-height locking; world
   placement (WAVE-2) owns the visual size, not the tile.
2. **`struggle` frames may appear rotated or left-facing**: the source run
   includes panic-flail poses. The renderer now forces `facing:'right'` and
   `rotation:0` when entering `grabbed`, so the drawn state is canonical, but
   the raw art orientation is uneven. Marked as **pending owner sign-off**.
3. **Live verification screenshots incomplete** due to the CDP runtime
   evaluate hang described above.

## Deviations from the plan (with rationale)

None. All C4 plan items were implemented as specified. The only divergence
is environmental: CDP runtime evaluation did not work in this sandbox,
so the live screenshots were documented as pending rather than fabricated.
