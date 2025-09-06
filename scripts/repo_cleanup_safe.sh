#!/usr/bin/env bash

# ReplyX Repository Structure Cleanup Script
# This script safely cleans up temporary directories and cache files
# Usage: ./repo_cleanup_safe.sh [--dry-run] [--force]

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DRY_RUN=false
FORCE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [--dry-run] [--force]"
            echo "  --dry-run  Show what would be done without making changes"
            echo "  --force    Skip confirmation prompts"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Logging functions
log_info() {
    echo -e "${BLUE}INFO:${NC} $1"
}

log_success() {
    echo -e "${GREEN}SUCCESS:${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}WARNING:${NC} $1"
}

log_error() {
    echo -e "${RED}ERROR:${NC} $1"
}

# Check if we're in a git repository
check_git_repo() {
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        log_error "Not in a git repository. Exiting."
        exit 1
    fi
}

# Backup function for important directories
backup_directory() {
    local dir="$1"
    local backup_name="$2"
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_path="/tmp/replyx_backup_${backup_name}_${timestamp}"
    
    if [[ -d "$dir" ]]; then
        if [[ "$DRY_RUN" == "true" ]]; then
            log_info "Would backup $dir to $backup_path"
        else
            log_info "Backing up $dir to $backup_path"
            cp -r "$dir" "$backup_path"
            log_success "Backup created: $backup_path"
        fi
    fi
}

# Safe remove function with confirmation
safe_remove() {
    local target="$1"
    local description="$2"
    
    if [[ ! -e "$target" ]]; then
        log_info "Already clean: $target (not found)"
        return 0
    fi
    
    local size=$(du -sh "$target" 2>/dev/null | cut -f1 || echo "unknown")
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "Would remove $description: $target ($size)"
        return 0
    fi
    
    log_warning "About to remove $description: $target ($size)"
    
    if [[ "$FORCE" != "true" ]]; then
        read -p "Continue? [y/N] " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Skipped: $target"
            return 0
        fi
    fi
    
    rm -rf "$target"
    log_success "Removed: $target"
}

# Update gitignore function
update_gitignore() {
    local gitignore_path="$REPO_ROOT/.gitignore"
    local additions=(
        "# Development artifacts"
        ".dev/"
        "test-artifacts/"
        ""
        "# Cache directories"
        ".pytest_cache/"
        "__pycache__/"
        "*.pyc"
        ""
        "# Log files"
        "*.log"
        "logs/"
        ""
        "# Temporary files"
        "*.tmp"
        ".tmp/"
        "tmp/"
        ""
        "# IDE files"
        ".vscode/settings.json"
        ".idea/"
        ""
        "# Agent working directories"
        "TASK/"
        "agent-workdir/"
    )
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "Would update .gitignore with cleanup patterns"
        return 0
    fi
    
    log_info "Updating .gitignore with cleanup patterns"
    
    # Check if additions already exist
    for item in "${additions[@]}"; do
        if [[ -n "$item" ]] && ! grep -Fxq "$item" "$gitignore_path" 2>/dev/null; then
            echo "$item" >> "$gitignore_path"
        fi
    done
    
    log_success "Updated .gitignore"
}

# Move TASK directory to safe location
relocate_task_directory() {
    local task_dir="$REPO_ROOT/TASK"
    local target_dir="$REPO_ROOT/.dev/agent-workdir"
    
    if [[ ! -d "$task_dir" ]]; then
        log_info "No TASK directory found to relocate"
        return 0
    fi
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "Would relocate TASK/ to .dev/agent-workdir/"
        return 0
    fi
    
    log_info "Relocating TASK directory to .dev/agent-workdir/"
    
    # Create target directory
    mkdir -p "$(dirname "$target_dir")"
    
    # Move the directory
    mv "$task_dir" "$target_dir"
    
    log_success "Relocated TASK/ to .dev/agent-workdir/"
}

# Main cleanup function
main() {
    log_info "Starting ReplyX repository cleanup"
    log_info "Repository root: $REPO_ROOT"
    
    cd "$REPO_ROOT"
    
    # Check git repo
    check_git_repo
    
    # Show current git status
    log_info "Current git status:"
    git status --porcelain
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_warning "DRY RUN MODE - No changes will be made"
    fi
    
    # 1. Backup important directories before removal
    log_info "=== Phase 1: Backing up important directories ==="
    backup_directory "$REPO_ROOT/TASK" "task_directory"
    
    # 2. Remove cache and temporary directories
    log_info "=== Phase 2: Cleaning cache and temporary files ==="
    
    # Python cache files
    find "$REPO_ROOT" -type d -name "__pycache__" | while read -r dir; do
        safe_remove "$dir" "Python cache directory"
    done
    
    find "$REPO_ROOT" -type d -name ".pytest_cache" | while read -r dir; do
        safe_remove "$dir" "Pytest cache directory"
    done
    
    # Test artifacts
    safe_remove "$REPO_ROOT/test-artifacts" "test artifacts directory"
    
    # Node.js cache (but preserve node_modules in active projects)
    safe_remove "$REPO_ROOT/.dev" "development artifacts directory"
    
    # Log files
    find "$REPO_ROOT" -name "*.log" -type f | while read -r file; do
        safe_remove "$file" "log file"
    done
    
    # 3. Relocate TASK directory
    log_info "=== Phase 3: Relocating agent working directory ==="
    relocate_task_directory
    
    # 4. Update .gitignore
    log_info "=== Phase 4: Updating .gitignore ==="
    update_gitignore
    
    # 5. Final status
    log_info "=== Cleanup Summary ==="
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_success "Dry run completed successfully"
        log_info "Run without --dry-run to apply changes"
    else
        log_success "Cleanup completed successfully"
        log_info "Repository structure is now standardized"
        
        # Show final git status
        echo
        log_info "Final git status:"
        git status --porcelain
        
        # Suggest next steps
        echo
        log_info "Next steps:"
        echo "  1. Review changes with: git diff"
        echo "  2. Commit changes with: git add -A && git commit -m 'Standardize repository structure'"
        echo "  3. Consider running import standardization scripts"
    fi
}

# Run main function
main "$@"