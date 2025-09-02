#!/usr/bin/env bash
#
# Safe git mv wrapper with logging and dry-run support
# Usage: ./safe_move.sh <from> <to> [--dry-run]
#

set -euo pipefail

usage() {
    echo "Usage: $0 <from> <to> [--dry-run]"
    echo "Example: $0 backend/workers workers --dry-run"
    exit 1
}

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a reorganization.log
}

# Check arguments
if [[ $# -lt 2 ]]; then
    usage
fi

FROM="$1"
TO="$2"
DRY_RUN="${3:-}"

# Validate paths exist
if [[ ! -e "$FROM" ]]; then
    log "ERROR: Source path '$FROM' does not exist"
    exit 1
fi

if [[ -e "$TO" ]]; then
    log "WARNING: Target path '$TO' already exists"
    read -p "Continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Create target directory if needed
TO_DIR=$(dirname "$TO")
if [[ ! -d "$TO_DIR" ]]; then
    log "Creating target directory: $TO_DIR"
    if [[ "$DRY_RUN" != "--dry-run" ]]; then
        mkdir -p "$TO_DIR"
    fi
fi

# Log the planned move
log "PLAN: git mv '$FROM' -> '$TO'"

if [[ "$DRY_RUN" == "--dry-run" ]]; then
    log "DRY RUN: Would execute: git mv '$FROM' '$TO'"
    exit 0
fi

# Execute the move
log "EXECUTING: git mv '$FROM' '$TO'"
if git mv "$FROM" "$TO"; then
    log "SUCCESS: Moved '$FROM' -> '$TO'"
else
    log "ERROR: Failed to move '$FROM' -> '$TO'"
    exit 1
fi

log "Move completed successfully"