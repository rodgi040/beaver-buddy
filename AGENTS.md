# AGENTS.md — Beaver Buddy

Entry point for coding agents (Codex, Kimi Code, and others). The project
guardrails live in [`CLAUDE.md`](CLAUDE.md) — read it first, every session. It
covers the locked stack, Electron hardening invariants, security/privacy rules,
code style, the definition of done, and the git/PR workflow.

The product source of truth is [`PRD.md`](PRD.md); contributions are governed by
[`CONTRIBUTING.md`](CONTRIBUTING.md).

## Project planning docs — `.planning/` (committed)

**In this project, the planning/tracking docs live in `.planning/`, NOT in a
Flightplan directory.** Read these first when working on planned features:

- `.planning/KICKOFF.md` — team onboarding (Zyklus 1, roles, conventions) — **start here**
- `.planning/STATE.md` — current status (Now/Next/Blockers)
- `.planning/ROADMAP.md` — milestones M1–M6, phases, dependency overview
- `.planning/Planning/Milestone-N/...` — milestone/phase/wave detail (each phase has
  `Accountable`, `Blocked by:`, waves)
- `.planning/Planning/Milestone-4/Phase-2/XP-LEVEL-MODEL.md` — XP/level spec
- `.planning/Meetings/`, `.planning/Reference/`, `.planning/Archive/` — sources & item specs

Rules: one accountable owner per phase (see ROADMAP team matrix); check a phase's
`Blocked by:` before starting; never edit `.planning/` planning state yourself —
updates flow through Rodgi (the local Flightplan master `.flightplan/` is gitignored
and synced into `.planning/` by him).
