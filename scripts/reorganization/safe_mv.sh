#!/usr/bin/env bash
# Safe directory move script with git history preservation
# Usage: ./safe_mv.sh <source> <destination> [--dry-run]

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

usage() {
    echo "Usage: $0 <source> <destination> [--dry-run]"
    echo "Example: $0 uploads backend/uploads"
    echo ""
    echo "Options:"
    echo "  --dry-run    Show what would be moved without actually moving"
    exit 1
}

log_info() {
    echo -e "${GREEN}ℹ️  $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

check_git_status() {
    if ! git status --porcelain >/dev/null 2>&1; then
        log_error "Not in a git repository or git not available"
        exit 1
    fi
    
    if [[ -n $(git status --porcelain) ]]; then
        log_warning "Working directory has uncommitted changes"
        git status --porcelain
        echo ""
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Aborted by user"
            exit 1
        fi
    fi
}

validate_paths() {
    local source="$1"
    local destination="$2"
    
    # Check source exists
    if [[ ! -e "$source" ]]; then
        log_error "Source path does not exist: $source"
        exit 1
    fi
    
    # Check destination doesn't exist
    if [[ -e "$destination" ]]; then
        log_error "Destination path already exists: $destination"
        exit 1
    fi
    
    # Create parent directory if needed
    local parent_dir
    parent_dir=$(dirname "$destination")
    if [[ ! -d "$parent_dir" ]]; then
        log_warning "Parent directory doesn't exist: $parent_dir"
        if [[ "${DRY_RUN:-}" != "true" ]]; then
            mkdir -p "$parent_dir"
            log_info "Created parent directory: $parent_dir"
        else
            log_info "Would create parent directory: $parent_dir"
        fi
    fi
}

perform_move() {
    local source="$1"
    local destination="$2"
    
    if [[ "${DRY_RUN:-}" == "true" ]]; then
        log_info "DRY RUN: Would execute: git mv '$source' '$destination'"
        return 0
    fi
    
    log_info "Moving: $source -> $destination"
    
    # Use git mv to preserve history
    if git mv "$source" "$destination"; then
        log_info "✅ Successfully moved with git history preserved"
        
        # Auto-commit the move
        git add .
        git commit -m "refactor: move $source to $destination

🚀 Repository structure reorganization
- Preserves git history with git mv
- Part of standardization effort

Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
        
        log_info "✅ Move committed to git"
    else
        log_error "Failed to move with git mv"
        exit 1
    fi
}

main() {
    # Parse arguments
    if [[ $# -lt 2 ]]; then
        usage
    fi
    
    local source="$1"
    local destination="$2"
    local dry_run="${3:-}"
    
    if [[ "$dry_run" == "--dry-run" ]]; then
        DRY_RUN="true"
        log_info "🔍 DRY RUN MODE - No changes will be made"
    fi
    
    log_info "Repository structure reorganization"
    log_info "Source: $source"
    log_info "Destination: $destination"
    echo ""
    
    # Validations
    check_git_status
    validate_paths "$source" "$destination"
    
    # Perform the move
    perform_move "$source" "$destination"
    
    log_info "✅ Move operation completed successfully"
    
    if [[ "${DRY_RUN:-}" != "true" ]]; then
        echo ""
        log_info "Next steps:"
        echo "1. Update any configuration files that reference the old path"
        echo "2. Update documentation that mentions the old location"
        echo "3. Check that applications still work correctly"
        echo "4. Update .gitignore if necessary"
    fi
}

main "$@"