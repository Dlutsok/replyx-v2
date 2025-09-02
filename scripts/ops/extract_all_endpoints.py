#!/usr/bin/env python3
"""
Скрипт для извлечения всех API endpoints из кода и генерации документации
"""

import os
import re
from pathlib import Path
from typing import Dict, List, Set, Tuple
import ast

class EndpointExtractor:
    def __init__(self, project_root: str):
        self.project_root = Path(project_root)
        self.backend_dir = self.project_root / "backend"
        self.api_dir = self.backend_dir / "api"
        
    def extract_all_endpoints(self) -> Dict[str, List[Dict]]:
        """Извлечь все endpoints из API файлов"""
        endpoints_by_module = {}
        
        for py_file in self.api_dir.glob("*.py"):
            if py_file.name == "__init__.py":
                continue
                
            module_name = py_file.stem
            endpoints = self._extract_from_file(py_file)
            
            if endpoints:
                endpoints_by_module[module_name] = endpoints
                print(f"📁 {module_name}: {len(endpoints)} endpoints")
                
        return endpoints_by_module
    
    def _extract_from_file(self, file_path: Path) -> List[Dict]:
        """Извлечь endpoints из одного файла"""
        try:
            content = file_path.read_text(encoding='utf-8')
            endpoints = []
            
            # Найти все роутеры с их параметрами
            pattern = r'@router\.(get|post|put|delete|patch)\(["\']([^"\']+)["\'][^)]*\)\s*(?:@[^\n]*\s*)*def\s+(\w+)\('
            matches = re.findall(pattern, content, re.MULTILINE | re.DOTALL)
            
            for method, path, func_name in matches:
                # Извлечь описание из docstring
                description = self._extract_docstring(content, func_name)
                
                # Определить требования авторизации
                auth_required = self._check_auth_required(content, func_name)
                admin_required = self._check_admin_required(content, func_name)
                
                # Извлечь дополнительную информацию
                parameters = self._extract_parameters(content, func_name)
                response_model = self._extract_response_model(content, func_name)
                
                # Добавить префикс /api если его нет
                if not path.startswith('/api') and not path.startswith('/'):
                    path = f"/api/{path}"
                elif path.startswith('/') and not path.startswith('/api'):
                    path = f"/api{path}"
                
                endpoint = {
                    'method': method.upper(),
                    'path': path,
                    'function': func_name,
                    'description': description or f"{func_name.replace('_', ' ').title()}",
                    'auth_required': auth_required,
                    'admin_required': admin_required,
                    'parameters': parameters,
                    'response_model': response_model
                }
                
                endpoints.append(endpoint)
                
            return endpoints
            
        except Exception as e:
            print(f"⚠️ Error processing {file_path}: {e}")
            return []
    
    def _extract_docstring(self, content: str, func_name: str) -> str:
        """Извлечь docstring функции"""
        try:
            # Найти функцию и её docstring
            func_pattern = rf'def\s+{func_name}\([^:]*\):\s*"""([^"]+)"""'
            match = re.search(func_pattern, content, re.MULTILINE | re.DOTALL)
            if match:
                return match.group(1).strip().split('\n')[0]  # Первая строка
                
            # Альтернативный поиск с одинарными кавычками
            func_pattern = rf'def\s+{func_name}\([^:]*\):\s*\'\'\'([^\']+)\'\'\''
            match = re.search(func_pattern, content, re.MULTILINE | re.DOTALL)
            if match:
                return match.group(1).strip().split('\n')[0]
                
        except Exception:
            pass
            
        return ""
    
    def _extract_parameters(self, content: str, func_name: str) -> List[Dict]:
        """Извлечь параметры функции из сигнатуры"""
        try:
            # Найти функцию
            func_start = content.find(f"def {func_name}(")
            if func_start == -1:
                return []
            
            # Найти конец сигнатуры функции
            paren_count = 0
            i = func_start + len(f"def {func_name}")
            while i < len(content):
                if content[i] == '(':
                    paren_count += 1
                elif content[i] == ')':
                    paren_count -= 1
                    if paren_count == 0:
                        break
                i += 1
            
            # Извлечь сигнатуру
            signature = content[func_start:i+1]
            
            # Найти параметры с типами
            params = []
            # Ищем Query, Path, Body параметры
            query_pattern = r'(\w+):\s*\w+\s*=\s*Query\([^)]*\)'
            path_pattern = r'(\w+):\s*\w+\s*=\s*Path\([^)]*\)'
            body_pattern = r'(\w+):\s*(\w+)\s*=\s*Body\([^)]*\)'
            
            for pattern, param_type in [(query_pattern, 'query'), (path_pattern, 'path'), (body_pattern, 'body')]:
                matches = re.findall(pattern, signature)
                for match in matches:
                    if isinstance(match, tuple):
                        param_name = match[0]
                        param_data_type = match[1] if len(match) > 1 else 'str'
                    else:
                        param_name = match
                        param_data_type = 'str'
                    
                    params.append({
                        'name': param_name,
                        'type': param_type,
                        'data_type': param_data_type,
                        'required': True
                    })
            
            return params
            
        except Exception:
            return []
    
    def _extract_response_model(self, content: str, func_name: str) -> str:
        """Извлечь response_model из декоратора"""
        try:
            # Найти декоратор роутера для функции
            func_start = content.find(f"def {func_name}(")
            if func_start == -1:
                return ""
            
            # Ищем декоратор выше функции
            lines = content[:func_start].split('\n')
            for line in reversed(lines[-10:]):  # Последние 10 строк
                if 'response_model=' in line:
                    match = re.search(r'response_model=([^,)]+)', line)
                    if match:
                        return match.group(1).strip()
            
            return ""
            
        except Exception:
            return ""
    
    def _check_auth_required(self, content: str, func_name: str) -> bool:
        """Проверить требуется ли авторизация"""
        func_start = content.find(f"def {func_name}(")
        if func_start == -1:
            return False
            
        # Найти конец функции (следующая функция или конец файла)
        next_func = content.find("\ndef ", func_start + 1)
        func_content = content[func_start:next_func if next_func != -1 else len(content)]
        
        # Проверить наличие зависимостей авторизации
        auth_patterns = [
            r'get_current_user',
            r'get_current_admin',
            r'auth\.get_current_user',
            r'auth\.get_current_admin'
        ]
        
        return any(re.search(pattern, func_content) for pattern in auth_patterns)
    
    def _check_admin_required(self, content: str, func_name: str) -> bool:
        """Проверить требуются ли права администратора"""
        func_start = content.find(f"def {func_name}(")
        if func_start == -1:
            return False
            
        # Найти конец функции
        next_func = content.find("\ndef ", func_start + 1)
        func_content = content[func_start:next_func if next_func != -1 else len(content)]
        
        # Проверить наличие admin зависимостей
        admin_patterns = [
            r'get_current_admin',
            r'auth\.get_current_admin'
        ]
        
        return any(re.search(pattern, func_content) for pattern in admin_patterns)
    
    def generate_markdown_table(self, endpoints: List[Dict], title: str) -> str:
        """Генерация markdown таблицы для endpoints с расширенной информацией"""
        if not endpoints:
            return ""
            
        markdown = f"\n### {title}\n\n"
        
        for endpoint in sorted(endpoints, key=lambda x: (x['path'], x['method'])):
            auth_status = "Yes"
            if endpoint['admin_required']:
                auth_status = "Yes (Admin)"
            elif not endpoint['auth_required']:
                auth_status = "No"
            
            # Базовая информация
            markdown += f"#### {endpoint['method']} {endpoint['path']}\n\n"
            markdown += f"**Description:** {endpoint['description']}\n"
            markdown += f"**Authentication:** {auth_status}\n"
            
            # Параметры
            if endpoint.get('parameters'):
                markdown += f"**Parameters:**\n"
                for param in endpoint['parameters']:
                    required = "required" if param.get('required') else "optional"
                    markdown += f"- `{param['name']}` ({param['type']}, {param['data_type']}) - {required}\n"
            
            # Response model
            if endpoint.get('response_model'):
                markdown += f"**Response Model:** {endpoint['response_model']}\n"
            
            markdown += "\n---\n\n"
        
        return markdown
    
    def generate_full_documentation(self, endpoints_by_module: Dict[str, List[Dict]]) -> str:
        """Генерация полной документации"""
        doc = """# Complete API Endpoints Reference

**Last Updated:** 2025-01-23  
**📊 Total Endpoints:** {total_endpoints} endpoints across {total_modules} API modules  
**🔄 Auto-generated:** From codebase analysis

Comprehensive reference for all ChatAI backend API endpoints.

**Base URL:** `https://api.chatai.com` (production) / `http://localhost:8000` (development)

## Authentication

Most endpoints require JWT authentication via `Authorization: Bearer <token>` header.  
Admin endpoints additionally require admin role privileges.

""".format(
            total_endpoints=sum(len(eps) for eps in endpoints_by_module.values()),
            total_modules=len(endpoints_by_module)
        )
        
        # Группировка endpoints по категориям
        categories = {
            'auth': 'Authentication & Authorization',
            'users': 'User Management', 
            'assistants': 'Assistant Management',
            'dialogs': 'Dialog Management',
            'documents': 'Document Management',
            'bots': 'Bot Management',
            'balance': 'Balance & Billing',
            'admin': 'Admin Operations',
            'ai_chat': 'AI Chat',
            'handoff': 'Operator Handoff',
            'site': 'Site Integration',
            'websockets': 'WebSocket Connections',
            'system': 'System & Health',
            'email': 'Email Services',
            'promo': 'Promotions',
            'referral': 'Referral System',
            'support': 'Support System',
            'tokens': 'Token Management'
        }
        
        for module_name, category_title in categories.items():
            if module_name in endpoints_by_module:
                endpoints = endpoints_by_module[module_name]
                doc += self.generate_markdown_table(endpoints, f"{category_title} (`/api/{module_name}`)")
        
        # Добавить статистику
        doc += "\n## API Statistics\n\n"
        doc += "| Module | Endpoints | Auth Required | Admin Only |\n"
        doc += "|--------|-----------|---------------|------------|\n"
        
        for module_name, endpoints in endpoints_by_module.items():
            auth_count = sum(1 for ep in endpoints if ep['auth_required'])
            admin_count = sum(1 for ep in endpoints if ep['admin_required'])
            doc += f"| {module_name} | {len(endpoints)} | {auth_count} | {admin_count} |\n"
        
        doc += f"\n**Total:** {sum(len(eps) for eps in endpoints_by_module.values())} endpoints\n"
        
        return doc

def main():
    project_root = os.getcwd()
    extractor = EndpointExtractor(project_root)
    
    print("🔍 Extracting all API endpoints...")
    endpoints_by_module = extractor.extract_all_endpoints()
    
    total_endpoints = sum(len(eps) for eps in endpoints_by_module.values())
    print(f"\n📊 Found {total_endpoints} endpoints across {len(endpoints_by_module)} modules")
    
    # Генерация документации
    print("📝 Generating documentation...")
    documentation = extractor.generate_full_documentation(endpoints_by_module)
    
    # Сохранение в файл
    docs_dir = Path(project_root) / "docs" / "api"
    docs_dir.mkdir(exist_ok=True, parents=True)
    
    output_file = docs_dir / "endpoints_complete.md"
    output_file.write_text(documentation, encoding='utf-8')
    
    print(f"✅ Documentation saved to: {output_file}")
    print(f"📊 Total endpoints documented: {total_endpoints}")
    
    # Обновить основной файл endpoints.md
    main_endpoints_file = docs_dir / "endpoints.md"
    if main_endpoints_file.exists():
        # Добавить ссылку на полную документацию
        existing_content = main_endpoints_file.read_text(encoding='utf-8')
        
        # Обновить метаинформацию
        updated_content = re.sub(
            r'\*\*📊 Total Endpoints:\*\* \d+ endpoints across \d+ API modules',
            f'**📊 Total Endpoints:** {total_endpoints} endpoints across {len(endpoints_by_module)} API modules',
            existing_content
        )
        
        # Добавить ссылку на полную документацию если её нет
        if "endpoints_complete.md" not in updated_content:
            link_text = f"\n> 📋 **[Complete API Reference](endpoints_complete.md)** - Full auto-generated documentation of all {total_endpoints} endpoints\n\n"
            # Вставить после первого заголовка
            updated_content = re.sub(
                r'(# API Endpoints Reference\n\n[^\n]*\n)',
                r'\1' + link_text,
                updated_content
            )
        
        main_endpoints_file.write_text(updated_content, encoding='utf-8')
        print(f"✅ Updated main endpoints.md with link to complete documentation")

if __name__ == "__main__":
    main()
