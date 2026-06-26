#!/bin/bash
set -euo pipefail

# AppleScript / LaunchAgents use a minimal PATH — include Homebrew
export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

APP_DIR="/Users/gretel/Desktop/gretel-screens"
cd "$APP_DIR"

echo "Building production app..."
npm run build

echo "Starting/restarting via pm2..."
if pm2 describe gretel-screens >/dev/null 2>&1; then
  pm2 restart gretel-screens
else
  pm2 start ecosystem.config.js
fi

echo "Done. App should be running at http://localhost:3000"
