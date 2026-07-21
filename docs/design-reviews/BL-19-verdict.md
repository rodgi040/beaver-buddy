# BL-19 design-review verdict — "sit and type on a laptop" animation

Date: 2026-07-21
Verdict: **PASS with documented visual limitations**

## Scope

Add a low-probability "working" easter egg: while roaming, the beaver
occasionally stops, sits where it is, and frantically types on a small laptop
(the typing-cat meme) for a while, then resumes roaming. Two halves:

1. **State machine** (`src/renderer/roam.ts`) — a new stationary `working`
   phase / `type` anim, triggered from `decideNext` when an idle pause ends.
2. **Asset** — an 8-frame `type` row appended to the adult sprite sheet.

MVP per the owner handoff: no sit/open/close/stand transition frames — the
beaver snaps into the type loop and back to idle. Transition frames are later
polish.

## State machine

- `decideNext` rolls the work chance first (`WORK_PROBABILITY = 0.05`); on a
  win it enters `working` with `anim = 'type'`, leaving x/y untouched (it sits
  where it was idling — a stationary state) and a `pickWorkDuration()` timer
  (`WORK_DURATION_MIN_S..MAX_S` = 8–16s, the long "epic" loop).
- The `working` tick counts the timer down, then drops back to `idle`; normal
  walk/climb roaming resumes from there.
- `working` is included in `isRoamingPhase`, so the beaver can still be grabbed
  mid-type (a playful interruption) and click-window bookkeeping keeps ticking.
- Overlay invariants unaffected: it's a pure logical state change, no new
  window/level/click-through behavior; still bottom-aligned on the ground line.

Tuning lives in `src/renderer/pet-config.ts` (no magic numbers in `roam.ts`).
Covered by `src/renderer/roam.test.ts` (enters on a winning roll, stays put for
the whole loop then returns to idle, grabbable mid-type) plus the existing
anim-matches-phase sweep extended for `working → type`.

## Sheet intake

`scripts/gen-sprites/ingest-typing.mjs` (`npm run assets:typing`, or
`npm run assets:adult` for the full placeholder-then-type build). idle/walk
come from `buildAdultPlaceholder()` (byte-for-byte, teen-derived placeholder);
only the `type` row is generated. No beaver pixels authored or retouched.

Source: one Comfy Cloud run (Gemini Nano Banana, prompt_id `b99d59bf`) — the
beaver alone holding a small laptop, typing, on a solid `#00FF00` chroma-key
background. The model emits an irregular **6×4** grid of near-identical frames;
8 uniform typing frames from the top two rows (all holding the laptop, both
eyes open, calm face) are hand-picked. Raw sheet stays in the gitignored
`assets-src/comfyui/adult-type/`.

Pipeline per type frame:
1. **Slice** the cell out of the 6×4 grid (rounded boundaries tile exactly).
2. **Chroma-key** the green screen — a green-dominance test
   (`g > 90 && g > r*1.3 && g > b*1.3`), which keys the background and its
   anti-aliased fringe without touching the brown/tan/blue-grey character.
3. **Crop** to the opaque bbox.
4. **Downscale** with the premultiplied-alpha area-average box filter to one
   locked scale (0.2270; content ~84px tall, laptop kept inside the tile).
5. **Place** on a 96×96 tile, bottom-aligned, horizontally centered.

### Sheets shipped

| File | Rows | Frames | Tile | fps hint |
|---|---|---|---|---|
| `assets/sprites/beaver-adult.png` (768×288) | idle, walk, type | 1, 2, 8 | 96 | 8 |

SHA-256 of the committed sheet (for stale-asset diagnosis):
```
30312c04f0b964b69140022b87b3c2f864a03974dea85f837cc723332133d59f  assets/sprites/beaver-adult.png
```

## Contact sheet

`docs/design-reviews/BL-19-contact.png` — all three adult rows at 6×
nearest-neighbor on a clean light checkerboard. The type row is grounded (every
frame touches the tile bottom), the green screen is fully keyed (no fringe), and
the character reads consistently across all 8 frames with the laptop present.

## Verdict: PASS — known limitations

1. **Style pop (provisional).** The adult sheet is still the teen-derived
   placeholder; the generated type art (rounder Nano-Banana style) doesn't
   match the idle/walk stills. Both read clearly as "the beaver," but the pop is
   visible on the idle→type→idle transition. Expected to resolve when final
   adult art lands (flight-plan #7), at which point the type row is regenerated
   against it. Feet stay on the ground line, so there's no vertical jump.
2. **Gentle, not frantic.** The 8 frames vary only subtly frame-to-frame, so at
   8 fps the loop reads as calm typing rather than the frantic typing-cat meme.
   Acceptable for MVP; a "more frantic" pass (frames with larger paw travel, or
   transition frames) is follow-up.

Neither blocks the feature; both are logged for the flight-plan #7 / animation
polish items.

## Windows design gate

No Windows-specific rendering change (no new window, tray, icon, or HiDPI
behavior — a sprite row + logical state only), so this rides the existing adult
sheet's HiDPI/click-through handling. A live Windows overlay capture of the
working state is deferred to the #7 art pass, where the adult stage gets its
full visual gate.
