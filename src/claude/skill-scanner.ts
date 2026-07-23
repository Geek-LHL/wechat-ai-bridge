import { readdirSync, readFileSync, existsSync, type Dirent } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { logger } from '../logger.js';
import type { CliName } from '../cli-detector.js';

export interface SkillInfo {
  name: string;
  description: string;
  path: string;
  source: CliName;
}

/**
 * Parse YAML-like frontmatter from a SKILL.md file.
 * Only extracts `name` and `description` fields.
 */
function parseSkillMd(filePath: string): { name: string; description: string } | null {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return null;

    const frontmatter = match[1];
    const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
    const descMatch = frontmatter.match(/^description:\s*(.+)$/m);

    if (!nameMatch) return null;

    return {
      name: nameMatch[1].trim().replace(/^["']|["']$/g, ''),
      description: descMatch ? descMatch[1].trim().replace(/^["']|["']$/g, '') : '',
    };
  } catch {
    logger.warn(`Failed to read SKILL.md: ${filePath}`);
    return null;
  }
}

/**
 * Scan a directory for SKILL.md files, reading skill info from each.
 */
function scanDirectory(baseDir: string, depth: number = 2): SkillInfo[] {
  const skills: SkillInfo[] = [];

  if (!existsSync(baseDir)) return skills;

  let entries: Dirent[];
  try {
    entries = readdirSync(baseDir, { withFileTypes: true });
  } catch {
    return skills;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const fullPath = join(baseDir, entry.name);

    if (depth > 1) {
      // Recurse one level deeper
      skills.push(...scanDirectory(fullPath, depth - 1));
    }

    const skillFile = join(fullPath, 'SKILL.md');
    if (existsSync(skillFile)) {
      const info = parseSkillMd(skillFile);
      if (info) {
        skills.push({ ...info, path: fullPath, source: 'claude' });
      }
    }
  }

  return skills;
}

function addUnique(skills: SkillInfo[], seen: Set<string>, newSkills: SkillInfo[], source: CliName): void {
  for (const skill of newSkills) {
    skill.source = source;
    if (!seen.has(skill.name)) {
      seen.add(skill.name);
      skills.push(skill);
    }
  }
}

function scanClaudeSkills(home: string): SkillInfo[] {
  const claudeDir = join(home, '.claude');
  const skills: SkillInfo[] = [];
  const seen = new Set<string>();

  // ~/.claude/skills/*/
  const userSkillsDir = join(claudeDir, 'skills');
  addUnique(skills, seen, scanDirectory(userSkillsDir, 1), 'claude');

  // ~/.claude/plugins/cache/*/skills/*/
  const pluginsCacheDir = join(claudeDir, 'plugins', 'cache');
  if (existsSync(pluginsCacheDir)) {
    let cacheEntries: Dirent[];
    try {
      cacheEntries = readdirSync(pluginsCacheDir, { withFileTypes: true });
    } catch {
      cacheEntries = [];
    }

    for (const cacheEntry of cacheEntries) {
      if (!cacheEntry.isDirectory()) continue;
      const cacheDir = join(pluginsCacheDir, cacheEntry.name);

      const pluginSkillsDir = join(cacheDir, 'skills');
      addUnique(skills, seen, scanDirectory(pluginSkillsDir, 1), 'claude');

      const superpowersSkillsDir = join(cacheDir, 'superpowers', 'skills');
      addUnique(skills, seen, scanDirectory(superpowersSkillsDir, 1), 'claude');
    }
  }

  // ~/.claude/plugins/marketplaces/*/plugins/*/skills/*/
  const marketplacesDir = join(claudeDir, 'plugins', 'marketplaces');
  if (existsSync(marketplacesDir)) {
    let mpEntries: Dirent[];
    try {
      mpEntries = readdirSync(marketplacesDir, { withFileTypes: true });
    } catch {
      mpEntries = [];
    }

    for (const mpEntry of mpEntries) {
      if (!mpEntry.isDirectory()) continue;
      const pluginsDir = join(marketplacesDir, mpEntry.name, 'plugins');
      if (!existsSync(pluginsDir)) continue;

      let pluginEntries: Dirent[];
      try {
        pluginEntries = readdirSync(pluginsDir, { withFileTypes: true });
      } catch {
        continue;
      }

      for (const pluginEntry of pluginEntries) {
        if (!pluginEntry.isDirectory()) continue;
        const pluginSkillsDir = join(pluginsDir, pluginEntry.name, 'skills');
        addUnique(skills, seen, scanDirectory(pluginSkillsDir, 1), 'claude');
      }
    }
  }

  return skills;
}

function scanQoderSkills(home: string): SkillInfo[] {
  const qoderDir = join(home, '.qoder');
  const skills: SkillInfo[] = [];
  const seen = new Set<string>();

  // ~/.qoder/skills/*/
  const userSkillsDir = join(qoderDir, 'skills');
  addUnique(skills, seen, scanDirectory(userSkillsDir, 1), 'qodercli');

  // ~/.qoder/plugins/cache/*/*/skills/*/
  const pluginsCacheDir = join(qoderDir, 'plugins', 'cache');
  if (existsSync(pluginsCacheDir)) {
    let cacheEntries: Dirent[];
    try {
      cacheEntries = readdirSync(pluginsCacheDir, { withFileTypes: true });
    } catch {
      cacheEntries = [];
    }

    for (const cacheEntry of cacheEntries) {
      if (!cacheEntry.isDirectory()) continue;
      const bundlerDir = join(pluginsCacheDir, cacheEntry.name);

      let pluginEntries: Dirent[];
      try {
        pluginEntries = readdirSync(bundlerDir, { withFileTypes: true });
      } catch {
        continue;
      }

      for (const pluginEntry of pluginEntries) {
        if (!pluginEntry.isDirectory()) continue;
        const pluginDir = join(bundlerDir, pluginEntry.name);

        // Check for version directories (e.g. 1.2.0) or direct skills/
        const pluginSkillsDir = join(pluginDir, 'skills');
        if (existsSync(pluginSkillsDir)) {
          addUnique(skills, seen, scanDirectory(pluginSkillsDir, 1), 'qodercli');
        }

        // Handle version directories: plugin/version/skills/
        let versionEntries: Dirent[];
        try {
          versionEntries = readdirSync(pluginDir, { withFileTypes: true });
        } catch {
          continue;
        }
        for (const versionEntry of versionEntries) {
          if (!versionEntry.isDirectory()) continue;
          if (versionEntry.name === 'skills') continue; // already handled
          const versionSkillsDir = join(pluginDir, versionEntry.name, 'skills');
          addUnique(skills, seen, scanDirectory(versionSkillsDir, 1), 'qodercli');
        }
      }
    }
  }

  return skills;
}

function scanCodexSkills(home: string): SkillInfo[] {
  const codexDir = join(home, '.codex');
  const skills: SkillInfo[] = [];
  const seen = new Set<string>();

  // ~/.codex/vendor_imports/skills/skills/*/
  const vendorSkillsDir = join(codexDir, 'vendor_imports', 'skills', 'skills');
  addUnique(skills, seen, scanDirectory(vendorSkillsDir, 1), 'codex');

  // ~/.codex/plugins/cache/*/*/*/skills/*/
  const pluginsCacheDir = join(codexDir, 'plugins', 'cache');
  if (existsSync(pluginsCacheDir)) {
    let cacheEntries: Dirent[];
    try {
      cacheEntries = readdirSync(pluginsCacheDir, { withFileTypes: true });
    } catch {
      cacheEntries = [];
    }

    for (const cacheEntry of cacheEntries) {
      if (!cacheEntry.isDirectory()) continue;
      const sourceDir = join(pluginsCacheDir, cacheEntry.name);

      let sourceEntries: Dirent[];
      try {
        sourceEntries = readdirSync(sourceDir, { withFileTypes: true });
      } catch {
        continue;
      }

      for (const sourceEntry of sourceEntries) {
        if (!sourceEntry.isDirectory()) continue;
        const pluginDir = join(sourceDir, sourceEntry.name);

        // Direct skills: cache/source/plugin/skills/
        const directSkillsDir = join(pluginDir, 'skills');
        if (existsSync(directSkillsDir)) {
          addUnique(skills, seen, scanDirectory(directSkillsDir, 1), 'codex');
        }

        // Versioned: cache/source/plugin/version/skills/
        let versionEntries: Dirent[];
        try {
          versionEntries = readdirSync(pluginDir, { withFileTypes: true });
        } catch {
          continue;
        }
        for (const versionEntry of versionEntries) {
          if (!versionEntry.isDirectory()) continue;
          if (versionEntry.name === 'skills') continue;
          const versionSkillsDir = join(pluginDir, versionEntry.name, 'skills');
          addUnique(skills, seen, scanDirectory(versionSkillsDir, 1), 'codex');
        }
      }
    }
  }

  return skills;
}

function scanOpencodeSkills(home: string): SkillInfo[] {
  const opencodeDir = join(home, '.opencode');
  const skills: SkillInfo[] = [];
  const seen = new Set<string>();

  // ~/.opencode/skills/*/
  const userSkillsDir = join(opencodeDir, 'skills');
  addUnique(skills, seen, scanDirectory(userSkillsDir, 1), 'opencode');

  // ~/.opencode/plugins/cache/*/skills/*/
  const pluginsCacheDir = join(opencodeDir, 'plugins', 'cache');
  if (existsSync(pluginsCacheDir)) {
    let cacheEntries: Dirent[];
    try {
      cacheEntries = readdirSync(pluginsCacheDir, { withFileTypes: true });
    } catch {
      cacheEntries = [];
    }

    for (const cacheEntry of cacheEntries) {
      if (!cacheEntry.isDirectory()) continue;
      const cacheDir = join(pluginsCacheDir, cacheEntry.name);
      const pluginSkillsDir = join(cacheDir, 'skills');
      addUnique(skills, seen, scanDirectory(pluginSkillsDir, 1), 'opencode');
    }
  }

  return skills;
}

// Scan all known skill directories for all supported CLIs.
//
// Claude:  ~/.claude/skills, ~/.claude/plugins/cache/.../skills, marketplace plugins
// Qoder:   ~/.qoder/skills, ~/.qoder/plugins/cache/.../skills
// Codex:   ~/.codex/vendor_imports/skills/skills, ~/.codex/plugins/cache/.../skills
// OpenCode: ~/.opencode/skills, ~/.opencode/plugins/cache/.../skills
export function scanAllSkills(): SkillInfo[] {
  const home = homedir();
  const allSkills: SkillInfo[] = [];
  const seen = new Set<string>();

  const scanners = [
    scanClaudeSkills,
    scanQoderSkills,
    scanCodexSkills,
    scanOpencodeSkills,
  ];

  for (const scanner of scanners) {
    const skills = scanner(home);
    for (const skill of skills) {
      if (!seen.has(skill.name)) {
        seen.add(skill.name);
        allSkills.push(skill);
      }
    }
  }

  logger.info(`Scanned ${allSkills.length} skills from all CLIs`);
  return allSkills;
}

/**
 * Filter skills by CLI source.
 */
export function filterSkillsBySource(skills: SkillInfo[], source: string): SkillInfo[] {
  return skills.filter(s => s.source === source);
}

/**
 * Format a list of skills into a readable string for display.
 */
export function formatSkillList(skills: SkillInfo[]): string {
  if (skills.length === 0) {
    return 'No skills found.';
  }

  const lines = skills.map((s, i) => {
    const desc = s.description ? ` - ${s.description}` : '';
    const src = s.source !== 'claude' ? ` [${s.source}]` : '';
    return `  ${i + 1}. ${s.name}${src}${desc}`;
  });

  return `Available skills (${skills.length}):\n${lines.join('\n')}`;
}

/**
 * Find a skill by name (case-insensitive match).
 */
export function findSkill(skills: SkillInfo[], name: string): SkillInfo | undefined {
  const lower = name.toLowerCase();
  return skills.find(
    (s) => s.name.toLowerCase() === lower || s.name.toLowerCase().replace(/\s+/g, '-') === lower,
  );
}
