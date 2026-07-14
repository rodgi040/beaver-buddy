// Read-only, enumerated path discovery for usage logs (CLAUDE.md: "the
// specific Claude Code / Codex usage files the parser documents" — nothing
// else is ever read). No file content is touched here, only directory
// listings of the documented shapes.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export interface DiscoveredPaths {
  readonly claudeFiles: readonly string[];
  readonly codexFiles: readonly string[];
}

// Subset of process.env this module reads — kept narrow and injectable so
// tests never need the operator's real environment or home directory.
export interface PathEnv {
  readonly CLAUDE_CONFIG_DIR?: string;
  readonly CODEX_HOME?: string;
}

function safeReaddir(dir: string): fs.Dirent[] {
  try {
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

function claudeConfigDirs(env: PathEnv, home: string): string[] {
  const configured = env.CLAUDE_CONFIG_DIR;
  if (configured && configured.trim().length > 0) {
    return configured
      .split(',')
      .map((d) => d.trim())
      .filter((d) => d.length > 0);
  }
  // No override: both the current XDG location and the legacy one are used
  // if present, since users who migrated may still have data in the old spot.
  const xdg = path.join(home, '.config', 'claude');
  const legacy = path.join(home, '.claude');
  return [xdg, legacy].filter((d) => fs.existsSync(d));
}

// Enumerated Claude Code layout: `projects/{project}/{session}.jsonl` and
// `projects/{project}/{session}/subagents/{subagent}.jsonl`. Nothing outside
// this shape is read.
function findClaudeFiles(configDir: string): string[] {
  const projectsDir = path.join(configDir, 'projects');
  const files: string[] = [];

  for (const project of safeReaddir(projectsDir)) {
    if (!project.isDirectory()) continue;
    const projectDir = path.join(projectsDir, project.name);

    for (const entry of safeReaddir(projectDir)) {
      if (entry.isFile() && entry.name.endsWith('.jsonl')) {
        files.push(path.join(projectDir, entry.name));
        continue;
      }
      if (entry.isDirectory()) {
        const subagentsDir = path.join(projectDir, entry.name, 'subagents');
        for (const sub of safeReaddir(subagentsDir)) {
          if (sub.isFile() && sub.name.endsWith('.jsonl')) {
            files.push(path.join(subagentsDir, sub.name));
          }
        }
      }
    }
  }

  return files;
}

// Enumerated Codex layout: `sessions/YYYY/MM/DD/rollout-*.jsonl`, plus the
// same shape under `archived_sessions/`. Returns relative-path -> absolute
// so a caller can prefer `sessions/` on a duplicate relative path.
function findCodexRolloutFiles(root: string): Map<string, string> {
  const byRelativePath = new Map<string, string>();

  for (const year of safeReaddir(root)) {
    if (!year.isDirectory()) continue;
    const yearDir = path.join(root, year.name);

    for (const month of safeReaddir(yearDir)) {
      if (!month.isDirectory()) continue;
      const monthDir = path.join(yearDir, month.name);

      for (const day of safeReaddir(monthDir)) {
        if (!day.isDirectory()) continue;
        const dayDir = path.join(monthDir, day.name);

        for (const file of safeReaddir(dayDir)) {
          if (!file.isFile() || !file.name.startsWith('rollout-') || !file.name.endsWith('.jsonl')) continue;
          const relative = path.join(year.name, month.name, day.name, file.name);
          byRelativePath.set(relative, path.join(dayDir, file.name));
        }
      }
    }
  }

  return byRelativePath;
}

function findCodexFiles(codexHome: string): string[] {
  // sessions/ wins on a duplicate relative path (documented Codex behavior).
  const winners = findCodexRolloutFiles(path.join(codexHome, 'sessions'));
  const archived = findCodexRolloutFiles(path.join(codexHome, 'archived_sessions'));
  for (const [relative, absolute] of archived) {
    if (!winners.has(relative)) winners.set(relative, absolute);
  }
  return [...winners.values()];
}

export function discoverPaths(env: PathEnv = process.env, home: string = os.homedir()): DiscoveredPaths {
  const claudeFiles = claudeConfigDirs(env, home).flatMap(findClaudeFiles);

  const codexHome = env.CODEX_HOME && env.CODEX_HOME.trim().length > 0 ? env.CODEX_HOME : path.join(home, '.codex');
  const codexFiles = findCodexFiles(codexHome);

  return { claudeFiles, codexFiles };
}
