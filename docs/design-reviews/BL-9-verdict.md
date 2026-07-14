# BL-9 design/security-review verdict — MRR growth mode

Date: 2026-07-14
Verdict: **gates pass, live security/behavior evidence collected below**.
One item is explicitly **not** verifiable autonomously (see bottom).

## Architecture summary

- `src/main/mrr/keychain.ts` — macOS Keychain via the `security` CLI
  (`execFile` with an argv array only, never a shell string). Upsert
  (`-U`), read (`-w`, stdout captured and returned, never printed), delete
  (idempotent on exit code 44 / item-not-found). Every failure path is
  redacted before logging (`redact.ts`) — a failed `security` invocation
  embeds its full command line, including any secret passed as an argv
  element, in `error.message`; redaction strips that before it reaches
  `console.error`.
- `src/main/mrr/https-allowlist.ts` — exact-`Set`-membership hostname
  check (`api.stripe.com`, `api.revenuecat.com`), HTTPS only. No
  suffix/prefix matching, so lookalikes are rejected by construction.
- `src/main/mrr/stripe.ts` / `revenuecat.ts` — MRR readers with a
  null-on-any-failure contract (network error, non-2xx, unexpected
  schema); never throw, never leak the key into a log message.
- `src/main/mrr/mrr-engine.ts` — daily, coalesced, unref'd poll. If mode
  is `mrr` and today's local date hasn't been awarded, fetches MRR from
  every connected source and awards `floor(mrr_dollars * 10)` through
  `XpEngine.awardMrr`. Any connected source failing (missing key, null
  MRR) aborts the whole poll — no partial/guessed award.
- `src/main/xp/engine.ts` / `store.ts` — extended with `lastMrrAwardDate`
  (schema migration: an old file without it loads as `null`) and a
  `setMode`/`awardMrr` pair. Token ingestion in `mrr` mode advances the
  cursor silently (no XP) so mode round-trips can never double- or
  retro-award.
- `src/main/mrr/settings-store.ts` / `settings-validate.ts` /
  `settings-window.ts` / `settings-preload.ts` / `settings.html` — a
  small hardened `BrowserWindow` (contextIsolation + sandbox +
  no-nodeIntegration, own preload, `hardening.ts` reused for
  navigation/window-open denial) with the app's first renderer → main
  IPC. Every handler re-validates the payload (closed field set, ≤200
  chars, printable-ASCII charset, mode enum) and the sender frame. Mode +
  connected-flags persist in `growth-settings.json`; key material never
  does — only Keychain does. `settings:read-status` returns booleans
  only; key fields are never prefilled (confirmed live below).
- `src/main/tray.ts` — Growth submenu: "Source: Tokens" / "Source: MRR"
  (MRR item hidden entirely, not disabled, until a source is connected)
  + "Growth settings…".
- Dev flags: `--keychain-service <name>` (QA never touches real
  entries), `--mrr-poll-now` (forces an immediate poll on a tray mode
  switch to mrr), `--debug-tray-menu` (prints the growth submenu's
  current labels — a native Tray menu has no other external readback),
  `--open-growth-settings` (opens the settings window at launch — a
  native tray menu item can't be clicked via CDP, so this drives the
  exact same code path the click does).

## Gates

`npm ci` clean, `npm run typecheck` clean (main + renderer + gen-sprites
tsconfigs), `npm run lint` clean (eslint, 0 errors/warnings), `npm test`
**289 passed / 1 skipped** (30 files — 13 new: `mrr/keychain.test.ts`,
`mrr/https-allowlist.test.ts`, `mrr/redact.test.ts`, `mrr/stripe.test.ts`,
`mrr/revenuecat.test.ts`, `mrr/mrr-engine.test.ts`,
`mrr/settings-store.test.ts`, `mrr/settings-validate.test.ts`, plus
extended `xp/engine.test.ts`, `xp/store.test.ts`, `tray.test.ts`,
`ipc-channels.test.ts` drift guard — all still passing), `npm run build`
clean. No real Keychain or network access anywhere in the vitest suite
(execFile/fetch mocked throughout).

## Live verification method

CDP over `--remote-debugging-port`, same pattern as BL-4/6/7/8: isolated
`--user-data-dir=<scratch tmp dir>`, `CLAUDE_CONFIG_DIR`/`CODEX_HOME`
pointed at fresh empty scratch dirs, launched via `electron .` (not the
compiled JS path directly — `app.getAppPath()` needs the app root for
`loadFile` to resolve correctly) with
`--keychain-service beaver-buddy-qa-<random>` (a fresh random suffix
each run — never the real `beaver-buddy` service),
`--mrr-poll-now --debug-tray-menu --open-growth-settings --reset-hatch`.
A throwaway Node 24 script (not part of the repo) drove the settings
window over CDP (`Runtime.evaluate` to fill the key field and click
Save/the MRR radio, `Page.captureScreenshot` for the capture), while
capturing the child process's entire stdout/stderr for the no-leak grep.
Keychain existence/cleanup was checked with **direct** `security` CLI
calls from the verification script — never through the app — so the
"entry exists" and "entry deleted" evidence is independent of the code
under test.

## Evidence 1 — before-state: tray hides the MRR option

First `TRAY_MENU` line, printed at the very first menu build (before any
settings interaction):

```
TRAY_MENU: ["Source: Tokens","","Growth settings…"]
```

No "Source: MRR" entry — matches R9 (MRR hidden, not just disabled,
until a source is connected). Covered at the unit level by
`tray.test.ts`'s "hides the MRR item when no source is connected".

## Evidence 2 — save a fake key: Keychain write + tray updates live

Settings window state before save (read via `settings:read-status`):
`{"stripeStatus":"not connected","mrrDisabled":true}`.

Typed `sk_test_fake_DO_NOT_USE` into the Stripe field and clicked Save
(drives the real `settings:save` IPC → `settings-validate.ts` →
`setKeychainSecret`). After save: `{"stripeStatus":"connected",
"mrrDisabled":false,"statusLine":"saved","keyFieldValue":""}` — the key
field is empty immediately after save (never prefilled, and the app
doesn't echo it back either).

Direct `security find-generic-password -s beaver-buddy-qa-<random> -a
stripe-key -w` (run by the verification script, not the app) succeeded:
`KEYCHAIN_ENTRY_EXISTS_BEFORE_CLEANUP: true` — confirms a real Keychain
entry was created under the QA-only service.

Tray rebuilt itself as part of the save's `onSettingsChanged` callback;
the next `TRAY_MENU` line:

```
TRAY_MENU: ["Source: Tokens","Source: MRR","","Growth settings…"]
```

"Source: MRR" is now present — was absent in evidence 1's first line.

Capture: `BL-9-settings.png` (840×904, CDP `Page.captureScreenshot`, no
checkerboard needed — normal opaque window). Shows the Stripe fieldset
with "connected" status and an empty (never-prefilled) key input showing
only its `sk_live_...` placeholder, RevenueCat still "not connected",
and the Growth-source radios (Tokens still selected — the toggle below
happens after this capture).

## Evidence 3 — toggle to MRR: real HTTPS call, 401 handled, no key leak, no XP

Clicked the MRR radio (`settings:save({mode:'mrr'})` →
`xpEngine.setMode('mrr')` → `--mrr-poll-now` fires `mrrEngine.pollNow()`
immediately). Radio state after: `{"tokensChecked":false,
"mrrChecked":true}`.

Captured stderr from the real network call:

```
stripe mrr poll failed: HTTP 401
```

This is a genuine HTTPS round-trip to `https://api.stripe.com/v1/subscriptions`
with the fake key — Stripe's real API correctly rejected it with 401,
`getStripeMrr` returned `null`, and `mrr-engine.ts`'s `pollNow` aborted
before calling `awardMrr` (confirmed by `mrr-engine.test.ts`'s "a 401
from Stripe awards nothing and does not throw", and live below).

**No key leak**: `FAKE_KEY_LEAKED_IN_TRANSCRIPT: false` — the entire
captured stdout+stderr transcript (Electron startup banner, both
`TRAY_MENU` prints, the poll-failure line, everything) was grepped for
the literal string `sk_test_fake_DO_NOT_USE` after the process exited.
Zero occurrences.

**No XP awarded**: `XP_STATE_AFTER_401: "no xp-state.json written"` —
read directly from the isolated `--user-data-dir` before it was deleted.
The file was never created at all (no token accrual either, since
`CLAUDE_CONFIG_DIR`/`CODEX_HOME` pointed at empty scratch dirs), which is
the strongest possible evidence of zero award: not "xp unchanged from a
prior value" but "the state file recording any award doesn't exist".

No crash: the app process was still running and responsive to further
CDP calls after the 401 (confirmed by evidence 2's screenshot step
happening between save and toggle, and the process only exiting on the
script's own `SIGTERM` at the end).

## Evidence 4 — Keychain cleanup and verified deletion

After the run, the script deleted every account under the QA service
directly via `security delete-generic-password` (not through the app):
`stripe-key` (deleted), `revenuecat-key` / `revenuecat-project` (nothing
to delete — never written, since RevenueCat wasn't exercised this run).

Verified via a second direct `security find-generic-password` call:
`KEYCHAIN_ENTRY_EXISTS_AFTER_CLEANUP: false` — the entry is gone. The
QA-only `--keychain-service` override means the real `beaver-buddy`
service was never touched by any of this.

## Review method

Live CDP evidence cross-checked against the unit suite covering the same
invariants (once-per-local-date, both-direction mode-switch
no-double-count, allowlist lookalike rejection, redaction, schema
migration, validation edges) — the live run exercises the real Electron
process, IPC, Keychain, and network path; the unit suite exercises the
edge cases a single live run can't practically hit (midnight rollover,
oversize/garbage payloads, multi-page Stripe pagination, etc.).

## Deviations from the plan (with rationale)

1. **Two additional dev flags beyond the plan's explicit
   `--keychain-service`/`--mrr-poll-now` list**: `--debug-tray-menu` and
   `--open-growth-settings`. The plan itself names "Menu.getApplicationMenu
   introspection or debug hook" as the intended mechanism for tray-state
   evidence — a native Tray context menu has no other external readback,
   and a native menu item can't be clicked via CDP at all, so a
   scriptable flag (same family as `--quip`/`--inject-xp`/`--reset-hatch`)
   is the only way to both observe and drive it non-interactively.
2. **`MRR_XP_PER_DOLLAR = 10`**: the plan doesn't pin a conversion rate,
   only "floor(mrr_dollars × rate)". Picked a round, clearly-a-placeholder
   number — same tuning-value treatment as `TOKENS_PER_XP`.
3. **A poll aborts entirely (no award) if any *connected* source fails**,
   rather than awarding a partial sum from whichever source succeeded.
   The plan's wording ("no award that day") reads as singular/all-or-
   nothing; awarding partial credit from a permanently-failing second
   source would otherwise under-count forever with no way to self-heal
   beyond a full disconnect/reconnect.
4. **RevenueCat's exact response schema** (`{metrics: [{id, value, unit:
   "$", ...}]}`, `id: "mrr"`) was confirmed against RevenueCat's official
   published API docs (not guessed) since no live test account was
   available to hit the endpoint directly — see the "not verified"
   note below.

## NOT verified autonomously

**Live MRR-drives-XP with a real test Stripe (or RevenueCat) account.**
Everything above proves the wiring is correct end-to-end up to and
including a genuine HTTPS round-trip that a real account would need to
succeed (auth header format, host, path, error handling) — but a fake
key can only ever prove the *failure* path (401 → no award). The
*success* path (a real subscription's MRR converting into an XP award)
is covered by `mrr-engine.test.ts`'s mocked-fetch integration tests
(`awards floor(mrr * rate) once`, `sums stripe and revenuecat when both
are connected`) but has not been exercised against a real Stripe/
RevenueCat account with real data. This needs human credentials and is
carried forward as a human follow-up (traced R9) — not faked here.
