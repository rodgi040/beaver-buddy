# State

> Where the project stands now. Update after every meaningful action.

**Now:** **Fork→Upstream-Migration Teil 1 done** — lokal nur noch `main`; upstream: 15 stale Branches mit Archiv-Tags geschlossen, PR #41 offen · **Schritte 3–6 + PR-Merges (#38–#41) blockiert auf Owner-Review (Gw3i, Org-Ruleset)** · M4/P1 WAVE-1 an Cloud-Agent delegiert (TokScale-Brief) · M2/P3 Fallschirm pausiert
**Progress:** M1 ✅ · M2 P1/P2 ✅ (P3 pausiert) · M3–M6 geplant, M4/P1 in-progress (delegiert) · Zyklus-1-Exit-Kriterien: App downloadbar · 100 Downloads · 7 Contributors (aktuell 3)
**Blockers:** PR #38–#41 — Org-Level-Ruleset verlangt Owner/Admin-Approval (Gw3i); rodgi040=`maintain` reicht nicht (an #38 getestet); Auto-Merge repo-weit aus
**Last:** Session 2026-07-22: Fork-Cleanup (Merge + Tags + 22 Branches geschlossen) · Migrations-Plan + Teil 1 (PR #41, Reviews bei Gw3i/jurij angefragt, PR #38 approved) · M4/P1 Agent-Brief (TokScale, Branch feat/token-log-reader/M4-P1) · /debug Biber-Wachstum: Root Cause = XP-Quellen Opt-in (DEBUG-beaver-growth.md) · fp-pause
**Next:** ① PR-Status #40/#41 prüfen → nach Merge: Migration Schritte 3–6 (Remote-Umbau, ff-Sync, Fork archivieren) → ② Cloud-Agent-Fortschritt M4/P1 checken → ③ Team-Dispatch (KICKOFF-AGENT-PROMPTS.md). Offen: Onboarding-Hinweis „Wachstum braucht Connect“ in NOTE/M4-Spec? Owner-Entscheide: Apple-Account, Mac-Hardware, macOS-Z1-Priorität (NOTE.md).

## Recent decisions
- **Multiplattform Windows + macOS nativ** (Teambesprechung 2026-07-21): eine Electron-Codebasis, Installer für beide OS; ADR-002-Update in M1/MILESTONE.md; Release-Pipeline (M6/P4) baut + signiert beide Plattformen; macOS-Signing = Budget-Entscheid analog #4b — 2026-07-21
- **Herdr für Agent-Erkennung:** M3 nutzt das Open-Source-Terminal-Tool Herdr als Event-Quelle (kein eigener Detektor); TokScale-**Logik** 1:1 für alle Harnesses (Claude Code, Codex, pi) — 2026-07-21
- **5 Lebenszyklen:** Baby 1–4 · junges Baby 5–8 · Jugendlicher 9–16 · älterer Jugendlicher 17–24 · Erwachsener 25–32 → M5/P12 = Stufen-Art-Paket, in Z1 gezogen — 2026-07-21
- **Modell-Gewichtung:** Intelligence Index (artificialanalysis.ai), Seed-Tabelle 26 Modelle (REF=45), **γ=2 quadratisch** (Top 1,78× / Floor 0,5×; Anreiz für Modell-Qualität); Wert = Intelligenz, nicht Preis — 2026-07-21
- **XP ≠ Lebenszeit (vorerst):** Hauptlogik = XP aus Tokens → Level; Lebenszeit separat getrackt. Kurve: kumulativ quadratisch, TOTAL 120.000 XP (L32 ≈ Tag 60), Interaktionen ab L8. Spec: `Milestone-4/Phase-2/XP-LEVEL-MODEL.md` — 2026-07-21
- Agenten-Regel: **pi nutzt ausschließlich Rodgi; Vlady & Jurij arbeiten überall mit Claude Code** (einziger MCP-Zugang: Comfy Cloud) — 2026-07-21
- Zyklus 1 definiert: Exit = downloadbare App + 100 Downloads + 7 Contributors; Horizont ~6–8 Wochen; M5-Z1-Scope = P1–P5, Rest post-Z1 — 2026-07-21
- Team-Matrix: M3 = Jurij · M4 = Rodgi · M5 = Vlady · M6 = Rodgi (alle reviewen) — 2026-07-21
- Blocker-Dokumentation Pflicht: `Blocked by:` in PHASE.md + Dependencies in MILESTONE.md + Übersicht in ROADMAP.md — 2026-07-21
- Eine Animation pro Phase, 1–2 Waves (WAVE-1 Assets, WAVE-2 Runtime) — 2026-07-20
- Alle Asset-Arbeit = Claude Code (einziger Comfy-Cloud-MCP); pi = Runtime/Logik — 2026-07-20
- Kein Write-Zugang auf ai-beavers → Merges in Fork `rodgi040/beaver-buddy`; upstream-PRs = Contribution-PRs für Org-Admin — 2026-07-19
- Planungsdoku bleibt lokal (gitignored) — 2026-07-17

<!-- Digest only. Plan lives in ROADMAP.md; task detail in PHASE.md / WAVE-X.md. -->
