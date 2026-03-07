<div align="center">

# voice-clip

**iPhone voice → computer clipboard, with voice commands**

Speak on phone → say "over" → paste on computer · Zero dependencies · One-line install

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org)
[![macOS](https://img.shields.io/badge/macOS-13%2B-blue.svg)](https://www.apple.com/macos)
[![Windows](https://img.shields.io/badge/Windows-10%2F11-blue.svg)](https://www.microsoft.com/windows)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**English** · [中文](README_CN.md)

</div>

---

A tiny HTTP server on your computer that serves a full-screen memo pad to your iPhone. Dictate text continuously using any voice keyboard — say **"over"** to send the current segment to your clipboard, ready to paste. No buttons to tap, no interruptions.

Works on **macOS** and **Windows** — same code, auto-detects your system.

**Why not iCloud clipboard sync?** iCloud requires the same Apple ID on both devices. If your phone uses a different account (or you just want something faster and more reliable), voice-clip works over plain local WiFi with zero cloud dependency.

## Install

### macOS

**Requirements:** macOS 13+ · Node.js 18+ · iPhone on the same WiFi

```bash
curl -fsSL https://raw.githubusercontent.com/Tiny-cyber/voice-clip/main/install.sh | bash
```

A QR code will open in your browser — scan it with your iPhone camera, then tap "Add to Home Screen". Done.

> To uninstall: `curl -fsSL https://raw.githubusercontent.com/Tiny-cyber/voice-clip/main/uninstall.sh | bash`

### Windows

**Requirements:** Windows 10/11 · Node.js 18+ · iPhone on the same WiFi

**Option A — One-line install (PowerShell):**

```powershell
curl -fsSL https://raw.githubusercontent.com/Tiny-cyber/voice-clip/main/install-windows.bat -o %TEMP%\install-voice-clip.bat && %TEMP%\install-voice-clip.bat
```

**Option B — Manual:**

1. Download [clipboard-server.js](https://raw.githubusercontent.com/Tiny-cyber/voice-clip/main/clipboard-server.js) to `%USERPROFILE%\.voice-clip\`
2. Run: `node %USERPROFILE%\.voice-clip\clipboard-server.js`
3. Open `http://localhost:5678/setup` in your browser
4. Enter the displayed address in iPhone Safari → Share → Add to Home Screen

> **Note:** Windows doesn't generate a QR code. The setup page shows the address for you to type into iPhone Safari. If the `.local` address doesn't work, use the IP address shown below it.

> **Auto-start on login:** Press `Win+R` → type `shell:startup` → put a shortcut to `start.bat` in that folder.

## How It Works

```
┌─────────────┐    WiFi (HTTP)    ┌─────────────┐
│   iPhone     │ ──────────────► │  Mac / PC    │
│              │                  │              │
│  Voice KB    │  say "over"     │  voice-clip  │
│  → Memo pad  │ ──────────────► │  → clipboard │
│  → Hands-free│                  │  → Paste     │
└─────────────┘                   └─────────────┘
```

1. Install runs the server and opens a setup page in your browser
2. Connect your iPhone (scan QR on Mac, or type the address on Windows)
3. Speak continuously using any voice keyboard (Doubao, iOS dictation, etc.)
4. Say **"over"** + pause 2 seconds — the new segment is sent to your clipboard
5. Keep speaking — each "over" sends only the increment since the last one
6. Cmd+V (Mac) or Ctrl+V (Windows) to paste anytime

The setup page uses your computer's `.local` hostname, so it works even if your IP address changes. You only need to set up once — after adding to home screen, the app always connects.

## Voice Commands

| Command | Effect |
|---------|--------|
| **over** | Send text since last "over" to clipboard |
| **clear** | Wipe all text on phone, start fresh |
| **还原** | Undo the last clear |

All commands trigger after **2 seconds of silence**. Trailing punctuation from voice input is automatically ignored.

## Features

| Feature | Description |
|---------|-------------|
| **Cross-platform** | Works on macOS and Windows with the same code |
| **One-line install** | Single command setup, no manual config |
| **Zero dependencies** | Single Node.js file, no `npm install` needed |
| **Stable connection** | Uses `.local` hostname — works even if IP changes |
| **Voice commands** | "over" / "clear" / "还原" — all hands-free |
| **Incremental sync** | Each "over" sends only new text, not everything |
| **Two-way clipboard** | Computer clipboard shows at the bottom of the phone screen |
| **Image upload** | Tap "+" to send photos to computer (saved to ~/Downloads, copied to clipboard) |
| **PWA support** | Add to home screen for native app experience |
| **Auto-start** | LaunchAgent (Mac) or Startup folder (Windows) |
| **Local only** | Everything stays on your local network, nothing touches the cloud |

## File Structure

```
~/.voice-clip/                          # Mac: ~/.voice-clip/  Windows: %USERPROFILE%\.voice-clip\
├── clipboard-server.js    # The server
├── start.bat              # Windows start script (Windows only)
├── voice-clip.log         # stdout log (Mac only)
└── voice-clip.err.log     # stderr log (Mac only)
```

## Troubleshooting

**Can't connect from iPhone?**
- Make sure both devices are on the same WiFi network
- Check that port 5678 is not blocked by firewall
- On Windows, you may need to allow Node.js through Windows Firewall when prompted

**Clipboard not updating?**
- Mac: Run `osascript -e 'set the clipboard to "test"'` to verify
- Windows: Run `powershell -command "Set-Clipboard -Value 'test'"` to verify

**`.local` address not working on Windows?**
- `.local` (mDNS) works on Windows 10 1903+. If it doesn't connect, use the IP address shown on the setup page instead.

**"over" not triggering?**
- Wait at least 2 seconds after saying "over"
- Voice keyboards may add punctuation (e.g. "over.") — this is handled automatically

**Setup page / QR code didn't open?**
- Open `http://localhost:5678/setup` manually in your browser
- Or just open `http://<your-hostname>.local:5678` on your iPhone

## License

[MIT](LICENSE)
