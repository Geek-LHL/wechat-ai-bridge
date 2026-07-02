import { spawnSync } from 'node:child_process';

// ---------------------------------------------------------------------------
// CLI 候选列表（优先级从高到低）
// ---------------------------------------------------------------------------

export type CliName = 'qodercli' | 'claude' | 'codex' | 'opencode';

export interface CliInfo {
  /** 可执行文件名 */
  cli: CliName;
  /** 显示名称 */
  displayName: string;
  /** 检测到的版本号 */
  version: string;
}

const CLI_CANDIDATES: Array<{ cli: CliName; displayName: string }> = [
  { cli: 'qodercli', displayName: 'Qoder CLI' },
  { cli: 'claude',   displayName: 'Claude CLI' },
  { cli: 'codex',    displayName: 'Codex CLI' },
  { cli: 'opencode', displayName: 'OpenCode' },
];

/**
 * 检测单个 CLI 是否可用，返回版本号；不可用则返回 null。
 */
function detectCli(cli: string): string | null {
  try {
    const result = spawnSync(cli, ['--version'], {
      encoding: 'utf8',
      timeout: 5000,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    if (result.status === 0 && result.stdout) {
      return result.stdout.trim().split('\n')[0] ?? 'unknown';
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 扫描所有候选 CLI，返回全部可用列表。
 */
export function detectAllCli(): CliInfo[] {
  const found: CliInfo[] = [];
  for (const candidate of CLI_CANDIDATES) {
    const version = detectCli(candidate.cli);
    if (version !== null) {
      found.push({ ...candidate, version });
    }
  }
  return found;
}

/**
 * 根据配置中保存的偏好或自动优先级，选出要使用的 CLI。
 *
 * @param preferred  config.cli 字段值（可选，用户上次选择）
 * @returns 选中的 CliInfo；若没有任何 CLI 可用则返回 null
 */
export function resolveCli(preferred?: string): CliInfo | null {
  const available = detectAllCli();
  if (available.length === 0) return null;

  if (preferred) {
    const match = available.find(c => c.cli === preferred);
    if (match) return match;
    // 偏好不可用，静默降级到第一个可用
  }
  return available[0]!;
}

/**
 * 格式化打印可用 CLI 信息（启动时用）。
 */
export function formatCliStatus(available: CliInfo[], active: CliInfo): string {
  const lines: string[] = [];
  lines.push('━━ AI CLI 检测结果 ━━');
  for (const c of available) {
    const marker = c.cli === active.cli ? '✅ 使用中' : '  可用';
    lines.push(`  ${marker}  ${c.displayName}  (${c.version})`);
  }
  if (available.length > 1) {
    lines.push(`  💡 如需切换，可用 /cli <名称> 或在配置文件设置 "cli" 字段`);
    lines.push('     可选值: qodercli / claude / codex / opencode');
  }
  lines.push('━━━━━━━━━━━━━━━━━━━━━');
  return lines.join('\n');
}
