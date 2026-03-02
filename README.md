<div align="center">

# voice-clip

**iPhone voice → Mac clipboard, with voice commands**

Speak on phone → say "over" → paste on Mac · Zero dependencies · One-line install

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org)
[![macOS](https://img.shields.io/badge/macOS-13%2B-blue.svg)](https://www.apple.com/macos)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**English** · [中文](README_CN.md)

</div>

---

A tiny HTTP server on your Mac that serves a full-screen memo pad to your iPhone. Dictate text continuously using any voice keyboard — say **"over"** to send the current segment to your Mac clipboard, ready to Cmd+V. No buttons to tap, no interruptions.

**Why not iCloud clipboard sync?** iCloud requires the same Apple ID on both devices. If your phone uses a different account (or you just want something faster and more reliable), voice-clip works over plain local WiFi with zero cloud dependency.

## Install

**Requirements:** macOS 13+ · Node.js 18+ · iPhone on the same WiFi

```bash
curl -fsSL https://raw.githubusercontent.com/Tiny-cyber/voice-clip/main/install.sh | bash
```

That's it. A QR code will open in your browser — scan it with your iPhone camera, then tap "Add to Home Screen". Done.

> To uninstall: `curl -fsSL https://raw.githubusercontent.com/Tiny-cyber/voice-clip/main/uninstall.sh | bash`

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

1. Install runs the server and opens a QR code in your browser
2. Scan the QR code with iPhone — a full-screen memo pad opens
3. Speak continuously using any voice keyboard (Doubao, iOS dictation, etc.)
4. Say **"over"** + pause 2 seconds — the new segment is sent to Mac clipboard
5. Keep speaking — each "over" sends only the increment since the last one
6. Cmd+V on Mac to paste anytime

The QR code uses your Mac's `.local` hostname, so it works even if your IP address changes. You only need to scan once — after adding to home screen, the app always connects.

## Voice Commands

| Command | Effect |
|---------|--------|
| **over** | Send text since last "over" to Mac clipboard |
| **clear** | Wipe all text on phone, start fresh |
| **还原** | Undo the last clear |

All commands trigger after **2 seconds of silence**. Trailing punctuation from voice input is automatically ignored.

## Features

| Feature | Description |
|---------|-------------|
| **One-line install** | Single curl command, QR code setup, no manual config |
| **Zero dependencies** | Single Node.js file, no `npm install` needed |
| **Stable connection** | Uses `.local` hostname — works even if IP changes |
| **Voice commands** | "over" / "clear" / "还原" — all hands-free |
| **Incremental sync** | Each "over" sends only new text, not everything |
| **Two-way clipboard** | Mac clipboard shows at the bottom of the phone screen |
| **Image upload** | Tap "+" to send photos to Mac (saved to ~/Downloads, copied to clipboard) |
| **PWA support** | Add to home screen for native app experience |
| **Auto-start** | LaunchAgent starts on login, restarts on crash |
| **Local only** | Everything stays on your local network, nothing touches the cloud |

## File Structure

```
~/.voice-clip/
├── clipboard-server.js    # The server
├── voice-clip.log         # stdout log
└── voice-clip.err.log     # stderr log
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

**QR code didn't open?**
- Open `http://localhost:5678/setup` manually in your Mac browser
- Or just open `http://<your-mac-hostname>.local:5678` on your iPhone

## License

[MIT](LICENSE)
