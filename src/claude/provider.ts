import { spawn, type ChildProcess } from 'node:child_process';
import { writeFileSync, unlinkSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createInterface } from 'node:readline';
import { logger } from '../logger.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface QueryOptions {
  prompt: string;
  cwd: string;
  resume?: string;
  model?: string;
  systemPrompt?: string;
  /** 要执行的 CLI 可执行文件名，默认为 'qodercli' */
  cli?: string;
  images?: Array<{
    type: "image";
    source: { type: "base64"; media_type: string; data: string };
  }>;
  /** Called each time an assistant text chunk is produced (e.g. before/after tool calls). */
  onText?: (text: string) => Promise<void> | void;
  /** Called when an assistant turn ends, with its stop_reason
   *  ('tool_use' | 'end_turn' | 'max_tokens' | 'stop_sequence' | 'pause_turn' | ...).
   *  Use to decide whether the turn's text is interstitial or final answer. */
  onTurnEnd?: (stopReason: string) => Promise<void> | void;
  /** Optional abort controller to cancel the query (e.g. when user sends a new message). */
  abortController?: AbortController;
}

export interface QueryResult {
  text: string;
  sessionId: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TEMP_DIR = join(tmpdir(), 'wechat-qoder-code');

function saveImageTemp(images: NonNullable<QueryOptions['images']>): string[] {
  mkdirSync(TEMP_DIR, { recursive: true });
  const paths: string[] = [];
  for (const img of images) {
    const ext = img.source.media_type.split('/')[1] || 'png';
    const fileName = `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const filePath = join(TEMP_DIR, fileName);
    writeFileSync(filePath, Buffer.from(img.source.data, 'base64'));
    paths.push(filePath);
  }
  return paths;
}

function cleanupTempFiles(paths: string[]): void {
  for (const p of paths) {
    try { unlinkSync(p); } catch { /* ignore */ }
  }
}

// ---------------------------------------------------------------------------
// Stream parser (extracted for testability)
// ---------------------------------------------------------------------------

export interface StreamParserState {
  sessionId: string;
  textParts: string[];
  errorMessage?: string;
  trackingSkill: boolean;
  skillInputAccum: string;
}

export interface StreamParserCallbacks {
  onText?: (text: string) => void;
  onTurnEnd?: (stopReason: string) => void;
}

export function handleStreamLine(
  line: string,
  state: StreamParserState,
  callbacks: StreamParserCallbacks,
): void {
  if (!line.trim()) return;
  let obj: any;
  try {
    obj = JSON.parse(line);
  } catch {
    return;
  }

  switch (obj.type) {
    case 'system': {
      if (obj.subtype === 'init' && obj.session_id) {
        state.sessionId = obj.session_id;
      }
      break;
    }
    case 'assistant': {
      const content = obj.message?.content;
      if (Array.isArray(content)) {
        const text = content
          .filter((b: any) => b.type === 'text')
          .map((b: any) => b.text ?? '')
          .join('');
        if (text) state.textParts.push(text);
      }
      break;
    }
    case 'stream_event': {
      const evt = obj.event;
      if (evt?.type === 'content_block_start' && evt.content_block?.type === 'tool_use') {
        if (evt.content_block.name === 'Skill') {
          state.trackingSkill = true;
          state.skillInputAccum = '';
        }
      } else if (evt?.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
        const delta: string = evt.delta.text;
        if (delta && callbacks.onText) {
          Promise.resolve(callbacks.onText(delta)).catch(() => {});
        }
      } else if (evt?.type === 'content_block_delta' && evt.delta?.type === 'input_json_delta' && state.trackingSkill) {
        state.skillInputAccum += evt.delta.partial_json ?? '';
        try {
          const parsed = JSON.parse(state.skillInputAccum);
          if (parsed.skill) {
            const msg = `\n正在调用 ${parsed.skill} 技能\n\n`;
            if (callbacks.onText) Promise.resolve(callbacks.onText(msg)).catch(() => {});
            state.trackingSkill = false;
          }
        } catch {
          // JSON not complete yet
        }
      } else if (evt?.type === 'content_block_stop') {
        state.trackingSkill = false;
      } else if (evt?.type === 'message_delta' && evt.delta?.stop_reason) {
        if (callbacks.onTurnEnd) Promise.resolve(callbacks.onTurnEnd(evt.delta.stop_reason)).catch(() => {});
      }
      break;
    }
    case 'result': {
      if (obj.result && typeof obj.result === 'string') {
        const combined = state.textParts.join('');
        if (!combined.includes(obj.result)) {
          state.textParts.push(obj.result);
        }
      }
      if (obj.subtype === 'error' || (obj.errors && obj.errors.length > 0)) {
        const errors = obj.errors ?? [obj.error_message ?? 'Unknown error'];
        state.errorMessage = Array.isArray(errors) ? errors.join('; ') : String(errors);
        logger.error('CLI returned error result', { errors });
      }
      break;
    }
    default:
      break;
  }
}

// ---------------------------------------------------------------------------
// CLI 适配器：各 CLI 的参数构建和输出解析
// ---------------------------------------------------------------------------

/**
 * 根据 CLI 类型构建员参数数组。
 * 返回 { spawnArgs, spawnCmd } 中 spawnCmd 是实际要 spawn 的可执行文件，
 * spawnArgs 是传入的参数列表。
 */
function buildCliArgs(options: {
  cli: string;
  cwd: string;
  resume?: string;
  model?: string;
  systemPrompt?: string;
}): { cmd: string; args: string[] } {
  const { cli, cwd, resume, model, systemPrompt } = options;

  if (cli === 'qodercli' || cli === 'claude') {
    // 工作目录通过 spawn 的 cwd 选项传入即可，不需要额外参数。
    // 注意：claude CLI 的 -w 是 --worktree 的简写（创建 git worktree），不是工作目录！
    // 错误地传入 -w <path> 会导致 "not a git repository" 错误。
    const args: string[] = [
      '-p', '-',
      '--output-format', 'stream-json',
      '--dangerously-skip-permissions',
    ];
    if (cli === 'claude') {
      args.push('--verbose', '--include-partial-messages');
    }
    if (resume) args.push('--resume', resume);
    if (model)  args.push('--model', model);
    if (systemPrompt) args.push('--append-system-prompt', systemPrompt);
    // 不传 -w，cwd 由 spawn 的 cwd 选项控制
    return { cmd: cli, args };
  }

  if (cli === 'codex') {
    // codex exec --json --dangerously-bypass-approvals-and-sandbox [-C <cwd>] [-m <model>] [resume <id>] -
    const baseArgs: string[] = [
      '--json',
      '--dangerously-bypass-approvals-and-sandbox',
      '-C', cwd,
    ];
    if (model) baseArgs.push('-m', model);
    if (resume) {
      // codex exec [base-flags] resume <id> -
      return { cmd: 'codex', args: ['exec', ...baseArgs, 'resume', resume, '-'] };
    }
    return { cmd: 'codex', args: ['exec', ...baseArgs, '-'] };
  }

  if (cli === 'opencode') {
    // opencode run --format json --dangerously-skip-permissions [--dir <cwd>] [-m <model>] [-s <id>] -
    const args: string[] = [
      'run',
      '--format', 'json',
      '--dangerously-skip-permissions',
      '--dir', cwd,
    ];
    if (model)  args.push('-m', model);
    if (resume) args.push('--session', resume);
    args.push('-');
    return { cmd: 'opencode', args };
  }

  // 未知 CLI，按 claude 风格处理
  return buildCliArgs({ ...options, cli: 'claude' });
}

/**
 * 解析 codex JSONL 输出行。
 * 事件类型: thread.started / turn.started / item.completed / turn.completed
 */
function handleCodexLine(
  line: string,
  state: StreamParserState,
  callbacks: StreamParserCallbacks,
): void {
  if (!line.trim()) return;
  let obj: any;
  try { obj = JSON.parse(line); } catch { return; }

  switch (obj.type) {
    case 'thread.started':
      if (obj.thread_id) state.sessionId = obj.thread_id;
      break;
    case 'item.completed': {
      const item = obj.item;
      // 只取 agent_message 类型的文本
      if (item?.type === 'agent_message' && typeof item.text === 'string' && item.text) {
        state.textParts.push(item.text);
        if (callbacks.onText) Promise.resolve(callbacks.onText(item.text)).catch(() => {});
      }
      break;
    }
    case 'turn.completed':
      if (callbacks.onTurnEnd) Promise.resolve(callbacks.onTurnEnd('end_turn')).catch(() => {});
      break;
    default:
      break;
  }
}

/**
 * 解析 opencode JSONL 输出行。
 * 事件类型: step_start / text / step_finish / ...
 */
function handleOpencodeLine(
  line: string,
  state: StreamParserState,
  callbacks: StreamParserCallbacks,
): void {
  if (!line.trim()) return;
  let obj: any;
  try { obj = JSON.parse(line); } catch { return; }

  // 任意行可以提取 sessionID
  if (obj.sessionID && !state.sessionId) state.sessionId = obj.sessionID;

  switch (obj.type) {
    case 'text': {
      const text: string = obj.part?.text ?? '';
      if (text) {
        state.textParts.push(text);
        if (callbacks.onText) Promise.resolve(callbacks.onText(text)).catch(() => {});
      }
      break;
    }
    case 'step_finish':
      if (callbacks.onTurnEnd) {
        const reason = obj.part?.reason ?? 'end_turn';
        Promise.resolve(callbacks.onTurnEnd(reason)).catch(() => {});
      }
      break;
    case 'error':
      state.errorMessage = obj.error ?? obj.message ?? 'OpenCode returned an error';
      break;
    default:
      break;
  }
}

// ---------------------------------------------------------------------------
// Core function
// ---------------------------------------------------------------------------

export async function claudeQuery(options: QueryOptions): Promise<QueryResult> {
  const {
    prompt,
    cwd,
    resume,
    model,
    systemPrompt,
    cli = 'qodercli',
    images,
    onText,
    onTurnEnd,
    abortController,
  } = options;

  logger.info("Starting AI CLI query", {
    cli,
    cwd,
    model,
    resume: !!resume,
    hasImages: !!images?.length,
  });

  // 构建 CLI 参数
  const { cmd, args } = buildCliArgs({ cli, cwd, resume, model, systemPrompt });

  // 选择行解析器
  const lineParser: (line: string, state: StreamParserState, callbacks: StreamParserCallbacks) => void =
    cli === 'codex' ? handleCodexLine
    : cli === 'opencode' ? handleOpencodeLine
    : handleStreamLine;  // qodercli / claude 共用同一解析器

  // 处理图片：保存到临时文件并拼接到 prompt
  const tempImagePaths = images?.length ? saveImageTemp(images) : [];
  let fullPrompt = prompt;
  if (tempImagePaths.length > 0) {
    const imageLines = tempImagePaths.map(p => `\n![image](file://${p})`).join('');
    fullPrompt += imageLines;
  }

  // Accumulators
  let child: ChildProcess | undefined;
  let settled = false;

  const QUERY_TIMEOUT_MS = 60 * 60 * 1000;

  return new Promise<QueryResult>((resolve) => {
    const finish = (result: QueryResult) => {
      if (settled) return;
      settled = true;
      cleanupTempFiles(tempImagePaths);
      resolve(result);
    };

    try {
      child = spawn(cmd, args, {
        cwd,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      finish({ text: '', sessionId: '', error: `Failed to spawn ${cmd}: ${msg}` });
      return;
    }

    // Write prompt to stdin and close
    child.stdin!.write(fullPrompt);
    child.stdin!.end();

    // Timeout
    const timeoutId = setTimeout(() => {
      logger.warn('Qoder CLI query timed out, killing process');
      child!.kill('SIGTERM');
      const partialText = parserState.textParts.join('\n').trim();
      finish({
        text: partialText,
        sessionId: parserState.sessionId,
        error: partialText ? undefined : 'Qoder query timed out after 60 minutes',
      });
    }, QUERY_TIMEOUT_MS);

    // Abort handling
    const onAbort = () => {
      logger.info('Qoder CLI query aborted');
      child!.kill('SIGTERM');
      const partialText = parserState.textParts.join('\n').trim();
      finish({ text: partialText, sessionId: parserState.sessionId });
    };
    abortController?.signal.addEventListener('abort', onAbort, { once: true });

    // Collect stderr
    const stderrParts: string[] = [];
    child.stderr!.setEncoding('utf8');
    child.stderr!.on('data', (chunk: string) => {
      stderrParts.push(chunk);
    });

    // Parse NDJSON from stdout (logic in handleStreamLine for testability)
    const parserState: StreamParserState = {
      sessionId: '',
      textParts: [],
      trackingSkill: false,
      skillInputAccum: '',
    };
    const parserCallbacks: StreamParserCallbacks = { onText, onTurnEnd };

    const rl = createInterface({ input: child.stdout! });
    rl.on('line', (line: string) => {
      lineParser(line, parserState, parserCallbacks);
    });

    // Handle process exit
    child.on('close', (code: number | null) => {
      clearTimeout(timeoutId);
      abortController?.signal.removeEventListener('abort', onAbort);

      if (code !== 0 && code !== null && !parserState.textParts.length && !parserState.errorMessage) {
        const stderr = stderrParts.join('').trim();
        parserState.errorMessage = stderr || `${cli} exited with code ${code}`;
        logger.error('AI CLI exited with error', { cli, code, stderr: stderr.slice(0, 500) });
      }

      const fullText = parserState.textParts.join('\n').trim();

      if (!fullText && !parserState.errorMessage) {
        parserState.errorMessage = `${cli} returned an empty response.`;
      }

      logger.info("AI CLI query completed", {
        sessionId: parserState.sessionId,
        textLength: fullText.length,
        hasError: !!parserState.errorMessage,
      });

      finish({
        text: fullText,
        sessionId: parserState.sessionId,
        error: parserState.errorMessage,
      });
    });

    child.on('error', (err: Error) => {
      clearTimeout(timeoutId);
      abortController?.signal.removeEventListener('abort', onAbort);
      finish({ text: '', sessionId: parserState.sessionId, error: `Failed to spawn ${cmd}: ${err.message}` });
    });
  });
}
