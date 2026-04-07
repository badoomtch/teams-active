<div align="center">
  <img src="active-logo.png" width="96" height="96" alt="Teams Active icon" />
  <h1>Teams Active</h1>
  <p>Keep your Microsoft Teams web status permanently <strong>Available</strong> — no more ghost away status.</p>

  ![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)
  ![Manifest V3](https://img.shields.io/badge/Manifest-V3-brightgreen)
  ![License MIT](https://img.shields.io/badge/License-MIT-blue)
</div>

---

## What it does

Microsoft Teams web automatically marks you as **Away** after 5 minutes of inactivity — even if you're actively working in another window or tab. Teams Active prevents this by running a lightweight background process that keeps your status locked to **Available**.

It works entirely within your browser. Nothing is installed on your machine, no external servers are contacted, and your Teams credentials are never touched.

## Features

- **One-click toggle** — enable or disable instantly from the extension popup
- **Work hours schedule** — only active between times you set (e.g. 08:00–17:00)
- **Days of week** — skip weekends or any days you choose
- **Lunch break** — automatically pauses during your lunch window
- **Human-like timing** — randomises activity intervals so the pattern looks natural
- **Activity interval** — control how frequently pings are sent (1–10 min)
- **Live tab counter** — see how many Teams tabs are currently being kept active

## How it works

Teams uses several browser APIs to detect idle users:

| API | What Teams detects | How Teams Active blocks it |
|---|---|---|
| `IdleDetector` | System-level inactivity (screen lock, no OS input) | Replaced with a mock that always reports `active / unlocked` |
| Page Visibility API | Tab is hidden or backgrounded | `document.hidden` and `document.visibilityState` are overridden to always return `visible` |
| `visibilitychange` event | Tab loses focus | Event listeners for this event are silently dropped |
| DOM activity events | No mouse/keyboard input on the page | Synthetic `mousemove`, `mousedown`, `keydown`, `touchstart`, `scroll` events are dispatched every 60 seconds |
| Page Lifecycle `freeze` | Chrome suspends the tab | `freeze` events are intercepted and stopped |
| `document.hasFocus()` | Tab is not the active window | Overridden to always return `true` |

All API overrides run at `document_start` in the page's own JavaScript context (Manifest V3 `world: "MAIN"`), so they are in place **before Teams loads** — Teams cannot detect or work around them.

## Install

> The extension is not yet on the Chrome Web Store. Install it manually in under a minute.

1. Download the latest release zip from [Releases](../../releases) and extract it, **or** clone this repo
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** (toggle in the top-right)
4. Click **Load unpacked**
5. Select the extracted folder
6. Open [Microsoft Teams web](https://teams.microsoft.com) and click the extension icon to enable it

## Usage

Click the **Teams Active** icon in your toolbar:

- Toggle **Keep Active** on
- Optionally enable **Work hours only** and set your start/end times
- Select which days of the week it should run
- Optionally enable **Lunch break** to pause it during lunch
- Adjust the **Activity interval** slider — lower = more frequent pings, higher = less CPU/battery use. Anything under 5 minutes works; the default of 2 minutes gives comfortable headroom against Teams' 5-minute idle timeout.

## Privacy

- No data is collected, stored, or transmitted
- No external network requests are made
- The extension only has access to `teams.microsoft.com` and `teams.live.com`
- All logic runs locally in your browser

## Browser support

| Browser | Support |
|---|---|
| Chrome 111+ | ✅ Full support |
| Edge 111+ | ✅ Full support (Chromium-based) |
| Firefox | ❌ Not supported (Manifest V3 `world: "MAIN"` not available) |

## License

MIT — see [LICENSE](LICENSE)
