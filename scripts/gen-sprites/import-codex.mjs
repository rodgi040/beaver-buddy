// One-off provenance script (BL-10): converts Codex-authored pixel-map text
// (palette lines + ```name fenced 48x48 grids, vision-guided from a
// user-supplied reference image) into a pixel-maps/<stage>.ts module in this
// repo's existing string-grid format. Not part of the build pipeline —
// run once per stage, output committed, source .txt files are ephemeral
// (never checked in, per CLAUDE.md's "no raw image-gen intermediates" rule).
//
// Usage: node import-codex.mjs <stage> <idle+walk.txt> <run+sleep+react.txt> <outFile.ts>
import { readFileSync, writeFileSync } from 'node:fs';

const [, , stage, partA, partB, outFile] = process.argv;
if (!stage || !partA || !partB || !outFile) {
  throw new Error('usage: import-codex.mjs <stage> <partA.txt> <partB.txt> <outFile.ts>');
}

function parseFrames(path) {
  const text = readFileSync(path, 'utf8');
  const frames = new Map();
  for (const m of text.matchAll(/^```(\w+)\n([\s\S]*?)^```/gm)) {
    const rows = m[2].split('\n').filter((r) => r.length > 0);
    frames.set(m[1], rows);
  }
  return frames;
}

const frames = new Map([...parseFrames(partA), ...parseFrames(partB)]);

const ORDER = {
  idle: ['idle1', 'idle2'],
  walk: ['walk1', 'walk2', 'walk3', 'walk4'],
  run: ['run1', 'run2', 'run3', 'run4'],
  sleep: ['sleep1', 'sleep2'],
  react: ['react1', 'react2', 'react3', 'react4'],
};

for (const names of Object.values(ORDER)) {
  for (const name of names) {
    if (!frames.has(name)) throw new Error(`${stage}: missing frame '${name}'`);
    const rows = frames.get(name);
    if (rows.length !== 48) throw new Error(`${stage}.${name}: ${rows.length} rows, want 48`);
    rows.forEach((r, i) => {
      if (r.length !== 48) throw new Error(`${stage}.${name} row ${i}: ${r.length} cols, want 48`);
    });
  }
}

function frameLiteral(name) {
  const rows = frames.get(name);
  const lines = rows.map((r) => `  '${r}',`).join('\n');
  return `const ${name}: Frame = [\n${lines}\n];`;
}

const allNames = Object.values(ORDER).flat();
const body = allNames.map(frameLiteral).join('\n\n');

const header = `// ${stage[0].toUpperCase()}${stage.slice(1)}-beaver pixel maps: one 48x48 string grid per frame, one
// char per pixel (palette.ts key, '.' = transparent). Right-facing only —
// the renderer mirrors for left-facing (assets/STYLE.md). Pixel maps
// authored by OpenAI Codex (vision-guided from a user-supplied reference
// image), converted via scripts/gen-sprites/import-codex.mjs — see
// assets/STYLE.md provenance section.
import type { BeaverAnimation, Frame } from '../sheet.ts';

`;

const footer = `

export const ANIMATIONS: Record<BeaverAnimation, readonly Frame[]> = {
  idle: [${ORDER.idle.join(', ')}],
  walk: [${ORDER.walk.join(', ')}],
  run: [${ORDER.run.join(', ')}],
  sleep: [${ORDER.sleep.join(', ')}],
  react: [${ORDER.react.join(', ')}],
};
`;

writeFileSync(outFile, header + body + footer);
console.log(`wrote ${outFile} (${allNames.length} frames)`);
