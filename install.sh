#!/bin/bash
set -e

# voice-clip installer
INSTALL_DIR="$HOME/.voice-clip"
PLIST_NAME="com.voice-clip.plist"
PLIST_PATH="$HOME/Library/LaunchAgents/$PLIST_NAME"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Installing voice-clip..."

# Find Node.js
NODE_PATH=$(which node 2>/dev/null || true)
if [ -z "$NODE_PATH" ]; then
  echo "Error: Node.js not found. Install it from https://nodejs.org"
  exit 1
fi
echo "Using Node.js: $NODE_PATH"

# Create install directory
mkdir -p "$INSTALL_DIR"

# Copy server file
cp "$SCRIPT_DIR/clipboard-server.js" "$INSTALL_DIR/"
echo "Installed clipboard-server.js to $INSTALL_DIR/"

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
    </dict>

    <key>RunAtLoad</key>
    <true/>

    <key>KeepAlive</key>
    <true/>

    <key>StandardOutPath</key>
    <string>$INSTALL_DIR/clipboard-server.log</string>

    <key>StandardErrorPath</key>
    <string>$INSTALL_DIR/clipboard-server.err.log</string>
</dict>
</plist>
EOF

# Unload existing if running
launchctl unload "$PLIST_PATH" 2>/dev/null || true

# Load and start
launchctl load "$PLIST_PATH"

echo ""
echo "voice-clip installed and running!"
echo ""

# Get local IP
IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "your-mac-ip")
echo "Open this URL on your iPhone:"
echo "  http://$IP:5678"
echo ""
echo "Tip: In Safari, tap Share → Add to Home Screen for PWA experience."
