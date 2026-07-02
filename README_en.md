# WeChat AI Bridge

<p align="center">
  <strong>Chat with AI in WeChat, just like texting a friend</strong>
</p>

<p align="center">
  <a href="https://github.com/Wechat-ggGitHub/wechat-claude-code/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License: MIT"></a>
  <a href="README.md"><img src="https://img.shields.io/badge/Lang-中文-lightgrey?style=flat-square" alt="中文"></a>
</p>

Scan a QR code to bind your WeChat, and a new "friend" appears in your contacts. Send it a message — it gets forwarded to the AI CLI running on your computer, and the reply streams back to WeChat in real time. Supports text, images, voice, and files.

## Highlights

| | |
|---|---|
| **Multi-AI support** | Works with Qoder CLI, Claude Code, Codex CLI, and OpenCode. Switch between them anytime with a WeChat command. |
| **Scan and go** | No account signup, no server deployment. Scan a QR code and you're done in a minute. All data stays on your machine. |
| **Clean messages** | Only key info gets pushed — progress, results, key decisions. Tool calls and intermediate noise are filtered out automatically. |
| **"Typing..." indicator** | WeChat shows a typing indicator while the AI is working, so you always know it's on it. |
| **Two-way files** | Send images, Word docs, PDFs for AI to analyze. Files the AI generates get pushed directly to WeChat — no need to go back to your computer. |
| **Timeout reassurance** | Task taking longer than 5 minutes? You'll get an automatic message letting you know it's still working. |

## Supported AI CLIs

The service auto-detects installed CLIs at startup, in priority order:

| CLI | How to install |
|-----|----------------|
| **Qoder CLI** (`qodercli`) | Download [Qoder](https://qoder.app) and sign in |
| **Claude Code** (`claude`) | `npm install -g @anthropic-ai/claude-code` |
| **Codex CLI** (`codex`) | `npm install -g @openai/codex` |
| **OpenCode** (`opencode`) | `curl -fsSL https://opencode.ai/install | bash` |

> You only need one. Switch between them anytime with `/cli <name>` in WeChat.

## Install

```bash
git clone https://github.com/Wechat-ggGitHub/wechat-claude-code.git
cd wechat-claude-code && npm install && npm run build
```

## Quick Start

### 1. Bind WeChat

```bash
npm run setup
```

A QR code will pop up — scan it with WeChat. On first run, you'll be guided to choose an AI CLI.

### 2. Start the service

```bash
npm run daemon -- start
```

On macOS, this registers a launchd agent for auto-start on boot and auto-restart on crash.

### 3. Start chatting

Open WeChat and send a message to your new "friend".

### Manage the service

```bash
npm run daemon -- status   # Check if running
npm run daemon -- stop     # Stop the service
npm run daemon -- restart  # Restart (after code updates)
npm run daemon -- logs     # View recent logs
```

## WeChat Commands

Send these directly in the WeChat chat:

| Command | Description |
|---------|-------------|
| `/help` | Show available commands |
| `/cli [name]` | View or switch AI CLI (qodercli / claude / codex / opencode) |
| `/clear` | Clear current session, start fresh |
| `/stop` | Stop current task |
| `/model <name>` | Switch model |
| `/prompt <text>` | Set a system prompt (e.g. "reply in Chinese") |
| `/cwd <path>` | Switch working directory |
| `/skills` | List installed Skills |
| `/status` | View current session state |
| `/history [n]` | View recent chat history |
| `/compact` | Compact context, start a new CLI session |
| `/reset` | Full reset including working directory |
| `/undo [n]` | Remove last N messages from history |
| `/send <path>` | Send a local file to the AI |
| `/<skill> [args]` | Trigger any installed Skill |

### CLI switching examples

```
/cli              → Show current CLI and available options
/cli qodercli     → Switch to Qoder CLI (takes effect immediately)
/cli claude       → Switch to Claude Code
/cli codex        → Switch to Codex CLI
/cli opencode     → Switch to OpenCode
```

## How It Works

```
WeChat (phone) ←→ ilink Bot API ←→ Node.js daemon ←→ AI CLI (local)
```

The daemon long-polls WeChat for new messages, forwards them to the local AI CLI, and streams replies back to WeChat. Everything runs on your own machine.

## Prerequisites

- Node.js >= 18
- macOS or Linux
- A personal WeChat account
- At least one supported AI CLI installed and authenticated

## Data Directory

All data is stored in `~/.wechat-qoder-code/`:

```
~/.wechat-qoder-code/
├── accounts/       # WeChat account credentials
├── config.json     # Global config (includes cli field)
├── sessions/       # Session data
└── logs/           # Rotating logs (daily, 30-day retention)
```

### config.json example

```json
{
  "workingDirectory": "~/Documents/workspace",
  "cli": "qodercli",
  "model": "claude-sonnet-4-5",
  "systemPrompt": "Reply in English"
}
```

Valid values for `cli`: `qodercli` / `claude` / `codex` / `opencode`. Leave empty to auto-select the first available one.

## License

[MIT](LICENSE)
# WeChat Claude Code Bridge

<p align="center">
  <strong>Chat with Claude Code in WeChat, just like texting a friend</strong>
</p>

<p align="center">
  <a href="https://github.com/Wechat-ggGitHub/wechat-claude-code/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License: MIT"></a>
  <a href="https://skills.sh/Wechat-ggGitHub/wechat-claude-code"><img src="https://img.shields.io/badge/skills.sh-view_page-blue?style=flat-square" alt="skills.sh"></a>
  <a href="README.md"><img src="https://img.shields.io/badge/Lang-中文-lightgrey?style=flat-square" alt="中文"></a>
</p>

Scan a QR code to bind your WeChat, and a new "friend" appears in your contacts. Send it a message — it gets forwarded to Claude Code running on your computer, and the reply streams back to WeChat in real time. Supports text, images, voice, and files.

---

## Highlights

| | |
|---|---|
| **Scan and go** | No account signup, no server deployment. Scan a QR code and you're done in a minute. All data stays on your machine. |
| **Clean messages** | Only key info gets pushed — progress, results, key decisions. Tool calls and intermediate noise are filtered out automatically. |
| **"Typing..." indicator** | WeChat shows a typing indicator while Claude is working, so you always know it's on it. |
| **Consistent experience** | Mobile and desktop Claude Code behave identically — same orchestration, same output. Not two disconnected AIs. |
| **Two-way files** | Send images, Word docs, PDFs for Claude to analyze. Files Claude generates get pushed directly to WeChat — no need to go back to your computer. |
| **Timeout reassurance** | Task taking longer than 5 minutes? You'll get an automatic message letting you know it's still working. |

---

## Install

**Option 1: skills CLI (recommended)**

```bash
npx skills add Wechat-ggGitHub/wechat-claude-code
```

The first time you trigger the skill, it will automatically clone the source and install dependencies.

**Option 2: Manual clone**

```bash
git clone https://github.com/Wechat-ggGitHub/wechat-claude-code.git ~/.claude/skills/wechat-claude-code
cd ~/.claude/skills/wechat-claude-code && npm install
```

## Quick Start

### 1. Bind WeChat

```bash
cd ~/.claude/skills/wechat-claude-code
npm run setup
```

A QR code will pop up — scan it with WeChat.

### 2. Start the service

```bash
npm run daemon -- start
```

On macOS, this registers a launchd agent for auto-start on boot and auto-restart on crash.

### 3. Start chatting

Open WeChat and send a message to your new "friend".

### Manage the service

```bash
npm run daemon -- status   # Check if running
npm run daemon -- stop     # Stop the service
npm run daemon -- restart  # Restart (after code updates)
npm run daemon -- logs     # View recent logs
```

---

## WeChat Commands

Send these directly in the WeChat chat:

| Command | Description |
|---------|-------------|
| `/help` | Show available commands |
| `/clear` | Clear current session, start fresh |
| `/stop` | Stop current task |
| `/model <name>` | Switch Claude model |
| `/prompt <text>` | Set a system prompt (e.g. "reply in Chinese") |
| `/cwd <path>` | Switch working directory |
| `/skills` | List installed Skills |
| `/status` | View current session state |
| `/history [n]` | View recent chat history |
| `/compact` | Compact context, start a new CLI session |
| `/reset` | Full reset including working directory |
| `/undo [n]` | Remove last N messages from history |
| `/<skill> [args]` | Trigger any installed Skill |

---

## How It Works

```
WeChat (phone) ←→ ilink Bot API ←→ Node.js daemon ←→ Claude Code CLI (local)
```

The daemon long-polls WeChat for new messages, forwards them to the local `claude` CLI, and streams replies back to WeChat. Everything runs on your own machine.

---

## Roadmap

- **Message queue optimization** — Consecutive messages can produce mixed-up replies. Working on a better queuing strategy. Ideas welcome.
- **Prevent sleep** — Use macOS `caffeinate` to keep the system awake, so closing the lid doesn't interrupt the service.
- **Resume desktop session** — Chat on your computer for a while, then continue the same session from WeChat on the go. Same workspace, same context.

---

## Prerequisites

- Node.js >= 18
- macOS or Linux
- A personal WeChat account
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI installed and authenticated

> **Note:** Claude Code supports third-party API providers (OpenRouter, AWS Bedrock, etc.) — set `ANTHROPIC_BASE_URL` and `ANTHROPIC_API_KEY` accordingly.

## Data Directory

All data is stored in `~/.wechat-claude-code/`:

```
~/.wechat-claude-code/
├── accounts/       # WeChat account credentials
├── config.json     # Global config
├── sessions/       # Session data
└── logs/           # Rotating logs (daily, 30-day retention)
```

## License

[MIT](LICENSE)
