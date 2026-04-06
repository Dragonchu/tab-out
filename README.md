# Tab Out

**Keep tabs on your tabs.**

Tab Out replaces your Chrome new tab page with a mission dashboard: it groups your open tabs into named "missions" using AI, so you can see exactly what you're working on — and close what you're not.

---

## Install with a coding agent

Send your coding agent (Claude Code, Cursor, Windsurf, etc.) this repo URL and say "install this":

```
https://github.com/zarazhangrui/tab-out
```

The agent will walk you through choosing your LLM provider and setting up your API key.

---

## What it does

- **Groups your open tabs into missions** using AI — tabs about the same topic cluster together automatically
- **Shows them on your new tab page** so every new tab is a reminder of what's actually open
- **Lets you close tabs** with a satisfying swoosh and confetti when a mission is done
- **Detects duplicate tabs** so you don't end up with five copies of the same page
- **Works with any LLM** — DeepSeek (recommended, cheapest), OpenAI, Groq, Together, Ollama (fully local), or any OpenAI-compatible API
- **Customizable prompts** — teach the AI your personal grouping preferences
- **Works entirely locally** — your browsing data never leaves your machine; the AI call sends only tab titles and URLs

---

## Prerequisites

- **macOS, Windows, or Linux** — auto-start works on all three platforms
- **Node.js 18+** — [download here](https://nodejs.org)
- **Google Chrome**
- **An LLM API key** — we recommend [DeepSeek](https://platform.deepseek.com) (fractions of a cent per call), but any OpenAI-compatible provider works

---

## Quick Setup

**1. Clone the repo**

```bash
git clone https://github.com/zarazhangrui/tab-out.git
cd tab-out
```

**2. Install dependencies**

```bash
npm install
```

**3. Run the install script**

```bash
npm run install-service
```

This creates the data directory, writes a default config file, and installs a platform-specific auto-start service (macOS Launch Agent, Linux systemd user service, or Windows Startup script) so the server runs automatically on login.

**4. Add your API key**

Open `~/.mission-control/config.json` and add your key:

```json
{
  "apiKey": "sk-your-key-here"
}
```

That's it for DeepSeek (the default). For other providers, see [Configuration](#configuration) below.

**5. Start the server**

```bash
npm start
```

(After the Launch Agent is loaded, this happens automatically on login.)

**6. Load the Chrome extension**

1. Open Chrome and go to `chrome://extensions`
2. Toggle on **Developer mode** (top-right corner)
3. Click **Load unpacked**
4. Select the `extension/` folder inside this repo

**7. Open a new tab**

You'll see Tab Out.

---

## How it works

Tab Out has two modes:

| Mode | What happens |
|------|-------------|
| **Static (default)** | Opens instantly. Tabs grouped by domain. No AI call, no cost. |
| **AI mode** | Click "Organize with AI". Your LLM clusters tabs into named missions with a witty personal message. Results are cached — same tabs = instant load next time. |

The extension badge on your toolbar shows your current mission count, color-coded (green / amber / red).

---

## Configuration

The config file lives at `~/.mission-control/config.json`:

```json
{
  "apiKey": "",
  "baseUrl": "https://api.deepseek.com",
  "model": "deepseek-chat",
  "port": 3456,
  "refreshIntervalMinutes": 30,
  "batchSize": 200,
  "historyDays": 7,
  "customPromptRules": ""
}
```

### LLM Provider Settings

| Field | Default | What it does |
|-------|---------|-------------|
| `apiKey` | *(empty)* | Your API key (required for cloud providers, optional for Ollama) |
| `baseUrl` | `https://api.deepseek.com` | Your LLM provider's API endpoint |
| `model` | `deepseek-chat` | Which model to use |

Tab Out works with **any OpenAI-compatible API** — just set the `baseUrl` to your provider's endpoint and pick a cheap/fast model (this is classification, not creative writing). DeepSeek, OpenAI, Grok, Kimi, GLM, ByteDance Seed, Minimax, OpenRouter, Ollama, and many others all work.

### Custom Grouping Rules

The `customPromptRules` field lets you teach the AI your personal preferences for how tabs should be grouped. This text is appended to the clustering prompt.

**Examples:**

```json
{
  "customPromptRules": "Always group my Google Docs tabs by project name, not by domain."
}
```

```json
{
  "customPromptRules": "Treat all social media (X, Reddit, LinkedIn) as one mission called 'Doom Scrolling'. Group GitHub tabs by repository."
}
```

```json
{
  "customPromptRules": "I'm a student. Group tabs by course/subject. Anything on Canvas or Gradescope is schoolwork."
}
```

### Other Settings

| Field | Default | What it does |
|-------|---------|-------------|
| `port` | `3456` | Local port for the dashboard server |
| `refreshIntervalMinutes` | `30` | How often to re-analyze browsing history |
| `batchSize` | `200` | History entries per analysis batch |
| `historyDays` | `7` | How far back to look in Chrome history |

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Server | Node.js + Express |
| Database | better-sqlite3 |
| AI clustering | Any OpenAI-compatible API |
| Chrome extension | Manifest V3 |
| Auto-start | macOS Launch Agent / Linux systemd / Windows Startup |

---

## Project structure

```
tab-out/
├── extension/        # Chrome extension (new tab override)
│   ├── manifest.json
│   ├── newtab.html   # iframe shell that loads the dashboard
│   ├── newtab.js     # postMessage bridge to chrome.tabs API
│   └── background.js # Service worker for toolbar badge
├── dashboard/        # Dashboard UI served by Express
│   ├── index.html
│   ├── style.css
│   └── app.js
├── server/           # Express backend
│   ├── index.js      # Entry point + scheduler
│   ├── config.js     # Config loader
│   ├── db.js         # SQLite database
│   ├── routes.js     # API endpoints
│   └── clustering.js # LLM integration
└── scripts/
    └── install.js    # One-time setup
```

---

## License

MIT
