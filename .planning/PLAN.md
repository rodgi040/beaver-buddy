# Plan: Kurze Contributor-Doku „Animation Authoring" (ComfyUI + PixiJS)

## Ziel

Eine **kurze, einsteigerfreundliche Doku** für das Beaver-Buddy-Repo, die erklärt,
wie die Animations-Erstellung funktioniert und welche Tools wie genutzt werden:
**ComfyUI (Comfy Cloud) + PixiJS Puppet Studio**, inkl. Setup für **macOS & Windows**,
der **PixiJS-Skills** (im Repo), der **comfy-skills** (Plugin/Commands) und der
**Comfy-Cloud-MCP-Einrichtung**.

**Zielgruppe:** Andere Programmierer, die am Open-Source-Projekt (AI Beaver
Community) mitarbeiten — **und** agentische Coding Agents, die am Projekt arbeiten.
Beide Zielgruppen werden explizit einmal angesprochen.

## Scope

1. **Neue Datei `docs/animation-authoring.md`** (englisch, Repo-Konvention) als
   Einstiegs-Übersicht vor den bestehenden Tiefe-Doks. Struktur:
   - **Pipeline-Überblick** (5 Schritte: Parts via ComfyUI → Rig → Recipe → Bake →
     Intake/Design-Gate), mit Links in die Tiefe-Doks statt Detail-Duplikation.
   - **Voraussetzungen macOS & Windows:** Node/npm, Repo-Clone, `npm install`.
   - **Tool 1 – ComfyUI / Comfy Cloud:**
     - Comfy-Cloud-MCP-Einrichtung: Claude-Code-Plugin-Weg
       (`/plugin marketplace add Comfy-Org/comfy-skills`,
       `/plugin install comfy-cloud@comfy-skills`, OAuth via `/mcp`)
       **und** generischer MCP-Weg für andere Clients (Kimi, Codex, pi …):
       gehosteter Server `https://cloud.comfy.org/mcp`, OAuth, Verweis auf
       https://docs.comfy.org/cloud/mcp.
     - comfy-skills Commands-Übersicht (kurz, eine Zeile pro Command-Gruppe).
     - Hinweis auf das Workflow-Inventory (`PixelArt Parts Builder` etc.) →
       Details bleiben in `docs/comfyui-avatar-generation.md` (Source of Truth).
     - Kurzer Hinweis: lokale ComfyUI-Installation als Alternative (ein Absatz,
       keine vollständige Installationsanleitung).
   - **Tool 2 – PixiJS Puppet Studio:**
     - `npm run studio` / `ingest-parts.mjs` / rigs / recipes / bake — kompakt,
       Verweis auf `tools/puppet-studio/README.md`.
     - **PixiJS-Skills:** liegen im Repo unter `.agents/skills/pixijs*`
       (Routing-Skill `pixijs` zuerst laden) — Hinweis speziell für Agents.
   - **Abschnitt für agentische Coding Agents:** Skills nutzen (pixijs-Routing,
     comfy-Commands), **ADR 003** beachten (PixiJS nur dev-time, nie im
     App-Runtime), Guardrails: keine API-Keys/Secrets im Repo, generierte Assets
     nur als PNG, Design-Gate + `assets/STYLE.md` verbindlich.
2. **Verlinkung (drei Orte, damit Menschen und Agents die Datei finden):**
   - Eintrag in `docs/README.md` (Index, Abschnitt „Assets & pipelines").
   - Kurzer Verweis in `README.md` (Contributing-Abschnitt oder „Project layout",
     eine Zeile mit Link) — Einstieg für **Menschen**.
   - Kurzer Verweis in **`AGENTS.md`** (Repo-Root, der Entry-Point für Coding
     Agents) — ein Satz im Stil der bestehenden Zeilen, der Agents sagt: Animations-
     Authoring-Doku liegt in `docs/animation-authoring.md` (plus Hinweis auf die
     PixiJS-Skills unter `.agents/skills/pixijs*`).

## Out of Scope (explizit)

- Keine Änderungen an `docs/comfyui-avatar-generation.md`,
  `tools/puppet-studio/README.md` oder ADR 003 (bleiben Source of Truth, werden
  nur verlinkt).
- Keine vollständige lokale ComfyUI-Installationsanleitung (nur Hinweis-Absatz).
- Keine neuen Skills, kein Code, keine neuen Dependencies.
- Keine Endnutzer-Doku (App-User generieren keine Animationen — bleibt Non-Goal).

## Schritte

1. **GSD-Doku (Start):** Task in `~/deadman-workflow/projects/TASKLOG.md` erfassen
   (Scope, Status „In Progress", Skills: `spec-driven-development`-lite / Doku-Task).
2. **`docs/animation-authoring.md` erstellen** gemäß Struktur oben — kurz halten
   (Ziel: ≤ ~150 Zeilen; Tiefe nur via Links). Ponytail-Prinzip: lieber verlinken
   als duplizieren.
3. **`docs/README.md`** Index-Eintrag ergänzen.
4. **`README.md`** Ein-Zeilen-Verweis ergänzen (Contributing-Sektion) — für Menschen.
5. **`AGENTS.md`** Ein-Zeilen-Verweis ergänzen — für agentische Coding Agents.
6. **Verification:**
   - Alle internen Links auflösbar (Pfade existieren).
   - Konsistenz-Check gegen die drei Bestands-Doks (keine Widersprüche, keine
     kopiellen Detailblöcke).
   - Plattform-Check: macOS- und Windows-Pfade/Befehle korrekt (PowerShell vs.
     POSIX-Shell erwähnen, wo nötig).
   - Guardrail-Check: keine Secrets, PixiJS-dev-time-only erwähnt, ADR-003-Link.
7. **GSD-Doku (Ende):** Status „Done", erledigte/offene Punkte.
8. **Git-Ops:** `docs: add animation-authoring contributor guide (ComfyUI + PixiJS)`
   (Conventional Commit, **Co-authored-by-Trailer rodgi040** nicht vergessen);
   Commit erst nach User-OK bzw. gemäß Workflow.

## Akzeptanzkriterien

- [ ] Ein neuer Contributor (oder Agent) versteht nach 5 Minuten Lektüre die
      Pipeline und kann beide Tools auf macOS **und** Windows einrichten.
- [ ] MCP-Einrichtung beschreibt beide Wege: Claude-Code-Plugin **und** generische
      MCP-Config (`https://cloud.comfy.org/mcp`, OAuth).
- [ ] PixiJS-Skills (`.agents/skills/pixijs*`) und comfy-skills sind jeweils einmal
      erwähnt und verlinkt.
- [ ] Abschnitt für agentische Coding Agents vorhanden (Skills-Nutzung + ADR 003 +
      Guardrails).
- [ ] Keine Detail-Duplikation zu den Bestands-Doks; die neue Datei ist an drei
      Stellen verlinkt: `docs/README.md` (Index), `README.md` (Menschen) und
      `AGENTS.md` (Agents).
- [ ] Keine Secrets/Keys in der Doku.

## Risiken / offene Punkte

- **Client-Vielfalt:** Das comfy-cloud-Plugin ist Claude-Code-spezifisch; für
  Kimi/Codex/pi muss der generische MCP-Weg stimmen → in der Doku beide Wege
  zeigen, ohne client-spezifische JSON-Beispiele zu erfinden (auf
  docs.comfy.org/cloud/mcp verweisen).
- **Drift-Gefahr:** Workflow-Namen (`PixelArt Parts Builder` etc.) können sich
  ändern → nur knapp erwähnen, `docs/comfyui-avatar-generation.md` als Source of
  Truth verlinken (Steuerung statt einfrierender Details, analog zur
  comfy-skills-Authoring-Regel).
- **Offen (User-Entscheid bei Umsetzung):** Dateiname `docs/animation-authoring.md`
  — Alternativvorschlag `docs/animation-quickstart.md`, falls präferiert.
