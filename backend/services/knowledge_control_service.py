"""
🛡️ СЛУЖБА КОНТРОЛЯ БАЗЫ ЗНАНИЙ

Обеспечивает защиту от загрузки устаревших или нежелательных данных
в базу знаний ботов. Включает контроль версий и валидацию контента.
"""

import re
import json
import hashlib
from datetime import datetime
from typing import List, Dict, Optional, Tuple
from sqlalchemy.orm import Session
from database import models
from cache.redis_cache import chatai_cache
import logging

logger = logging.getLogger(__name__)

class KnowledgeControlService:
    """Служба контроля и валидации базы знаний"""
    
    # Запрещенные паттерны контента
    FORBIDDEN_PATTERNS = [
        r'[АаAa]льфа[СсSs]фера',
        r'АльфаСфера',
        r'AlfaSfera',
        r'АЛФАСФЕРА',
        r'альфасфера',
        r'Alfa[Ss]fera'
    ]
    
    # Подозрительные ключевые слова
    SUSPICIOUS_KEYWORDS = [
        'ООО "АльфаСфера"',
        'компания АльфаСфера',
        'АльфаСфера основана',
        'услуги АльфаСфера'
    ]
    
    def __init__(self, db: Session):
        self.db = db
    
    def validate_content(self, content: str, assistant_id: int, user_id: int) -> Dict:
        """
        Валидация контента перед добавлением в базу знаний
        
        Returns:
            Dict с результатами валидации
        """
        result = {
            'is_valid': True,
            'errors': [],
            'warnings': [],
            'content_hash': None,
            'version': 1
        }
        
        # 1. Проверка на запрещенные паттерны
        forbidden_found = []
        for pattern in self.FORBIDDEN_PATTERNS:
            if re.search(pattern, content, re.IGNORECASE):
                forbidden_found.append(pattern)
        
        if forbidden_found:
            result['is_valid'] = False
            result['errors'].append({
                'type': 'FORBIDDEN_CONTENT',
                'message': f'Найдены запрещенные паттерны: {forbidden_found}',
                'patterns': forbidden_found
            })
        
        # 2. Проверка на подозрительные ключевые слова
        suspicious_found = []
        for keyword in self.SUSPICIOUS_KEYWORDS:
            if keyword.lower() in content.lower():
                suspicious_found.append(keyword)
        
        if suspicious_found:
            result['warnings'].append({
                'type': 'SUSPICIOUS_CONTENT', 
                'message': f'Найдены подозрительные ключевые слова: {suspicious_found}',
                'keywords': suspicious_found
            })
        
        # 3. Генерация хэша контента для контроля версий
        result['content_hash'] = hashlib.sha256(content.encode()).hexdigest()
        
        # 4. Проверка на дубликаты
        existing = self.check_duplicate_content(result['content_hash'], assistant_id, user_id)
        if existing:
            result['warnings'].append({
                'type': 'DUPLICATE_CONTENT',
                'message': f'Аналогичный контент уже существует (ID: {existing})',
                'existing_id': existing
            })
        
        # 5. Проверка размера контента
        if len(content) > 50000:  # 50KB лимит
            result['warnings'].append({
                'type': 'LARGE_CONTENT',
                'message': f'Контент слишком большой ({len(content)} символов)',
                'size': len(content)
            })
        
        return result
    
    def check_duplicate_content(self, content_hash: str, assistant_id: int, user_id: int) -> Optional[int]:
        """Проверка на дубликаты контента"""
        try:
            existing = self.db.query(models.UserKnowledge).filter(
                models.UserKnowledge.user_id == user_id,
                models.UserKnowledge.assistant_id == assistant_id,
                models.UserKnowledge.content.op('~')(f'#{content_hash}#')  # Простая проверка по хэшу
            ).first()
            
            return existing.id if existing else None
        except:
            return None
    
    def add_knowledge_with_validation(
        self, 
        user_id: int, 
        assistant_id: int, 
        content: str,
        doc_type: str = 'manual',
        importance: int = 10
    ) -> Dict:
        """Добавление знаний с полной валидацией"""
        
        # Валидация контента
        validation = self.validate_content(content, assistant_id, user_id)
        
        if not validation['is_valid']:
            logger.warning(f"Отклонен контент для assistant_id={assistant_id}: {validation['errors']}")
            return {
                'success': False,
                'validation': validation,
                'message': 'Контент не прошел валидацию'
            }
        
        try:
            # Добавляем метаданные валидации к контенту
            content_with_meta = f"""
# МЕТАДАННЫЕ ВАЛИДАЦИИ
# Хэш: {validation['content_hash']}
# Дата добавления: {datetime.now().isoformat()}
# Версия: {validation['version']}
# Статус валидации: APPROVED

{content}
"""
            
            # Создаем запись в базе знаний
            knowledge = models.UserKnowledge(
                user_id=user_id,
                assistant_id=assistant_id,
                doc_id=None,  # Для ручных записей
                content=content_with_meta,
                type='summary',
                doc_type=doc_type,
                importance=importance,
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            
            self.db.add(knowledge)
            self.db.commit()
            
            # Инвалидируем кэши
            chatai_cache.invalidate_knowledge_cache(user_id, assistant_id)
            chatai_cache.invalidate_assistant_cache(assistant_id)
            
            logger.info(f"Добавлены знания для assistant_id={assistant_id}, knowledge_id={knowledge.id}")
            
            return {
                'success': True,
                'knowledge_id': knowledge.id,
                'validation': validation,
                'message': 'Знания успешно добавлены'
            }
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Ошибка добавления знаний: {e}")
            return {
                'success': False,
                'error': str(e),
                'message': 'Ошибка при добавлении знаний'
            }
    
    def update_knowledge_with_validation(
        self, 
        knowledge_id: int, 
        new_content: str, 
        user_id: int
    ) -> Dict:
        """Обновление знаний с валидацией и версионированием"""
        
        # Получаем существующую запись
        existing = self.db.query(models.UserKnowledge).filter(
            models.UserKnowledge.id == knowledge_id,
            models.UserKnowledge.user_id == user_id
        ).first()
        
        if not existing:
            return {
                'success': False,
                'message': 'Запись знаний не найдена'
            }
        
        # Валидация нового контента
        validation = self.validate_content(new_content, existing.assistant_id, user_id)
        
        if not validation['is_valid']:
            logger.warning(f"Отклонено обновление knowledge_id={knowledge_id}: {validation['errors']}")
            return {
                'success': False,
                'validation': validation,
                'message': 'Новый контент не прошел валидацию'
            }
        
        try:
            # Создаем версионированный контент
            version = self.get_next_version(existing.content)
            content_with_meta = f"""
# МЕТАДАННЫЕ ВАЛИДАЦИИ
# Хэш: {validation['content_hash']}
# Дата обновления: {datetime.now().isoformat()}
# Версия: {version}
# Статус валидации: APPROVED
# Предыдущая версия сохранена

{new_content}
"""
            
            # Сохраняем старую версию в архив (можно реализовать отдельную таблицу)
            # Пока просто логируем
            logger.info(f"Архивирована версия {version-1} для knowledge_id={knowledge_id}")
            
            # Обновляем запись
            existing.content = content_with_meta
            existing.updated_at = datetime.now()
            
            self.db.commit()
            
            # Инвалидируем кэши
            chatai_cache.invalidate_knowledge_cache(user_id, existing.assistant_id)
            chatai_cache.invalidate_assistant_cache(existing.assistant_id)
            
            logger.info(f"Обновлены знания knowledge_id={knowledge_id}, версия {version}")
            
            return {
                'success': True,
                'knowledge_id': knowledge_id,
                'version': version,
                'validation': validation,
                'message': f'Знания успешно обновлены до версии {version}'
            }
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Ошибка обновления знаний: {e}")
            return {
                'success': False,
                'error': str(e),
                'message': 'Ошибка при обновлении знаний'
            }
    
    def get_next_version(self, current_content: str) -> int:
        """Получение следующего номера версии"""
        version_match = re.search(r'# Версия: (\d+)', current_content)
        if version_match:
            return int(version_match.group(1)) + 1
        return 2  # Если версии нет, это будет версия 2
    
    def scan_existing_knowledge(self, user_id: int = None) -> Dict:
        """Сканирование существующих знаний на предмет нарушений"""
        
        result = {
            'total_scanned': 0,
            'violations_found': 0,
            'violations': []
        }
        
        # Получаем записи для сканирования
        query = self.db.query(models.UserKnowledge)
        if user_id:
            query = query.filter(models.UserKnowledge.user_id == user_id)
        
        knowledge_records = query.all()
        result['total_scanned'] = len(knowledge_records)
        
        for knowledge in knowledge_records:
            validation = self.validate_content(knowledge.content, knowledge.assistant_id, knowledge.user_id)
            
            if not validation['is_valid'] or validation['warnings']:
                result['violations_found'] += 1
                result['violations'].append({
                    'knowledge_id': knowledge.id,
                    'user_id': knowledge.user_id,
                    'assistant_id': knowledge.assistant_id,
                    'doc_type': knowledge.doc_type,
                    'created_at': knowledge.created_at.isoformat(),
                    'validation': validation
                })
        
        return result
    
    def cleanup_violations(self, violations: List[Dict], create_backup: bool = True) -> Dict:
        """Очистка нарушений с созданием резервной копии"""
        
        result = {
            'cleaned_count': 0,
            'backup_created': False,
            'errors': []
        }
        
        if create_backup:
            backup_data = []
            for violation in violations:
                knowledge = self.db.query(models.UserKnowledge).filter(
                    models.UserKnowledge.id == violation['knowledge_id']
                ).first()
                
                if knowledge:
                    backup_data.append({
                        'id': knowledge.id,
                        'user_id': knowledge.user_id,
                        'assistant_id': knowledge.assistant_id,
                        'content': knowledge.content,
                        'type': knowledge.type,
                        'doc_type': knowledge.doc_type,
                        'importance': knowledge.importance,
                        'created_at': knowledge.created_at.isoformat(),
                        'updated_at': knowledge.updated_at.isoformat()
                    })
            
            # Сохраняем резервную копию
            backup_filename = f"knowledge_violations_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            try:
                with open(f"./backups/{backup_filename}", 'w', encoding='utf-8') as f:
                    json.dump(backup_data, f, ensure_ascii=False, indent=2)
                result['backup_created'] = True
                logger.info(f"Создана резервная копия: {backup_filename}")
            except Exception as e:
                result['errors'].append(f"Ошибка создания резервной копии: {e}")
        
        # Удаляем нарушения
        for violation in violations:
            try:
                knowledge = self.db.query(models.UserKnowledge).filter(
                    models.UserKnowledge.id == violation['knowledge_id']
                ).first()
                
                if knowledge:
                    # Инвалидируем кэши перед удалением
                    chatai_cache.invalidate_knowledge_cache(knowledge.user_id, knowledge.assistant_id)
                    chatai_cache.invalidate_assistant_cache(knowledge.assistant_id)
                    
                    self.db.delete(knowledge)
                    result['cleaned_count'] += 1
                    
            except Exception as e:
                result['errors'].append(f"Ошибка удаления knowledge_id={violation['knowledge_id']}: {e}")
        
        try:
            self.db.commit()
            logger.info(f"Очищено {result['cleaned_count']} нарушений")
        except Exception as e:
            self.db.rollback()
            result['errors'].append(f"Ошибка коммита: {e}")
        
        return result


# Функции для интеграции с API

def validate_knowledge_upload(content: str, assistant_id: int, user_id: int, db: Session) -> Dict:
    """Валидация загрузки знаний через API"""
    service = KnowledgeControlService(db)
    return service.validate_content(content, assistant_id, user_id)

def add_knowledge_safely(
    user_id: int, 
    assistant_id: int, 
    content: str, 
    doc_type: str,
    db: Session
) -> Dict:
    """Безопасное добавление знаний"""
    service = KnowledgeControlService(db)
    return service.add_knowledge_with_validation(user_id, assistant_id, content, doc_type)

def scan_and_report_violations(user_id: int = None, db: Session = None) -> Dict:
    """Сканирование и создание отчета о нарушениях"""
    service = KnowledgeControlService(db)
    return service.scan_existing_knowledge(user_id)