<div align="center">

# voice-clip

**Send text from iPhone to Mac clipboard over local WiFi**

Voice input on phone → instant paste on Mac · Zero dependencies · PWA support

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org)
[![macOS](https://img.shields.io/badge/macOS-13%2B-blue.svg)](https://www.apple.com/macos)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**English** · [中文](README_CN.md)

</div>

---

A tiny HTTP server that runs on your Mac and serves a web page to your iPhone. Type or dictate text on your phone, tap Send, and it lands in your Mac's clipboard — ready to Cmd+V.

**Why not iCloud clipboard sync?** iCloud requires the same Apple ID on both devices. If your phone uses a different account (or you just want something faster and more reliable), voice-clip works over plain local WiFi with zero cloud dependency.

## How It Works

```
┌─────────────┐    WiFi (HTTP POST)    ┌─────────────┐
│   iPhone     │ ────────────────────► │     Mac      │
│              │                        │              │
│  Voice KB    │   { "text": "..." }   │  voice-clip  │
│  → Web page  │ ────────────────────► │  → clipboard │
│  → Send      │                        │  → Cmd+V     │
└─────────────┘    ◄──── { ok: true }  └─────────────┘
```

1. Mac runs `clipboard-server.js` on port 5678
2. iPhone opens `http://<mac-ip>:5678` in Safari
3. Use any voice keyboard (e.g. Doubao, iOS dictation) to input text
4. Tap Send — text is written to Mac clipboard via `osascript`
5. Cmd+V on Mac to paste

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
| **PWA support** | Add to home screen for native app experience |
| **Dark theme** | Easy on the eyes, matches iOS dark mode |
| **Send history** | Shows recent sends with timestamps |
| **LaunchAgent** | Auto-starts on login, auto-restarts on crash |
| **osascript clipboard** | Works reliably from background processes (unlike `pbcopy`) |
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

## License

[MIT](LICENSE)
