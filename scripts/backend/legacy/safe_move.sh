#!/usr/bin/env bash
# Safe file mover with git mv and logging
set -euo pipefail

usage() {
    echo "Usage: $0 <from> <to> [--dry-run]"
    echo "Example: $0 cleanup_users.py scripts/admin/cleanup_users.py"
    exit 1
}

# Check arguments
[[ $# -lt 2 ]] && usage

FROM="$1"
TO="$2"
DRY_RUN="${3:-}"

# Get absolute paths for logging
BACKEND_ROOT="/Users/dan/Documents/chatAI/MVP 9/backend"
LOG_FILE="$BACKEND_ROOT/scripts/move_operations.log"

# Create log file if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"
touch "$LOG_FILE"

# Log the operation
timestamp=$(date '+%Y-%m-%d %H:%M:%S')
echo "[$timestamp] Planned move: $FROM -> $TO" >> "$LOG_FILE"

# Validate source exists
if [[ ! -e "$FROM" ]]; then
    echo "❌ Error: Source file/directory '$FROM' does not exist"
    exit 1
fi

# Create target directory if needed
TO_DIR=$(dirname "$TO")
if [[ ! -d "$TO_DIR" ]]; then
    echo "📁 Creating directory: $TO_DIR"
    if [[ "$DRY_RUN" != "--dry-run" ]]; then
        mkdir -p "$TO_DIR"
    fi
fi

echo "📦 Plan: git mv '$FROM' -> '$TO'"

if [[ "$DRY_RUN" == "--dry-run" ]]; then
    echo "🔍 DRY RUN: Would execute: git mv '$FROM' '$TO'"
    exit 0
fi

# Perform the git move
if git mv "$FROM" "$TO"; then
    echo "✅ Successfully moved: $FROM -> $TO"
    echo "[$timestamp] SUCCESS: $FROM -> $TO" >> "$LOG_FILE"
else
    echo "❌ Failed to move: $FROM -> $TO"
    echo "[$timestamp] FAILED: $FROM -> $TO" >> "$LOG_FILE"
    exit 1
fi