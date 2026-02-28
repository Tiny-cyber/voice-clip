#!/bin/bash

# voice-clip uninstaller
INSTALL_DIR="$HOME/.voice-clip"
PLIST_NAME="com.voice-clip.plist"
PLIST_PATH="$HOME/Library/LaunchAgents/$PLIST_NAME"

echo "Uninstalling voice-clip..."

# Stop and unload LaunchAgent
if [ -f "$PLIST_PATH" ]; then
  launchctl unload "$PLIST_PATH" 2>/dev/null || true
  rm "$PLIST_PATH"
  echo "Removed LaunchAgent"
fi

# Remove install directory
if [ -d "$INSTALL_DIR" ]; then
  rm -rf "$INSTALL_DIR"
  echo "Removed $INSTALL_DIR"
fi

echo "voice-clip uninstalled."
