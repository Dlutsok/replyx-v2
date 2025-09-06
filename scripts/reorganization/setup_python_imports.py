#!/usr/bin/env python3
"""
Setup Python backend package structure and imports.
Creates proper __init__.py files and sets up import paths.
"""
import os
import sys
from pathlib import Path

# Add backend to Python path
backend_path = Path(__file__).parent.parent.parent / "backend"
sys.path.insert(0, str(backend_path))

def create_init_files():
    """Create __init__.py files for proper package structure."""
    backend_dir = Path(__file__).parent.parent.parent / "backend"
    
    # Define package structure
    packages = [
        "backend",
        "backend/api",
        "backend/ai", 
        "backend/core",
        "backend/services",
        "backend/database",
        "backend/integrations",
        "backend/monitoring",
        "backend/security",
        "backend/schemas",
        "backend/utils",
        "backend/validators"
    ]
    
    for package in packages:
        init_file = backend_dir.parent / package / "__init__.py"
        if not init_file.exists():
            init_file.touch()
            print(f"✅ Created {init_file}")
        else:
            print(f"⚪ Already exists: {init_file}")

def check_imports():
    """Check for problematic relative imports."""
    backend_dir = Path(__file__).parent.parent.parent / "backend"
    
    problematic_files = []
    
    for py_file in backend_dir.rglob("*.py"):
        if ".venv" in str(py_file) or "__pycache__" in str(py_file):
            continue
            
        try:
            with open(py_file, 'r', encoding='utf-8') as f:
                content = f.read()
                
            # Check for deep relative imports
            if "from .." in content:
                lines_with_imports = []
                for i, line in enumerate(content.split('\n'), 1):
                    if "from .." in line:
                        lines_with_imports.append(f"  Line {i}: {line.strip()}")
                
                if lines_with_imports:
                    problematic_files.append({
                        'file': py_file,
                        'imports': lines_with_imports
                    })
                    
        except Exception as e:
            print(f"⚠️  Error reading {py_file}: {e}")
    
    if problematic_files:
        print(f"\n🔍 Found {len(problematic_files)} files with relative imports:")
        for item in problematic_files[:5]:  # Show first 5
            print(f"\n📄 {item['file']}")
            for imp in item['imports']:
                print(imp)
    else:
        print("✅ No problematic relative imports found")
    
    return problematic_files

def main():
    print("🚀 Setting up Python backend package structure...")
    
    # Create __init__.py files
    create_init_files()
    
    print("\n🔍 Checking current import patterns...")
    problematic_files = check_imports()
    
    if problematic_files:
        print(f"\n⚠️  Found {len(problematic_files)} files that may need import updates")
        print("Consider using absolute imports like: from backend.services import ...")
    
    print("\n✅ Python package structure setup complete!")
    print("\nNext steps:")
    print("1. Update imports to use 'from backend.module import ...'")
    print("2. Add 'backend' directory to PYTHONPATH in deployment")
    print("3. Test imports: python -c 'import backend.api; print(\"OK\")'")

if __name__ == "__main__":
    main()