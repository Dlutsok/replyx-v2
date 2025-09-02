#!/usr/bin/env python3
"""
Скрипт автоматической проверки актуальности документации ChatAI MVP 9
Проверяет соответствие документации реальному коду.
"""

import os
import re
import json
import subprocess
from pathlib import Path
from typing import Dict, List, Set
from datetime import datetime


class DocumentationChecker:
    def __init__(self, project_root: str):
        self.project_root = Path(project_root)
        self.backend_dir = self.project_root / "backend"
        self.docs_dir = self.project_root / "docs"
        self.issues: List[str] = []
        
    def check_api_endpoints(self) -> Dict[str, any]:
        """Проверка соответствия API endpoints документации"""
        print("🔍 Checking API endpoints...")
        
        # Найти все endpoints в коде
        code_endpoints = self._extract_endpoints_from_code()
        
        # Найти endpoints в документации
        doc_endpoints = self._extract_endpoints_from_docs()
        
        missing_in_docs = code_endpoints - doc_endpoints
        extra_in_docs = doc_endpoints - code_endpoints
        
        if missing_in_docs:
            self.issues.append(f"📝 Missing in docs: {missing_in_docs}")
            
        if extra_in_docs:
            self.issues.append(f"🗑️ Extra in docs: {extra_in_docs}")
            
        return {
            "code_endpoints": len(code_endpoints),
            "doc_endpoints": len(doc_endpoints),
            "missing_in_docs": list(missing_in_docs),
            "extra_in_docs": list(extra_in_docs),
            "coverage": len(code_endpoints & doc_endpoints) / len(code_endpoints) * 100 if code_endpoints else 100
        }
    
    def check_dependency_versions(self) -> Dict[str, any]:
        """Проверка версий зависимостей"""
        print("📦 Checking dependency versions...")
        
        # Читать requirements.txt
        requirements_file = self.backend_dir / "requirements.txt"
        if not requirements_file.exists():
            self.issues.append("❌ requirements.txt not found")
            return {}
            
        requirements = self._parse_requirements(requirements_file)
        
        # Проверить версии в technology-stack.md
        tech_stack_file = self.docs_dir / "architecture" / "technology-stack.md"
        if not tech_stack_file.exists():
            self.issues.append("❌ technology-stack.md not found")
            return {}
            
        doc_versions = self._parse_versions_from_tech_stack(tech_stack_file)
        
        mismatches = []
        for package, req_version in requirements.items():
            doc_version = doc_versions.get(package)
            if doc_version and doc_version != req_version:
                mismatches.append(f"{package}: req={req_version}, doc={doc_version}")
                
        if mismatches:
            self.issues.append(f"📦 Version mismatches: {mismatches}")
            
        return {
            "requirements_packages": len(requirements),
            "documented_packages": len(doc_versions),
            "mismatches": mismatches,
            "coverage": len([p for p in requirements if p in doc_versions]) / len(requirements) * 100
        }
    
    def check_security_config(self) -> Dict[str, any]:
        """Проверка соответствия security конфигурации"""
        print("🔒 Checking security configuration...")
        
        # Проверить CSRF defaults в коде
        main_file = self.backend_dir / "main.py"
        csrf_default = self._extract_csrf_default(main_file)
        
        # Проверить документацию
        auth_doc = self.docs_dir / "security" / "authentication.md"
        csrf_documented = self._check_csrf_documentation(auth_doc)
        
        issues = []
        if csrf_default == 'false':
            if not csrf_documented:
                issues.append("⚠️ CSRF disabled by default but not documented")
            else:
                print("✅ CSRF warning properly documented")
        
        return {
            "csrf_default": csrf_default,
            "csrf_documented": csrf_documented,
            "security_issues": issues
        }
    
    def check_file_dates(self) -> Dict[str, any]:
        """Проверка дат обновления файлов"""
        print("📅 Checking file update dates...")
        
        old_files = []
        recent_files = []
        cutoff_date = datetime.now().timestamp() - (30 * 24 * 60 * 60)  # 30 days
        
        for doc_file in self.docs_dir.rglob("*.md"):
            mtime = doc_file.stat().st_mtime
            if mtime < cutoff_date:
                old_files.append(str(doc_file.relative_to(self.project_root)))
            else:
                recent_files.append(str(doc_file.relative_to(self.project_root)))
                
        if len(old_files) > 5:  # Threshold
            self.issues.append(f"📅 {len(old_files)} files older than 30 days")
            
        return {
            "total_docs": len(old_files) + len(recent_files),
            "recent_files": len(recent_files),
            "old_files": len(old_files),
            "old_file_list": old_files[:10]  # Top 10
        }
    
    def _extract_endpoints_from_code(self) -> Set[str]:
        """Извлечь endpoints из кода"""
        endpoints = set()
        api_dir = self.backend_dir / "api"
        
        if not api_dir.exists():
            return endpoints
            
        for py_file in api_dir.glob("*.py"):
            if py_file.name == "__init__.py":
                continue
                
            try:
                content = py_file.read_text(encoding='utf-8')
                # Найти роутеры: @router.get("/path"), @router.post("/path") и т.д.
                pattern = r'@router\.(get|post|put|delete|patch)\(["\']([^"\']+)["\']'
                matches = re.findall(pattern, content)
                for method, path in matches:
                    endpoints.add(f"{method.upper()} {path}")
            except Exception as e:
                print(f"⚠️ Error reading {py_file}: {e}")
                
        return endpoints
    
    def _extract_endpoints_from_docs(self) -> Set[str]:
        """Извлечь endpoints из документации"""
        endpoints = set()
        endpoints_file = self.docs_dir / "api" / "endpoints.md"
        
        if not endpoints_file.exists():
            return endpoints
            
        try:
            content = endpoints_file.read_text(encoding='utf-8')
            # Найти таблицы с endpoints: | `GET` | `/api/path` |
            pattern = r'\|\s*`(\w+)`\s*\|\s*`([^`]+)`\s*\|'
            matches = re.findall(pattern, content)
            for method, path in matches:
                endpoints.add(f"{method.upper()} {path}")
        except Exception as e:
            print(f"⚠️ Error reading endpoints.md: {e}")
            
        return endpoints
    
    def _parse_requirements(self, requirements_file: Path) -> Dict[str, str]:
        """Парсинг requirements.txt"""
        requirements = {}
        try:
            content = requirements_file.read_text(encoding='utf-8')
            for line in content.split('\n'):
                line = line.strip()
                if line and not line.startswith('#'):
                    if '==' in line:
                        package, version = line.split('==', 1)
                        requirements[package.strip()] = version.strip()
        except Exception as e:
            print(f"⚠️ Error parsing requirements.txt: {e}")
            
        return requirements
    
    def _parse_versions_from_tech_stack(self, tech_file: Path) -> Dict[str, str]:
        """Парсинг версий из technology-stack.md"""
        versions = {}
        try:
            content = tech_file.read_text(encoding='utf-8')
            # Найти версии: #### FastAPI (0.111.0)
            pattern = r'#### (\w+)\s*\(([^)]+)\)'
            matches = re.findall(pattern, content)
            for package, version in matches:
                versions[package.lower()] = version
        except Exception as e:
            print(f"⚠️ Error parsing technology-stack.md: {e}")
            
        return versions
    
    def _extract_csrf_default(self, main_file: Path) -> str:
        """Извлечь CSRF default из main.py"""
        if not main_file.exists():
            return "unknown"
            
        try:
            content = main_file.read_text(encoding='utf-8')
            # Найти: enable_csrf = os.getenv('ENABLE_CSRF_PROTECTION', 'false')
            pattern = r"enable_csrf\s*=\s*os\.getenv\(['\"]ENABLE_CSRF_PROTECTION['\"],\s*['\"]([^'\"]+)['\"]"
            match = re.search(pattern, content)
            if match:
                return match.group(1)
        except Exception as e:
            print(f"⚠️ Error reading main.py: {e}")
            
        return "unknown"
    
    def _check_csrf_documentation(self, auth_file: Path) -> bool:
        """Проверить документацию CSRF"""
        if not auth_file.exists():
            return False
            
        try:
            content = auth_file.read_text(encoding='utf-8')
            # Проверить наличие предупреждения
            return "КРИТИЧЕСКОЕ ПРЕДУПРЕЖДЕНИЕ" in content and "ОТКЛЮЧЕНА ПО УМОЛЧАНИЮ" in content
        except Exception as e:
            print(f"⚠️ Error reading authentication.md: {e}")
            
        return False
    
    def generate_report(self) -> Dict[str, any]:
        """Генерация полного отчета"""
        print("📋 Generating documentation currency report...")
        
        report = {
            "timestamp": datetime.now().isoformat(),
            "project_root": str(self.project_root),
            "checks": {}
        }
        
        # Выполнить все проверки
        report["checks"]["api_endpoints"] = self.check_api_endpoints()
        report["checks"]["dependency_versions"] = self.check_dependency_versions()
        report["checks"]["security_config"] = self.check_security_config()
        report["checks"]["file_dates"] = self.check_file_dates()
        
        # Общая оценка
        total_issues = len(self.issues)
        if total_issues == 0:
            report["overall_status"] = "✅ EXCELLENT"
            report["grade"] = "A+"
        elif total_issues <= 2:
            report["overall_status"] = "✅ GOOD"
            report["grade"] = "A"
        elif total_issues <= 5:
            report["overall_status"] = "⚠️ NEEDS_ATTENTION"
            report["grade"] = "B"
        else:
            report["overall_status"] = "🔴 CRITICAL_ISSUES"
            report["grade"] = "C"
            
        report["issues"] = self.issues
        report["total_issues"] = total_issues
        
        return report
    
    def print_summary(self, report: Dict[str, any]):
        """Печать краткого отчета"""
        print("\n" + "="*60)
        print("📋 DOCUMENTATION CURRENCY REPORT")
        print("="*60)
        print(f"🎯 Overall Status: {report['overall_status']}")
        print(f"📊 Grade: {report['grade']}")
        print(f"⚠️ Issues Found: {report['total_issues']}")
        print()
        
        # API Coverage
        api_check = report["checks"]["api_endpoints"]
        print(f"📡 API Coverage: {api_check['coverage']:.1f}% ({api_check['code_endpoints']} endpoints)")
        
        # Dependencies
        deps_check = report["checks"]["dependency_versions"]
        if deps_check:
            print(f"📦 Dependency Coverage: {deps_check['coverage']:.1f}%")
        
        # Security
        security_check = report["checks"]["security_config"]
        csrf_status = "✅ Documented" if security_check['csrf_documented'] else "⚠️ Missing"
        print(f"🔒 CSRF Documentation: {csrf_status}")
        
        # File freshness
        files_check = report["checks"]["file_dates"]
        fresh_ratio = files_check['recent_files'] / files_check['total_docs'] * 100
        print(f"📅 File Freshness: {fresh_ratio:.1f}% recent")
        
        if self.issues:
            print("\n🔍 Issues Found:")
            for issue in self.issues:
                print(f"  • {issue}")
        
        print("\n✅ Report completed!")


def main():
    """Основная функция"""
    project_root = os.getcwd()
    checker = DocumentationChecker(project_root)
    
    print("🚀 Starting documentation currency check...")
    print(f"📁 Project root: {project_root}")
    
    # Генерировать отчет
    report = checker.generate_report()
    
    # Сохранить JSON отчет
    report_file = Path(project_root) / "docs" / "documentation_currency_check.json"
    try:
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        print(f"💾 Full report saved to: {report_file}")
    except Exception as e:
        print(f"⚠️ Could not save report: {e}")
    
    # Печать сводки
    checker.print_summary(report)
    
    # Exit code
    exit_code = 0 if report['total_issues'] <= 2 else 1
    exit(exit_code)


if __name__ == "__main__":
    main()


