#!/usr/bin/env python3
"""
Анализатор миграций Alembic для выявления проблем и оптимизации
"""

import os
import re
import ast
import json
import hashlib
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Tuple
import argparse

# Путь к миграциям
MIGRATIONS_DIR = Path(__file__).parent.parent.parent / "alembic" / "versions"

class MigrationAnalyzer:
    def __init__(self, migrations_dir: Path):
        self.migrations_dir = migrations_dir
        self.migrations = []
        self.issues = []
        
    def load_migrations(self) -> List[Dict[str, Any]]:
        """Загружает все миграции из папки"""
        print(f"Анализируем миграции в: {self.migrations_dir}")
        
        migrations = []
        for file_path in self.migrations_dir.glob("*.py"):
            if file_path.name == "__init__.py":
                continue
                
            try:
                migration_info = self._parse_migration_file(file_path)
                migrations.append(migration_info)
            except Exception as e:
                print(f"Ошибка парсинга {file_path.name}: {e}")
        
        # Сортируем по дате создания файла
        migrations.sort(key=lambda x: x['created_at'])
        self.migrations = migrations
        return migrations
    
    def _parse_migration_file(self, file_path: Path) -> Dict[str, Any]:
        """Парсит файл миграции"""
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Извлекаем метаданные из комментариев
        revision_match = re.search(r'revision = [\'"]([^\'"]+)[\'"]', content)
        down_revision_match = re.search(r'down_revision = [\'"]([^\'"]+)[\'"]', content)
        create_date_match = re.search(r'create_date = datetime\.datetime\(([^)]+)\)', content)
        
        # Анализируем SQL операции
        operations = self._extract_operations(content)
        
        return {
            'filename': file_path.name,
            'filepath': file_path,
            'revision': revision_match.group(1) if revision_match else None,
            'down_revision': down_revision_match.group(1) if down_revision_match else None,
            'create_date': create_date_match.group(1) if create_date_match else None,
            'created_at': file_path.stat().st_mtime,
            'size': file_path.stat().st_size,
            'content': content,
            'operations': operations,
            'is_merge': 'merge' in file_path.name.lower(),
            'complexity_score': self._calculate_complexity(operations)
        }
    
    def _extract_operations(self, content: str) -> List[Dict[str, Any]]:
        """Извлекает операции из миграции"""
        operations = []
        
        # Ищем вызовы op.*
        op_patterns = [
            (r'op\.create_table\([\'"]([^\'"]+)[\'"]', 'create_table'),
            (r'op\.drop_table\([\'"]([^\'"]+)[\'"]', 'drop_table'),  
            (r'op\.add_column\([\'"]([^\'"]+)[\'"]', 'add_column'),
            (r'op\.drop_column\([\'"]([^\'"]+)[\'"]', 'drop_column'),
            (r'op\.create_index\([\'"]([^\'"]+)[\'"]', 'create_index'),
            (r'op\.drop_index\([\'"]([^\'"]+)[\'"]', 'drop_index'),
            (r'op\.alter_column\(', 'alter_column'),
            (r'op\.execute\(', 'execute_sql'),
        ]
        
        for pattern, op_type in op_patterns:
            matches = re.finditer(pattern, content)
            for match in matches:
                table_name = match.group(1) if match.groups() else None
                operations.append({
                    'type': op_type,
                    'table': table_name,
                    'line': content[:match.start()].count('\n') + 1
                })
        
        return operations
    
    def _calculate_complexity(self, operations: List[Dict[str, Any]]) -> int:
        """Рассчитывает сложность миграции"""
        complexity = 0
        weights = {
            'create_table': 2,
            'drop_table': 3,
            'add_column': 1,
            'drop_column': 2, 
            'create_index': 1,
            'drop_index': 1,
            'alter_column': 3,
            'execute_sql': 5
        }
        
        for op in operations:
            complexity += weights.get(op['type'], 1)
        
        return complexity
    
    def analyze_issues(self) -> List[Dict[str, Any]]:
        """Анализирует проблемы в миграциях"""
        issues = []
        
        # 1. Merge heads
        merge_migrations = [m for m in self.migrations if m['is_merge']]
        if merge_migrations:
            issues.append({
                'type': 'merge_conflicts',
                'severity': 'high',
                'count': len(merge_migrations),
                'description': f'Найдено {len(merge_migrations)} merge миграций',
                'files': [m['filename'] for m in merge_migrations]
            })
        
        # 2. Множественные операции с одной таблицей
        table_operations = {}
        for migration in self.migrations:
            for op in migration['operations']:
                if op['table']:
                    table_name = op['table']
                    if table_name not in table_operations:
                        table_operations[table_name] = []
                    table_operations[table_name].append({
                        'migration': migration['filename'],
                        'operation': op['type']
                    })
        
        # Ищем таблицы с множественными операциями
        for table, ops in table_operations.items():
            if len(ops) > 5:  # Порог для "слишком много операций"
                issues.append({
                    'type': 'excessive_table_operations',
                    'severity': 'medium',
                    'table': table,
                    'operations_count': len(ops),
                    'description': f'Таблица {table} модифицировалась {len(ops)} раз',
                    'operations': ops
                })
        
        # 3. Противоречивые операции (create/drop одной и той же таблицы)
        table_lifecycle = {}
        for migration in self.migrations:
            for op in migration['operations']:
                if op['table'] and op['type'] in ['create_table', 'drop_table']:
                    table = op['table']
                    if table not in table_lifecycle:
                        table_lifecycle[table] = []
                    table_lifecycle[table].append({
                        'migration': migration['filename'],
                        'operation': op['type'],
                        'date': migration['created_at']
                    })
        
        for table, lifecycle in table_lifecycle.items():
            creates = [op for op in lifecycle if op['operation'] == 'create_table']
            drops = [op for op in lifecycle if op['operation'] == 'drop_table']
            
            if len(creates) > 1 or len(drops) > 1:
                issues.append({
                    'type': 'table_recreation',
                    'severity': 'high',
                    'table': table,
                    'description': f'Таблица {table} создавалась/удалялась несколько раз',
                    'lifecycle': lifecycle
                })
        
        # 4. Очень большие миграции (потенциально медленные)
        large_migrations = [m for m in self.migrations if m['complexity_score'] > 20]
        if large_migrations:
            issues.append({
                'type': 'complex_migrations',
                'severity': 'medium',
                'count': len(large_migrations),
                'description': f'Найдено {len(large_migrations)} сложных миграций',
                'migrations': [(m['filename'], m['complexity_score']) for m in large_migrations]
            })
        
        # 5. Отсутствующие down_revision связи
        orphaned_migrations = [m for m in self.migrations if not m['down_revision'] and not m['is_merge']]
        if len(orphaned_migrations) > 1:  # Первая миграция может не иметь down_revision
            issues.append({
                'type': 'orphaned_migrations', 
                'severity': 'medium',
                'count': len(orphaned_migrations) - 1,
                'description': f'Миграции без down_revision связи',
                'files': [m['filename'] for m in orphaned_migrations[1:]]
            })
        
        self.issues = issues
        return issues
    
    def generate_consolidation_plan(self) -> Dict[str, Any]:
        """Генерирует план консолидации миграций"""
        if not self.migrations:
            return {}
        
        # Группируем миграции по периодам
        periods = self._group_by_periods()
        
        # Определяем кандидатов на консолидацию
        consolidation_candidates = []
        
        for period_name, period_migrations in periods.items():
            if len(period_migrations) > 5:  # Период с множественными миграциями
                # Анализируем можно ли объединить
                table_changes = {}
                for migration in period_migrations:
                    for op in migration['operations']:
                        if op['table']:
                            table_name = op['table']
                            if table_name not in table_changes:
                                table_changes[table_name] = []
                            table_changes[table_name].append(op)
                
                consolidation_candidates.append({
                    'period': period_name,
                    'migrations_count': len(period_migrations),
                    'migrations': [m['filename'] for m in period_migrations],
                    'table_changes': table_changes,
                    'complexity_total': sum(m['complexity_score'] for m in period_migrations),
                    'can_consolidate': self._can_consolidate_period(period_migrations)
                })
        
        return {
            'total_migrations': len(self.migrations),
            'consolidation_candidates': consolidation_candidates,
            'estimated_reduction': self._estimate_reduction(consolidation_candidates),
            'recommended_approach': self._recommend_consolidation_approach()
        }
    
    def _group_by_periods(self) -> Dict[str, List[Dict[str, Any]]]:
        """Группирует миграции по временным периодам"""
        periods = {}
        
        for migration in self.migrations:
            # Группируем по месяцам
            date = datetime.fromtimestamp(migration['created_at'])
            period_key = f"{date.year}-{date.month:02d}"
            
            if period_key not in periods:
                periods[period_key] = []
            periods[period_key].append(migration)
        
        return periods
    
    def _can_consolidate_period(self, migrations: List[Dict[str, Any]]) -> bool:
        """Определяет можно ли консолидировать миграции периода"""
        # Простая эвристика: если нет противоречивых операций
        table_operations = {}
        
        for migration in migrations:
            for op in migration['operations']:
                if op['table']:
                    table = op['table']
                    if table not in table_operations:
                        table_operations[table] = []
                    table_operations[table].append(op['type'])
        
        # Проверяем на противоречия
        for table, ops in table_operations.items():
            # Если есть create и drop одной таблицы - сложно консолидировать
            if 'create_table' in ops and 'drop_table' in ops:
                return False
            
            # Если много alter_column - может быть сложно
            if ops.count('alter_column') > 3:
                return False
        
        return True
    
    def _estimate_reduction(self, candidates: List[Dict[str, Any]]) -> Dict[str, int]:
        """Оценивает возможное сокращение миграций"""
        total_can_consolidate = sum(
            len(c['migrations']) for c in candidates if c['can_consolidate']
        )
        
        estimated_result = max(1, total_can_consolidate // 3)  # Консолидируем в ~3 раза меньше
        
        return {
            'current_count': len(self.migrations),
            'can_consolidate': total_can_consolidate,
            'estimated_result': len(self.migrations) - total_can_consolidate + estimated_result,
            'reduction_percent': round((total_can_consolidate - estimated_result) / len(self.migrations) * 100, 1)
        }
    
    def _recommend_consolidation_approach(self) -> str:
        """Рекомендует подход к консолидации"""
        if len(self.migrations) < 10:
            return "manual_review"
        elif len(self.migrations) < 30:
            return "period_consolidation"  # По периодам
        else:
            return "schema_snapshot"  # Создать чистый снапшот схемы
    
    def generate_report(self, output_file: str = None) -> Dict[str, Any]:
        """Генерирует полный отчет по анализу"""
        report = {
            'analysis_date': datetime.now().isoformat(),
            'migrations_total': len(self.migrations),
            'migrations_directory': str(self.migrations_dir),
            'summary': {
                'total_files': len(self.migrations),
                'merge_migrations': len([m for m in self.migrations if m['is_merge']]),
                'total_complexity': sum(m['complexity_score'] for m in self.migrations),
                'average_complexity': round(sum(m['complexity_score'] for m in self.migrations) / len(self.migrations), 2) if self.migrations else 0,
                'total_size_kb': round(sum(m['size'] for m in self.migrations) / 1024, 2)
            },
            'issues': self.issues,
            'consolidation_plan': self.generate_consolidation_plan(),
            'migrations_list': [
                {
                    'filename': m['filename'],
                    'complexity': m['complexity_score'],
                    'operations_count': len(m['operations']),
                    'is_merge': m['is_merge'],
                    'size_bytes': m['size']
                }
                for m in self.migrations
            ]
        }
        
        # Сохраняем отчет в файл
        if output_file:
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(report, f, ensure_ascii=False, indent=2)
            print(f"Отчет сохранен в: {output_file}")
        
        return report
    
    def print_summary(self):
        """Выводит краткую сводку в консоль"""
        print(f"\n{'='*60}")
        print(f"АНАЛИЗ МИГРАЦИЙ CHATAI")
        print(f"{'='*60}")
        print(f"Всего миграций: {len(self.migrations)}")
        print(f"Merge миграций: {len([m for m in self.migrations if m['is_merge']])}")
        
        if self.issues:
            print(f"\n🔥 НАЙДЕННЫЕ ПРОБЛЕМЫ:")
            for issue in self.issues:
                severity_icon = "🚨" if issue['severity'] == 'high' else "⚠️"
                print(f"{severity_icon} {issue['type']}: {issue['description']}")
        else:
            print(f"\n✅ Критических проблем не найдено")
        
        consolidation_plan = self.generate_consolidation_plan()
        if consolidation_plan.get('consolidation_candidates'):
            reduction = consolidation_plan['estimated_reduction']
            print(f"\n📊 ПЛАН КОНСОЛИДАЦИИ:")
            print(f"Текущее количество: {reduction['current_count']}")
            print(f"Можно консолидировать: {reduction['can_consolidate']}")
            print(f"Итоговое количество: {reduction['estimated_result']}")
            print(f"Сокращение на: {reduction['reduction_percent']}%")
        
        print(f"\n{'='*60}")

def main():
    parser = argparse.ArgumentParser(description='Анализ миграций Alembic')
    parser.add_argument('--migrations-dir', '-d', 
                       default=MIGRATIONS_DIR,
                       help='Путь к папке с миграциями')
    parser.add_argument('--output', '-o',
                       help='Файл для сохранения JSON отчета')
    parser.add_argument('--verbose', '-v', action='store_true',
                       help='Подробный вывод')
    
    args = parser.parse_args()
    
    analyzer = MigrationAnalyzer(Path(args.migrations_dir))
    
    print("Загружаем миграции...")
    migrations = analyzer.load_migrations()
    
    print("Анализируем проблемы...")
    issues = analyzer.analyze_issues()
    
    if args.verbose:
        print(f"\nЗагружено миграций: {len(migrations)}")
        for migration in migrations:
            print(f"  {migration['filename']}: {migration['complexity_score']} операций")
    
    # Выводим сводку
    analyzer.print_summary()
    
    # Генерируем полный отчет
    report = analyzer.generate_report(args.output)
    
    if not args.output:
        # Сохраняем в default файл
        default_output = Path(__file__).parent / f"migration_analysis_{datetime.now().strftime('%Y%m%d_%H%M')}.json"
        analyzer.generate_report(str(default_output))

if __name__ == '__main__':
    main()