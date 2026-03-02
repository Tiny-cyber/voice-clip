#!/bin/bash
set -e

# voice-clip installer — run with:
#   curl -fsSL https://raw.githubusercontent.com/Tiny-cyber/voice-clip/main/install.sh | bash

INSTALL_DIR="$HOME/.voice-clip"
PLIST_NAME="com.voice-clip.plist"
PLIST_PATH="$HOME/Library/LaunchAgents/$PLIST_NAME"
REPO_RAW="https://raw.githubusercontent.com/Tiny-cyber/voice-clip/main"

echo "Installing voice-clip..."

# Check Node.js
NODE_PATH=$(which node 2>/dev/null || true)
if [ -z "$NODE_PATH" ]; then
  echo "Error: Node.js not found. Install it from https://nodejs.org"
  exit 1
fi
echo "Using Node.js: $NODE_PATH"

# Create install directory
mkdir -p "$INSTALL_DIR"

# Download server file from GitHub
echo "Downloading..."
curl -fsSL "$REPO_RAW/clipboard-server.js" -o "$INSTALL_DIR/clipboard-server.js"
echo "Installed to $INSTALL_DIR/"

# Stop existing service if running
launchctl unload "$PLIST_PATH" 2>/dev/null || true

# Create LaunchAgent plist
cat > "$PLIST_PATH" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.voice-clip</string>

    <key>ProgramArguments</key>
    <array>
        <string>$NODE_PATH</string>
        <string>$INSTALL_DIR/clipboard-server.js</string>
    </array>

    <key>EnvironmentVariables</key>
    <dict>
        <key>HOME</key>
        <string>$HOME</string>
        <key>PATH</key>
        <string>/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin</string>
    </dict>

    <key>RunAtLoad</key>
    <true/>

    <key>KeepAlive</key>
    <true/>

    <key>StandardOutPath</key>
    <string>$INSTALL_DIR/voice-clip.log</string>

    <key>StandardErrorPath</key>
    <string>$INSTALL_DIR/voice-clip.err.log</string>
</dict>
</plist>
EOF

# Start service
launchctl load "$PLIST_PATH"

echo ""
echo "voice-clip is running!"
echo "A QR code should open in your browser — scan it with your iPhone."
echo ""
echo "After scanning, tap Share → Add to Home Screen."
echo "That's it. The app will keep running in the background."
