# WeChat AI Bridge

<p align="center">
  <strong>在微信里和 AI 聊天，就像发消息给朋友一样</strong>
</p>

<p align="center">
  <a href="https://github.com/Wechat-ggGitHub/wechat-claude-code/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License: MIT"></a>
  <a href="README_en.md"><img src="https://img.shields.io/badge/Lang-English-lightgrey?style=flat-square" alt="English"></a>
</p>

扫码绑定微信后，你的微信里会多出一个好友。给它发消息，消息会自动转发给你电脑上运行的 AI CLI，回复也会实时推送到微信。支持文字、图片、语音、文件的收发。

## 核心亮点

| | |
|---|---|
| **多 AI 支持** | 同时支持 Qoder CLI、Claude Code、Codex CLI、OpenCode，可随时通过微信指令一键切换。 |
| **扫码即用** | 不用注册账号，不用部署服务器。微信扫码绑定，一分钟搞定。数据全在本地，隐私有保障。 |
| **消息不刷屏** | 只推送核心信息——进度、结果、关键决策。工具调用、中间过程等噪音自动过滤，阅读体验清爽。 |
| **"对方正在输入中..."** | AI 在处理任务时，微信顶部会显示输入状态，随时感知它在干活。 |
| **文件双向收发** | 发图片、Word、PDF 给 AI 分析；AI 生成的文件也会直接推送到微信，不用回到电脑前查看。 |
| **超时安抚** | 任务超过 5 分钟没响应？它会自动发一条消息告诉你还在干，不会让你对着空白聊天框干等。 |

## 支持的 AI CLI

启动时自动检测本机已安装的 CLI，优先级从高到低：

| CLI | 安装方式 |
|-----|---------|
| **Qoder CLI** (`qodercli`) | 下载 [Qoder](https://qoder.app) 应用并登录 |
| **Claude Code** (`claude`) | `npm install -g @anthropic-ai/claude-code` |
| **Codex CLI** (`codex`) | `npm install -g @openai/codex` |
| **OpenCode** (`opencode`) | `curl -fsSL https://opencode.ai/install | bash` |

> 只需安装其中一个即可正常使用。通过微信发送 `/cli <名称>` 可随时切换。

## 快速安装

**手动克隆：**

```bash
git clone https://github.com/Wechat-ggGitHub/wechat-claude-code.git
cd wechat-claude-code && npm install && npm run build
```

## 快速开始

### 1. 扫码绑定

```bash
npm run setup
```

弹出二维码，用微信扫码绑定。首次运行会引导选择要使用的 AI CLI。

### 2. 启动服务

```bash
npm run daemon -- start
```

macOS 下自动注册 launchd，开机自启、崩溃自动重启。

### 3. 开始聊天

打开微信，给你新出现的那个"好友"发条消息试试。

### 管理服务

```bash
npm run daemon -- status   # 查看运行状态
npm run daemon -- stop     # 停止服务
npm run daemon -- restart  # 重启服务（更新代码后使用）
npm run daemon -- logs     # 查看日志
```

## 微信端命令

直接在微信聊天中发送即可：

| 命令 | 说明 |
|------|------|
| `/help` | 显示帮助 |
| `/cli [名称]` | 查看或切换 AI CLI（qodercli / claude / codex / opencode） |
| `/clear` | 清除当前会话，开始新对话 |
| `/stop` | 停止当前任务 |
| `/model <名称>` | 切换模型 |
| `/prompt <内容>` | 设置系统提示词（如"用中文回答"） |
| `/cwd <路径>` | 切换工作目录 |
| `/skills` | 查看已安装的 Skill |
| `/status` | 查看当前会话状态 |
| `/history [数量]` | 查看最近对话记录 |
| `/compact` | 压缩上下文，开始新 CLI 会话 |
| `/reset` | 完全重置（包括工作目录等设置） |
| `/undo [数量]` | 撤销最近几条对话 |
| `/send <路径>` | 发送本地文件给 AI |
| `/<skill> [参数]` | 触发任意已安装的 Skill |

### CLI 切换示例

```
/cli              → 查看当前使用的 CLI 及可用列表
/cli qodercli     → 切换到 Qoder CLI（立即生效）
/cli claude       → 切换到 Claude Code
/cli codex        → 切换到 Codex CLI
/cli opencode     → 切换到 OpenCode
```

## 工作原理

```
微信（手机） ←→ ilink Bot API ←→ Node.js 守护进程 ←→ AI CLI（本地）
```

守护进程通过长轮询监听微信消息，转发给本地 AI CLI 处理，回复实时流式推送回微信。全程跑在你自己电脑上。

## 前置条件

- Node.js >= 18
- macOS 或 Linux
- 个人微信账号
- 至少安装一个受支持的 AI CLI 并完成认证

## 数据目录

所有数据存储在 `~/.wechat-qoder-code/`：

```
~/.wechat-qoder-code/
├── accounts/       # 微信账号凭证
├── config.json     # 全局配置（含 cli 字段）
├── sessions/       # 会话数据
└── logs/           # 运行日志（每日轮转，保留 30 天）
```

### config.json 示例

```json
{
  "workingDirectory": "~/Documents/workspace",
  "cli": "qodercli",
  "model": "claude-sonnet-4-5",
  "systemPrompt": "请用中文回答"
}
```

`cli` 字段可选值：`qodercli` / `claude` / `codex` / `opencode`，留空时自动选择第一个可用的。

## License

[MIT](LICENSE)
# WeChat Claude Code Bridge

<p align="center">
  <strong>Chat with Claude Code in WeChat, just like texting a friend</strong>
</p>

<p align="center">
  <a href="https://github.com/Wechat-ggGitHub/wechat-claude-code/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License: MIT"></a>
  <a href="https://skills.sh/Wechat-ggGitHub/wechat-claude-code"><img src="https://img.shields.io/badge/skills.sh-view_page-blue?style=flat-square" alt="skills.sh"></a>
  <a href="README_en.md"><img src="https://img.shields.io/badge/Lang-English-lightgrey?style=flat-square" alt="English"></a>
</p>

扫码绑定微信后，你的微信里会多出一个好友。给它发消息，消息会自动转发给你电脑上运行的 Claude Code，回复也会实时推送到微信。支持文字、图片、语音、文件的收发。

<img width="3018" height="1216" alt="ScreenShot_2026-06-10_211251_410" src="https://github.com/user-attachments/assets/2ba4c53b-9c63-4ffd-bd0a-71935a6eabec" />

## 核心亮点
| | |
|---|---|
| **扫码即用** | 不用注册账号，不用部署服务器。微信扫码绑定，一分钟搞定。数据全在本地，隐私有保障。 |
| **消息不刷屏** | 只推送核心信息——进度、结果、关键决策。工具调用、中间过程等噪音自动过滤，阅读体验清爽。 |
| **"对方正在输入中..."** | Claude 在处理任务时，微信顶部会显示输入状态，随时感知它在干活。 |
| **电脑手机体验一致** | 手机端和电脑端 Claude Code 行为完全相同——同样的编排逻辑、同样的输出效果。不是两个割裂的 AI。 |
| **文件双向收发** | 发图片、Word、PDF 给 Claude 分析；Claude 生成的文件也会直接推送到微信，不用回到电脑前查看。 |
| **超时安抚** | 任务超过 5 分钟没响应？它会自动发一条消息告诉你还在干，不会让你对着空白聊天框干等。 |

## 快速安装

**方式一：skills CLI（推荐）**

```bash
npx skills add Wechat-ggGitHub/wechat-claude-code
```

首次在对话中触发时，会自动克隆项目源码并安装依赖。

**方式二：手动克隆**

```bash
git clone https://github.com/Wechat-ggGitHub/wechat-claude-code.git ~/.claude/skills/wechat-claude-code
cd ~/.claude/skills/wechat-claude-code && npm install
```

## 快速开始

### 1. 扫码绑定

```bash
cd ~/.claude/skills/wechat-claude-code
npm run setup
```

弹出二维码，用微信扫码。

### 2. 启动服务

```bash
npm run daemon -- start
```

macOS 下自动注册 launchd，开机自启、崩溃自动重启。

### 3. 开始聊天

打开微信，给你新出现的那个"好友"发条消息试试。

### 管理服务

```bash
npm run daemon -- status   # 查看运行状态
npm run daemon -- stop     # 停止服务
npm run daemon -- restart  # 重启服务（更新代码后使用）
npm run daemon -- logs     # 查看日志
```

## 微信端命令

直接在微信聊天中发送即可：

| 命令 | 说明 |
|------|------|
| `/help` | 显示帮助 |
| `/clear` | 清除当前会话，开始新对话 |
| `/stop` | 停止当前任务 |
| `/model <名称>` | 切换 Claude 模型 |
| `/prompt <内容>` | 设置系统提示词（如"用中文回答"） |
| `/cwd <路径>` | 切换工作目录 |
| `/skills` | 查看已安装的 Skill |
| `/status` | 查看当前会话状态 |
| `/history [数量]` | 查看最近对话记录 |
| `/compact` | 压缩上下文，开始新 CLI 会话 |
| `/reset` | 完全重置（包括工作目录等设置） |
| `/undo [数量]` | 撤销最近几条对话 |
| `/<skill> [参数]` | 触发任意已安装的 Skill |

## 工作原理

```
微信（手机） ←→ ilink Bot API ←→ Node.js 守护进程 ←→ Claude Code CLI（本地）
```

守护进程通过长轮询监听微信消息，转发给本地 `claude` CLI 处理，回复实时流式推送回微信。全程跑在你自己电脑上。

## 后续计划

- **消息队列优化** — 连续发多条指令时，回复容易串。正在研究更好的队列策略，也欢迎讨论。
- **电脑休眠不中断** — 利用 macOS 的 `caffeinate` 命令阻止系统睡眠，合上盖子也能响应微信消息。
- **接续电脑会话** — 在电脑上聊了很久，出门想接着聊。计划支持从当前电脑端的 Claude Code 会话直接续聊，工作空间和上下文保持一致。

## 前置条件

- Node.js >= 18
- macOS 或 Linux
- 个人微信账号
- 已安装 [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI 并完成认证

> **提示：** Claude Code 支持第三方 API 提供商（OpenRouter、AWS Bedrock 等），设置 `ANTHROPIC_BASE_URL` 和 `ANTHROPIC_API_KEY` 即可。

## 数据目录

所有数据存储在 `~/.wechat-claude-code/`：

```
~/.wechat-claude-code/
├── accounts/       # 微信账号凭证
├── config.json     # 全局配置
├── sessions/       # 会话数据
└── logs/           # 运行日志（每日轮转，保留 30 天）
```

## License

[MIT](LICENSE)
