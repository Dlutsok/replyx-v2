#!/usr/bin/env python3

"""
ReplyX Import Standardization Script

This script standardizes import patterns across the codebase:
- Frontend: Converts relative imports to @ aliases
- Backend: Ensures consistent absolute imports from backend package
- Workers: Prepares for # alias migration (Node.js)

Usage:
    python3 scripts/standardize_imports.py [--dry-run] [--target=frontend|backend|workers]
"""

import os
import re
import argparse
import sys
from pathlib import Path
from typing import List, Dict, Tuple, Optional
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class ImportStandardizer:
    def __init__(self, repo_root: Path, dry_run: bool = False):
        self.repo_root = repo_root
        self.dry_run = dry_run
        self.changes_made = 0
        self.files_processed = 0
        
    def log_info(self, message: str):
        logger.info(message)
        
    def log_warning(self, message: str):
        logger.warning(message)
        
    def log_success(self, message: str):
        logger.info(f"✅ {message}")
        
    def log_change(self, message: str):
        logger.info(f"🔄 {message}")
        
    def find_files(self, directory: Path, extensions: List[str]) -> List[Path]:
        """Find all files with given extensions in directory recursively."""
        files = []
        for ext in extensions:
            files.extend(directory.rglob(f"*{ext}"))
        return files
    
    def backup_file(self, file_path: Path) -> Path:
        """Create a backup of the file before modification."""
        backup_path = file_path.with_suffix(f"{file_path.suffix}.backup")
        backup_path.write_text(file_path.read_text(encoding='utf-8'))
        return backup_path
    
    def standardize_frontend_imports(self) -> int:
        """Standardize frontend TypeScript/JavaScript imports to use @ aliases."""
        self.log_info("Standardizing frontend imports...")
        
        frontend_dir = self.repo_root / "frontend"
        if not frontend_dir.exists():
            self.log_warning("Frontend directory not found, skipping")
            return 0
            
        # File extensions to process
        extensions = ['.ts', '.tsx', '.js', '.jsx']
        files = self.find_files(frontend_dir, extensions)
        
        # Import patterns to replace with @ aliases
        patterns = [
            # Components
            (r"from\s+['\"]\.{1,}/components/([^'\"]*)['\"]", r"from '@/components/\1'"),
            (r"import\s+.*\s+from\s+['\"]\.{1,}/components/([^'\"]*)['\"]", r"import \1 from '@/components/\1'"),
            
            # Hooks
            (r"from\s+['\"]\.{1,}/hooks/([^'\"]*)['\"]", r"from '@/hooks/\1'"),
            (r"import\s+(.*)\s+from\s+['\"]\.{1,}/hooks/([^'\"]*)['\"]", r"import \1 from '@/hooks/\2'"),
            
            # Utils
            (r"from\s+['\"]\.{1,}/utils/([^'\"]*)['\"]", r"from '@/utils/\1'"),
            (r"import\s+(.*)\s+from\s+['\"]\.{1,}/utils/([^'\"]*)['\"]", r"import \1 from '@/utils/\2'"),
            
            # Lib
            (r"from\s+['\"]\.{1,}/lib/([^'\"]*)['\"]", r"from '@/lib/\1'"),
            (r"import\s+(.*)\s+from\s+['\"]\.{1,}/lib/([^'\"]*)['\"]", r"import \1 from '@/lib/\2'"),
            
            # Constants
            (r"from\s+['\"]\.{1,}/constants/([^'\"]*)['\"]", r"from '@/constants/\1'"),
            (r"import\s+(.*)\s+from\s+['\"]\.{1,}/constants/([^'\"]*)['\"]", r"import \1 from '@/constants/\2'"),
            
            # Contexts
            (r"from\s+['\"]\.{1,}/contexts/([^'\"]*)['\"]", r"from '@/contexts/\1'"),
            (r"import\s+(.*)\s+from\s+['\"]\.{1,}/contexts/([^'\"]*)['\"]", r"import \1 from '@/contexts/\2'"),
            
            # Styles
            (r"from\s+['\"]\.{1,}/styles/([^'\"]*)['\"]", r"from '@/styles/\1'"),
            (r"import\s+(.*)\s+from\s+['\"]\.{1,}/styles/([^'\"]*)['\"]", r"import \1 from '@/styles/\2'"),
            
            # Config
            (r"from\s+['\"]\.{1,}/config/([^'\"]*)['\"]", r"from '@/config/\1'"),
            (r"import\s+(.*)\s+from\s+['\"]\.{1,}/config/([^'\"]*)['\"]", r"import \1 from '@/config/\2'"),
        ]
        
        changes = 0
        for file_path in files:
            if self._should_skip_file(file_path):
                continue
                
            try:
                original_content = file_path.read_text(encoding='utf-8')
                modified_content = original_content
                file_changes = 0
                
                for pattern, replacement in patterns:
                    # Find all matches to count changes
                    matches = re.findall(pattern, modified_content)
                    if matches:
                        modified_content = re.sub(pattern, replacement, modified_content)
                        file_changes += len(matches)
                
                if file_changes > 0:
                    relative_path = file_path.relative_to(self.repo_root)
                    self.log_change(f"Updating {relative_path} ({file_changes} imports)")
                    
                    if not self.dry_run:
                        # Create backup
                        self.backup_file(file_path)
                        # Write modified content
                        file_path.write_text(modified_content, encoding='utf-8')
                    
                    changes += file_changes
                    
                self.files_processed += 1
                    
            except Exception as e:
                self.log_warning(f"Error processing {file_path}: {e}")
                
        return changes
    
    def standardize_backend_imports(self) -> int:
        """Standardize backend Python imports to use absolute imports from backend package."""
        self.log_info("Standardizing backend imports...")
        
        backend_dir = self.repo_root / "backend"
        if not backend_dir.exists():
            self.log_warning("Backend directory not found, skipping")
            return 0
            
        # File extensions to process
        extensions = ['.py']
        files = self.find_files(backend_dir, extensions)
        
        # Skip __init__.py files and test files for now
        files = [f for f in files if not f.name.startswith('__init__') and 'test' not in str(f)]
        
        changes = 0
        for file_path in files:
            try:
                original_content = file_path.read_text(encoding='utf-8')
                modified_content = original_content
                file_changes = 0
                
                lines = modified_content.split('\n')
                modified_lines = []
                
                for line in lines:
                    original_line = line
                    
                    # Convert relative imports to absolute imports
                    # Pattern: from .module import something -> from backend.current_package.module import something
                    if re.match(r'^from\s+\.', line.strip()):
                        # Get current package path relative to backend
                        relative_path = file_path.relative_to(backend_dir)
                        package_path = str(relative_path.parent).replace('/', '.').replace('\\', '.')
                        
                        # Replace relative import
                        if package_path == '.':
                            package_path = 'backend'
                        else:
                            package_path = f'backend.{package_path}'
                            
                        # Extract the import
                        match = re.match(r'^from\s+\.([^\\s]*)\s+import\s+(.*)$', line.strip())
                        if match:
                            module, imports = match.groups()
                            if module:
                                new_line = f"from {package_path}.{module} import {imports}"
                            else:
                                new_line = f"from {package_path} import {imports}"
                            
                            if new_line != line:
                                line = line.replace(line.strip(), new_line)
                                file_changes += 1
                    
                    modified_lines.append(line)
                
                if file_changes > 0:
                    modified_content = '\n'.join(modified_lines)
                    relative_path = file_path.relative_to(self.repo_root)
                    self.log_change(f"Updating {relative_path} ({file_changes} imports)")
                    
                    if not self.dry_run:
                        # Create backup
                        self.backup_file(file_path)
                        # Write modified content
                        file_path.write_text(modified_content, encoding='utf-8')
                    
                    changes += file_changes
                    
                self.files_processed += 1
                    
            except Exception as e:
                self.log_warning(f"Error processing {file_path}: {e}")
                
        return changes
    
    def prepare_workers_imports(self) -> int:
        """Prepare workers for import standardization (Node.js)."""
        self.log_info("Analyzing workers import patterns...")
        
        workers_dir = self.repo_root / "workers"
        if not workers_dir.exists():
            self.log_warning("Workers directory not found, skipping")
            return 0
            
        # File extensions to process
        extensions = ['.js', '.mjs']
        files = self.find_files(workers_dir, extensions)
        
        # Analyze current import patterns
        import_patterns = {}
        for file_path in files:
            if 'node_modules' in str(file_path):
                continue
                
            try:
                content = file_path.read_text(encoding='utf-8')
                
                # Find require statements
                requires = re.findall(r"require\(['\"]([^'\"]*)['\"]", content)
                for req in requires:
                    if req.startswith('./') or req.startswith('../'):
                        import_patterns[req] = import_patterns.get(req, 0) + 1
                        
                self.files_processed += 1
                        
            except Exception as e:
                self.log_warning(f"Error analyzing {file_path}: {e}")
        
        # Report findings
        if import_patterns:
            self.log_info("Found relative imports in workers:")
            for pattern, count in sorted(import_patterns.items(), key=lambda x: x[1], reverse=True):
                self.log_info(f"  {pattern}: {count} occurrences")
            
            self.log_info("Workers import standardization would require:")
            self.log_info("  1. Update package.json with 'imports' field")
            self.log_info("  2. Convert relative requires to # aliases")
            self.log_info("  3. Ensure consistent module loading patterns")
        else:
            self.log_success("No relative imports found in workers")
        
        return len(import_patterns)
    
    def _should_skip_file(self, file_path: Path) -> bool:
        """Check if file should be skipped during processing."""
        skip_patterns = [
            'node_modules',
            '.git',
            '.next',
            '__pycache__',
            '.pytest_cache',
            'test-artifacts',
            'backup'
        ]
        
        path_str = str(file_path)
        return any(pattern in path_str for pattern in skip_patterns)
    
    def generate_report(self) -> str:
        """Generate a summary report of changes made."""
        report = f"""
Import Standardization Report
============================

Files processed: {self.files_processed}
Total changes made: {self.changes_made}
Mode: {'DRY RUN' if self.dry_run else 'LIVE'}

Status: {'✅ Complete' if not self.dry_run else '📋 Dry run complete'}
"""
        return report

def main():
    parser = argparse.ArgumentParser(description="Standardize imports across ReplyX codebase")
    parser.add_argument('--dry-run', action='store_true', 
                       help="Show what would be changed without making modifications")
    parser.add_argument('--target', choices=['frontend', 'backend', 'workers', 'all'], 
                       default='all', help="Target specific part of codebase")
    parser.add_argument('--verbose', '-v', action='store_true',
                       help="Enable verbose logging")
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Find repository root
    current_dir = Path.cwd()
    repo_root = current_dir
    
    # Look for common repo indicators
    while repo_root != repo_root.parent:
        if (repo_root / '.git').exists() or (repo_root / 'package.json').exists():
            break
        repo_root = repo_root.parent
    else:
        print("Error: Could not find repository root")
        sys.exit(1)
    
    print(f"Repository root: {repo_root}")
    if args.dry_run:
        print("🔍 DRY RUN MODE - No files will be modified")
    
    standardizer = ImportStandardizer(repo_root, dry_run=args.dry_run)
    total_changes = 0
    
    try:
        if args.target in ['frontend', 'all']:
            changes = standardizer.standardize_frontend_imports()
            total_changes += changes
            standardizer.log_success(f"Frontend: {changes} imports standardized")
        
        if args.target in ['backend', 'all']:
            changes = standardizer.standardize_backend_imports()
            total_changes += changes
            standardizer.log_success(f"Backend: {changes} imports standardized")
        
        if args.target in ['workers', 'all']:
            changes = standardizer.prepare_workers_imports()
            total_changes += changes
            standardizer.log_success(f"Workers: {changes} patterns analyzed")
        
        standardizer.changes_made = total_changes
        
        # Generate and display report
        print(standardizer.generate_report())
        
        if not args.dry_run and total_changes > 0:
            print("\n📝 Next steps:")
            print("  1. Test the application to ensure imports work correctly")
            print("  2. Run linters to check code quality")
            print("  3. Commit the changes with: git add -A && git commit -m 'Standardize import patterns'")
            print("  4. Consider removing backup files after verification")
        
    except KeyboardInterrupt:
        print("\n⏹️  Operation cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error during standardization: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()