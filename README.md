<div align="center">

# voice-clip

**iPhone voice → Mac clipboard, with voice commands**

Speak on phone → say "over" → paste on Mac · Zero dependencies · PWA support

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org)
[![macOS](https://img.shields.io/badge/macOS-13%2B-blue.svg)](https://www.apple.com/macos)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**English** · [中文](README_CN.md)

</div>

---

A tiny HTTP server on your Mac that serves a full-screen memo pad to your iPhone. Dictate text continuously using any voice keyboard — say **"over"** to send the current segment to your Mac clipboard, ready to Cmd+V. No buttons to tap, no interruptions.

**Why not iCloud clipboard sync?** iCloud requires the same Apple ID on both devices. If your phone uses a different account (or you just want something faster and more reliable), voice-clip works over plain local WiFi with zero cloud dependency.

## How It Works

```
┌─────────────┐    WiFi (HTTP)    ┌─────────────┐
│   iPhone     │ ──────────────► │     Mac      │
│              │                  │              │
│  Voice KB    │  say "over"     │  voice-clip  │
│  → Memo pad  │ ──────────────► │  → clipboard │
│  → Hands-free│                  │  → Cmd+V     │
└─────────────┘                   └─────────────┘
```

1. Mac runs `clipboard-server.js` on port 5678
2. iPhone opens `http://<mac-ip>:5678` — a full-screen memo pad
3. Speak continuously using any voice keyboard (Doubao, iOS dictation, etc.)
4. Say **"over"** + pause 2 seconds — the new segment is sent to Mac clipboard
5. Keep speaking — each "over" sends only the increment since the last one
6. Cmd+V on Mac to paste anytime

## Voice Commands

| Command | Effect |
|---------|--------|
| **over** | Send text since last "over" to Mac clipboard |
| **clear** | Wipe all text on phone, start fresh |
| **还原** | Undo the last clear |

All commands trigger after **2 seconds of silence**. Trailing punctuation from voice input is automatically ignored.

## Quick Start

**Requirements:** macOS 13+ · Node.js 18+ · iPhone on the same WiFi network

```bash
git clone https://github.com/Tiny-cyber/voice-clip.git
cd voice-clip
chmod +x install.sh
./install.sh
```

The install script will:
- Start the server as a macOS LaunchAgent (auto-start on login, auto-restart on crash)
- Print the URL to open on your iPhone

> To uninstall: `./uninstall.sh`

### Manual start (without install)

```bash
node clipboard-server.js
```

Then open `http://<your-mac-ip>:5678` on your iPhone.

## Add to iPhone Home Screen (PWA)

1. Open the URL in Safari on your iPhone
2. Tap the Share button → "Add to Home Screen"
3. Now it works like a native app — full screen, no browser UI

## Features

| Feature | Description |
|---------|-------------|
| **Zero dependencies** | Single Node.js file, no `npm install` needed |
| **Voice commands** | "over" / "clear" / "还原" — all hands-free |
| **Incremental sync** | Each "over" sends only new text, not everything |
| **Continuous input** | Textarea never clears on "over" — voice keyboard stays active |
| **Image upload** | Tap "+" to send photos to Mac (saved to ~/Downloads, copied to clipboard) |
| **PWA support** | Add to home screen for native app experience |
| **Dark theme** | Full-screen memo pad, easy on the eyes |
| **LaunchAgent** | Auto-starts on login, auto-restarts on crash |
| **Local only** | Everything stays on your local network, nothing touches the cloud |

## File Structure

```
~/.voice-clip/
├── clipboard-server.js     # The server
├── clipboard-server.log    # stdout log
└── clipboard-server.err.log # stderr log
```

## Troubleshooting

**Can't connect from iPhone?**
- Make sure both devices are on the same WiFi network
- Check that port 5678 is not blocked by firewall

**Clipboard not updating on Mac?**
- The server uses `osascript` to write clipboard. Run `osascript -e 'set the clipboard to "test"'` manually to verify it works.

**"over" not triggering?**
- Wait at least 2 seconds after saying "over"
- Voice keyboards may add punctuation (e.g. "over.") — this is handled automatically

## License

[MIT](LICENSE)
