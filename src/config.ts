import { readFileSync, writeFileSync, mkdirSync, chmodSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { DEFAULT_WORKING_DIR } from "./constants.js";

export interface Config {
  workingDirectory: string;
  model?: string;
  systemPrompt?: string;
  /** 偏好使用的 CLI：'qodercli' | 'claude'（留空则自动检测，优先 qodercli） */
  cli?: string;
}

const CONFIG_DIR = join(homedir(), ".wechat-qoder-code");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

const DEFAULT_CONFIG: Config = {
  workingDirectory: DEFAULT_WORKING_DIR,
};

export function loadConfig(): Config {
  try {
    const content = readFileSync(CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(content);
    const config: Config = {
      workingDirectory: parsed.workingDirectory || DEFAULT_CONFIG.workingDirectory,
      model: parsed.model,
      systemPrompt: parsed.systemPrompt,
      cli: parsed.cli,
    };
    mkdirSync(config.workingDirectory, { recursive: true });
    return config;
  } catch {
    const config = { ...DEFAULT_CONFIG };
    mkdirSync(config.workingDirectory, { recursive: true });
    return config;
  }
}

export function saveConfig(config: Config): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  const data: Record<string, string> = {
    workingDirectory: config.workingDirectory,
  };
  if (config.model) data.model = config.model;
  if (config.systemPrompt) data.systemPrompt = config.systemPrompt;
  if (config.cli) data.cli = config.cli;
  writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
  if (process.platform !== "win32") {
    chmodSync(CONFIG_PATH, 0o600);
  }
}
