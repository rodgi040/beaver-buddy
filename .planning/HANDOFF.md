# Handoff

> Full resume context. Written by `/fp-pause`, read by `/fp-resume`. `STATE.md` is the short digest;
> this file is the complete picture so the next session loses no context.

**Last updated:** 2026-07-22 (pi, fp-pause — Fork-Migration halb durch, M4/P1 delegiert, Debug-Report)

## current_state
**Fork → Upstream-Migration: Teil 1 done, Rest blockiert auf Owner-Review (Gw3i).**
Lokaler Stand: nur noch `main`, sauber, synchron mit Fork-`origin/main`. Upstream
(`ai-beavers/beaver-buddy`) hat nur noch `main` + 4 PR-Branches (#38–#41) — alle stale
Branches wurden mit Archiv-Tags geschlossen. **Migration Schritte 3–6 (Remote-Umbau,
main-Sync, Tag-Sync, Fork-Archivierung) warten auf Merge von PR #40 + #41** — Merges
blockiert durch **Org-Level-Ruleset** (Owner/Admin-Approval nötig; rodgi040 + jurij sind
nur `maintain`; selbst Approval durch rodgi040 reicht nicht — getestet an PR #38).
Vlady (GitHub: **Gw3i**) wollte die Reviews „in den nächsten Stunden" machen (Stand: Nachmittag 2026-07-22).
**M4/P1 WAVE-1 delegiert:** Rodgi startet/startete einen Cloud-Coding-Agenten (Claude Code/Codex)
mit dem Brief `.planning/Planning/Milestone-4/Phase-1/AGENT-BRIEF.md` — TokScale-Analyse +
eigener Token-Log-Reader; Branch `feat/token-log-reader/M4-P1` (Stand Session-Ende: Branch
existiert noch nicht, Agent vermutlich noch nicht gestartet/gerade gestartet).
**Debug-Befund:** Biber wächst nicht, weil XP-Quellen Opt-in sind (Report:
`.planning/Debugging/DEBUG-beaver-growth.md`).

## completed (Session 2026-07-22)
- **Fork-Cleanup 1:** `feature/animation-authoring-docs` per `--no-ff` in main gemergt
  (Konflikt in AGENTS.md aufgelöst: neuere `.planning/`-Sektion von HEAD + Branch-Neuerungen
  übernommen), Tag `docs/animation-authoring`, 7 gemergte Branches lokal + remote gelöscht
  → lokal nur noch `main` (`1c86e57`)
- **Migrations-Plan** (`.planning/PLAN.md`, 6 Schritte) erstellt + Ausführung Teil 1:
  - Berechtigung geklärt: rodgi040 + jurij = `maintain` auf ai-beavers; **Vlady = `Gw3i`**
    (über Commit-Historie identifiziert); Org-Member-Listing braucht `admin:org`-Scope
  - `docs/animation-authoring` zu upstream gepusht → **PR #41** geöffnet
  - Reviews für PR #40 + #41 bei **Gw3i + jurij** angefragt
  - Merge-Versuche gescheitert: Branch Protection (REVIEW_REQUIRED), Auto-Merge repo-weit
    deaktiviert, `--admin` nicht möglich
- **Fork-Cleanup 2 (upstream):** 15 bereits gemergte stale Branches (BL-1–BL-12,
  BL-11-fix-walk-facing/-idle, build-loop/beaver-buddy) mit Archiv-Tags am Branch-Tip
  (`archive/bl-item/BL-N`, `archive/build-loop/beaver-buddy`) versehen + gelöscht;
  Tags `v0.1.0` + `docs/animation-authoring` zu upstream gepusht (upstream hatte 0 Tags);
  **PR #38 (Dependabot) approved** — Merge trotzdem BLOCKED → Erkenntnis: Org-Ruleset
  verlangt Owner/Admin
- **M4/P1 Agent-Brief** geschrieben (`.planning/Planning/Milestone-4/Phase-1/AGENT-BRIEF.md`):
  TokScale (github.com/junhoyeo/tokscale) nur als Analyse-Referenz klonen (**nie committen**),
  Logik dokumentieren in `TOKSCALE-ANALYSIS.md`, eigenen Reader bauen (nur echte
  Input/Output-Tokens, Cache raus, Tages-Aggregation, **10-Min-Refresh inkrementell**,
  Win + macOS, Schema push-fähig für spätere AI-Beavers-Nutzer-DB), Branch
  `feat/token-log-reader/M4-P1`, kein Merge ohne Rodgi-Review; PHASE.md Status →
  in-progress, STATE.md aktualisiert (`8e5962b`)
- **/debug Biber-Wachstum** (Scout, read-only): Root Cause = Wachstumslogik existiert +
  verdrahtet (Tests grün), aber XP-Quellen sind Opt-in (`claudeEnabled`/`codexEnabled`
  default `false`, `settings-store.ts:18-25`) → ohne Connect kein XP → Dauer-Baby;
  Zusatzbefund Code ≠ Spec (3 Stufen/linear/Cache-zählend vs. 5 Stufen/quadratisch/Cache-raus);
  Report `.planning/Debugging/DEBUG-beaver-growth.md` + README-Verlinkung (`09fc07e`)

## remaining (in Reihenfolge)
1. **Vlady (Gw3i) merged/approved PR #40 → dann #41** (+ #38/#39, letztere schon approved von
   rodgi040) — danach sofort:
2. **Migration Schritte 3–6** (`.planning/PLAN.md`): `git remote rename origin fork` +
   `upstream`→`origin`, `git branch -u origin/main main`, `git merge --ff-only origin/main`,
   Tag-Sync prüfen, Fork auf GitHub archivieren (Empfehlung, nicht löschen), verifizieren
3. **Cloud-Agent M4/P1 WAVE-1 beobachten:** Branch `feat/token-log-reader/M4-P1` prüfen
   (existiert er? Fortschritt? `TOKSCALE-ANALYSIS.md` da?) — Achtung: Brief liegt im
   `.planning/`-Ordner, der erst nach PR-#40-Merge auf ai-beavers/main ist; Agent ggf.
   auf Fork-`main` arbeiten lassen
4. **Nach PR-#40-Merge: Team-Dispatch** — Prompts aus `.planning/KICKOFF-AGENT-PROMPTS.md`
   an Vlady (M5/P1) + Jurij (M3/P1)
5. **Offen von dieser Session:** Onboarding-Hinweis „Wachstum braucht Connect" in
   NOTE.md/M4-Spec aufnehmen? (User gefragt, Antwort ausstehend)
6. **Owner-Entscheide (NOTE.md):** Apple-Developer-Account (~99 $/J), macOS-Testhardware,
   macOS-Z1-Priorität, #3/#4b/#63/#64
7. **Später:** M2/P3-WAVE-3-Resume (Claude Code, Fallschirm) · M4/P2 (XP-Modell nach Spec:
   5 Stufen, quadratisch, Cache raus, γ=2) — schließt den Debug-Befund Code≠Spec ·
   M5/P12 Stufen-Art-Paket · Kalibrierung XP-Konstante nach 1 Woche M4/P1-Daten

## decisions (Owner, verbatim)
- „Checke einmal welche offenen Branches wir noch haben … merge diese dann anschließend
  einmal sauber mit Merge Commits und Tags" — 2026-07-22
- „Ich möchte, dass wir jetzt … nur noch mit der Original Repository Main Branches erstelle
  und direkt Pull Request auf der Main Repo machen kann, ohne dass wir auf der Fork-Version
  weiterarbeiten müssen" — 2026-07-22
- „Ich bin mir nicht sicher, ob nur der Admin tatsächlich die PR mergen kann … Bitte … das
  noch einmal in dem Plan mitzuvermerken" — 2026-07-22 (→ Schritt 2.0 in PLAN.md; bestätigt:
  Org-Ruleset blockiert, Owner nötig)
- „vlady prüft das in den nächsten stunden, ich bin beim sport und werde einen cloud code
  coding agent starten, damit dieser die Logik von Tokscale analysiert … alle 10 min sich
  aktualisiert … in zukunft in die nutzer datenbank von AI Beavers account gepusht" — 2026-07-22
- „das geclonte repo sollte nicht mit in die codebase commitet werden sondern nur als
  referenz / logisches referenz vermerkt werden" — 2026-07-22
- „Keine änderungen vornhemen, nur prüfen lassen" (/debug Biber-Wachstum) — 2026-07-22

## blockers
- **PR-Merges (#38–#41): Org-Level-Ruleset** — Owner/Admin-Approval nötig (Gw3i).
  rodgi040-`maintain` reicht nicht (empirisch an #38 getestet: Approval da, Merge BLOCKED).
  Auto-Merge repo-weit deaktiviert. Kein Code-Blocker.
- **Cloud-Agent (M4/P1) sieht `.planning/` nur auf Fork-main** — bis PR #40 gemerged ist.

## next_action
**PR-Status prüfen** (`gh pr view 40/41 --repo ai-beavers/beaver-buddy`): Sobald #40 + #41
gemerged sind → Migration Schritte 3–6 aus `.planning/PLAN.md` ausführen (Remote-Umbau,
ff-only-Sync, Fork archivieren). Parallel: Fortschritt des Cloud-Agents auf Branch
`feat/token-log-reader/M4-P1` checken.
