#!/usr/bin/env bash
# Repository structure migration script
# Safely reorganizes problematic directories

set -euo pipefail

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Source the safe_mv script functions
source "$SCRIPT_DIR/safe_mv.sh" 2>/dev/null || {
    echo "Error: safe_mv.sh not found in $SCRIPT_DIR"
    exit 1
}

# Migration phases
declare -A MIGRATIONS=(
    # Phase 1: Low risk moves (ignored directories)
    ["uploads"]="backend/uploads"
    ["test-artifacts"]="tests/reports" 
    
    # Phase 2: Medium risk moves (config/tools)
    ["payments"]="backend/integrations/payments"
    ["tools"]="scripts/tools"
    
    # Phase 3: Archive cleanup
    ["TASK"]="archive/tasks"
)

# Directories to add to .gitignore after moving
GITIGNORE_ADDITIONS=(
    "backend/uploads/*"
    "backend/logs/*"
    "workers/logs/*" 
    "tests/reports/*"
    "archive/tasks/*"
)

log_phase() {
    echo ""
    echo "=================================================="
    echo "🚀 PHASE: $1"
    echo "=================================================="
}

update_gitignore() {
    local gitignore_file="$REPO_ROOT/.gitignore"
    
    log_info "Updating .gitignore with new paths..."
    
    # Check if additions already exist
    local needs_update=false
    for addition in "${GITIGNORE_ADDITIONS[@]}"; do
        if ! grep -q "^$addition" "$gitignore_file" 2>/dev/null; then
            needs_update=true
            break
        fi
    done
    
    if [[ "$needs_update" == "true" ]]; then
        {
            echo ""
            echo "# Repository reorganization additions"
            for addition in "${GITIGNORE_ADDITIONS[@]}"; do
                echo "$addition"
            done
        } >> "$gitignore_file"
        
        log_info "✅ Updated .gitignore"
        
        # Commit gitignore changes
        cd "$REPO_ROOT"
        git add .gitignore
        git commit -m "chore: update .gitignore for reorganized directories

🗂️ Added ignores for:
$(printf '- %s\n' "${GITIGNORE_ADDITIONS[@]}")

Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
    else
        log_info "⚪ .gitignore already up to date"
    fi
}

create_directory_structure() {
    log_info "Creating target directory structure..."
    
    local directories=(
        "backend/integrations"
        "scripts/tools"
        "tests/reports"
        "archive/tasks"
        ".claude"
    )
    
    for dir in "${directories[@]}"; do
        local full_path="$REPO_ROOT/$dir"
        if [[ ! -d "$full_path" ]]; then
            mkdir -p "$full_path"
            log_info "Created directory: $dir"
        else
            log_info "Directory already exists: $dir"
        fi
    done
}

perform_migrations() {
    local phase="$1"
    shift
    local migrations=("$@")
    
    log_phase "$phase"
    
    for migration in "${migrations[@]}"; do
        local source="${migration%:*}"
        local destination="${migration#*:}"
        
        if [[ -e "$REPO_ROOT/$source" ]]; then
            log_info "Migrating: $source -> $destination"
            cd "$REPO_ROOT"
            
            if [[ "${DRY_RUN:-}" == "true" ]]; then
                log_info "DRY RUN: Would move $source to $destination"
            else
                # Use our safe_mv function
                DRY_RUN="${DRY_RUN:-}" perform_move "$source" "$destination"
            fi
        else
            log_warning "Source not found, skipping: $source"
        fi
    done
}

check_references() {
    log_info "Checking for file references to old paths..."
    
    local config_files=(
        ".github/workflows/*.yml"
        "backend/config/*.py"
        "scripts/**/*.sh"
        "docs/**/*.md"
        "docker-compose*.yml"
        "Dockerfile*"
    )
    
    local old_paths=(
        "uploads/"
        "test-artifacts/"
        "payments/"
        "tools/"
        "TASK/"
    )
    
    local found_references=false
    
    for path in "${old_paths[@]}"; do
        # Search in common config files
        if grep -r "$path" --include="*.yml" --include="*.yaml" --include="*.py" --include="*.sh" --include="*.md" "$REPO_ROOT" 2>/dev/null | head -3; then
            found_references=true
            log_warning "Found references to old path: $path"
        fi
    done
    
    if [[ "$found_references" == "true" ]]; then
        log_warning "Some references to old paths were found"
        log_warning "Please review and update configuration files after migration"
    else
        log_info "✅ No obvious references to old paths found"
    fi
}

main() {
    local dry_run="${1:-}"
    
    if [[ "$dry_run" == "--dry-run" ]]; then
        DRY_RUN="true"
        log_info "🔍 DRY RUN MODE - No changes will be made"
    fi
    
    log_info "🚀 Repository structure migration starting..."
    cd "$REPO_ROOT"
    
    # Pre-flight checks
    check_git_status
    check_references
    
    # Create target directories
    if [[ "${DRY_RUN:-}" != "true" ]]; then
        create_directory_structure
    fi
    
    # Phase 1: Low risk (ignored directories)
    local phase1_migrations=(
        "uploads:backend/uploads"
        "test-artifacts:tests/reports"
    )
    perform_migrations "Low Risk Migrations (Ignored Directories)" "${phase1_migrations[@]}"
    
    # Phase 2: Medium risk (config/tools)  
    local phase2_migrations=(
        "payments:backend/integrations/payments"
        "tools:scripts/tools"
    )
    perform_migrations "Medium Risk Migrations (Config/Tools)" "${phase2_migrations[@]}"
    
    # Phase 3: Archive cleanup
    local phase3_migrations=(
        "TASK:archive/tasks"
    )
    perform_migrations "Archive Cleanup" "${phase3_migrations[@]}"
    
    # Update .gitignore
    if [[ "${DRY_RUN:-}" != "true" ]]; then
        update_gitignore
    fi
    
    log_info "✅ Repository structure migration completed!"
    
    if [[ "${DRY_RUN:-}" != "true" ]]; then
        echo ""
        log_info "Next steps:"
        echo "1. Update any configuration files that reference old paths"
        echo "2. Test that all applications still work"
        echo "3. Update documentation to reflect new structure"
        echo "4. Run the structure validation: .github/workflows/structure-check.yml"
    fi
}

# Run main function with all arguments
main "$@"