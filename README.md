# wechat-claude-code

**English** | [中文](README_zh.md)

A [Claude Code](https://claude.ai/claude-code) Skill that bridges personal WeChat to your local Claude Code. Chat with Claude from your phone via WeChat — text, images, slash commands, all supported.

## Features

- **Clean output** — only Claude's text responses are shown in WeChat, tool calls run silently in the background
- **Typing indicator** — WeChat shows "typing..." while Claude is processing
- **Interrupt support** — send a new message mid-query to abort and redirect Claude
- **System prompt** — set a persistent prompt via `/prompt` (e.g. "Reply in Chinese")
- **Auto-approved tool access** — all tools run without manual approval for seamless operation
- Text conversation with Claude Code through WeChat
- Voice messages — speech-to-text automatically via WeChat
- File support — download, decrypt, and forward files for Claude to read and analyze
- Image recognition — send photos for Claude to analyze
- Slash commands — `/help`, `/clear`, `/model`, `/prompt`, `/status`, `/skills`, and more
- Launch any installed Claude Code skill from WeChat
- Cross-platform — macOS (launchd), Linux (systemd + nohup fallback)
- Session persistence — resume conversations across messages
- Rate-limit safe — proactive per-user send throttling with automatic retry

## Prerequisites

- Node.js >= 18
- macOS or Linux
- Personal WeChat account (QR code binding required)
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI installed and authenticated
  > **Note:** Claude Code supports third-party API providers (e.g. OpenRouter, AWS Bedrock, custom OpenAI-compatible endpoints) — set `ANTHROPIC_BASE_URL` and `ANTHROPIC_API_KEY` accordingly.

## Installation

Clone into your Claude Code skills directory:

```bash
git clone https://github.com/Wechat-ggGitHub/wechat-claude-code.git ~/.claude/skills/wechat-claude-code
cd ~/.claude/skills/wechat-claude-code
npm install
```

`postinstall` automatically compiles TypeScript via `tsc`.

## Quick Start

### 1. Setup (first time only)

Scan QR code to bind your WeChat account:

```bash
cd ~/.claude/skills/wechat-claude-code
npm run setup
```

A QR code image will open — scan it with WeChat. Then configure your working directory.

### 2. Start the daemon

```bash
npm run daemon -- start
```

- **macOS**: registers a launchd agent for auto-start and auto-restart
- **Linux**: uses systemd user service (falls back to nohup if systemd unavailable)

### 3. Chat in WeChat

Send any message in WeChat to start chatting with Claude Code.

### 4. Manage the service

```bash
npm run daemon -- status   # Check if running
npm run daemon -- stop     # Stop the daemon
npm run daemon -- restart  # Restart (after code updates)
npm run daemon -- logs     # View recent logs
```

## WeChat Commands

| Command | Description |
|---------|-------------|
| `/help` | Show available commands |
| `/clear` | Clear current session (start fresh) |
| `/reset` | Full reset including working directory |
| `/stop` | Stop current query and discard queued messages |
| `/model <name>` | Switch Claude model |
| `/prompt [text]` | View or set a system prompt appended to every query |
| `/status` | View current session state |
| `/cwd [path]` | View or switch working directory |
| `/skills` | List installed Claude Code skills |
| `/history [n]` | View last N chat messages |
| `/compact` | Start a new CLI session (clear token context) |
| `/undo [n]` | Remove last N messages from history |
| `/version` | Show version info |
| `/<skill> [args]` | Trigger any installed skill |

## How It Works

```
WeChat (phone) ←→ ilink bot API ←→ Node.js daemon ←→ Claude Code CLI (local)
```

- The daemon long-polls WeChat's ilink bot API for new messages
- Messages are forwarded to Claude Code by spawning the `claude` CLI with `--output-format stream-json`
- Tool calls run silently in the background while Claude works
- Claude's text output is streamed to WeChat in real-time; tool calls run silently
- Responses are sent back to WeChat with automatic rate-limit retry
- Platform-native service management keeps the daemon running (launchd on macOS, systemd/nohup on Linux)

## Data

All data is stored in `~/.wechat-claude-code/`:

```
~/.wechat-claude-code/
├── accounts/       # WeChat account credentials (one JSON per account)
├── config.json     # Global config (working directory, model, system prompt)
├── sessions/       # Session data (one JSON per account)
├── get_updates_buf # Message polling sync buffer
└── logs/           # Rotating logs (daily, 30-day retention)
```

## Development

```bash
npm run dev    # Watch mode — auto-compile on TypeScript changes
npm run build  # Compile TypeScript
```

## License

[MIT](LICENSE)
