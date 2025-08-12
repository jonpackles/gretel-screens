#!/bin/bash

# Install cron job for content optimization
# Run this once to set up automatic nightly optimization

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OPTIMIZE_SCRIPT="$SCRIPT_DIR/optimize-content.sh"

# Make optimize script executable
chmod +x "$OPTIMIZE_SCRIPT"

# Create cron job entry
CRON_JOB="0 0 * * * $OPTIMIZE_SCRIPT >> $SCRIPT_DIR/../logs/cron.log 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "$OPTIMIZE_SCRIPT"; then
    echo "❌ Cron job already exists for $OPTIMIZE_SCRIPT"
    echo "Current cron jobs:"
    crontab -l | grep "$OPTIMIZE_SCRIPT"
    exit 1
fi

# Add cron job
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

echo "✅ Cron job installed successfully!"
echo "📅 Will run every night at midnight"
echo "📝 Logs will be written to: $SCRIPT_DIR/../logs/"
echo ""
echo "Current cron jobs:"
crontab -l

echo ""
echo "To test manually, run:"
echo "  $OPTIMIZE_SCRIPT"
echo ""
echo "To remove cron job later:"
echo "  crontab -e  # Then delete the line containing optimize-content.sh" 