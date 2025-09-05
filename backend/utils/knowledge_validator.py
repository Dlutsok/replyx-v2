"""
Валидатор знаний ассистента - предотвращает использование устаревших или неавторизованных данных
"""

import logging
from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from database import models

logger = logging.getLogger(__name__)

class KnowledgeValidator:
    """Валидатор для проверки актуальности и корректности знаний ассистента"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def validate_assistant_knowledge(self, assistant_id: int, user_id: int) -> Dict:
        """
        Проверяет актуальность знаний ассистента
        
        Returns:
            Dict с результатами валидации
        """
        result = {
            'is_valid': True,
            'errors': [],
            'warnings': [],
            'knowledge_count': 0,
            'document_count': 0,
            'has_fallback_sources': False
        }
        
        try:
            # Получаем знания ассистента
            knowledge_entries = self.db.query(models.UserKnowledge).filter(
                models.UserKnowledge.user_id == user_id,
                models.UserKnowledge.assistant_id == assistant_id
            ).all()
            
            result['knowledge_count'] = len(knowledge_entries)
            
            # Получаем уникальные документы
            doc_ids = {entry.doc_id for entry in knowledge_entries if entry.doc_id}
            documents = self.db.query(models.Document).filter(
                models.Document.id.in_(doc_ids),
                models.Document.user_id == user_id
            ).all()
            
            result['document_count'] = len(documents)
            
            # Проверяем на наличие fallback или системных знаний
            for entry in knowledge_entries:
                if self._is_fallback_knowledge(entry):
                    result['has_fallback_sources'] = True
                    result['warnings'].append({
                        'type': 'FALLBACK_KNOWLEDGE',
                        'message': f'Найдены fallback знания (ID: {entry.id})',
                        'entry_id': entry.id
                    })
            
            # Проверяем на наличие подозрительного контента
            suspicious_patterns = [
                'Консультационные услуги', 'Стратегический консалтинг',
                'ИТ-услуги', 'Корпоративное обучение', 'Маркетинговые услуги'
            ]
            
            for entry in knowledge_entries:
                content = getattr(entry, 'content', '') or ''
                for pattern in suspicious_patterns:
                    if pattern in content:
                        result['warnings'].append({
                            'type': 'SUSPICIOUS_CONTENT',
                            'message': f'Найден подозрительный паттерн: {pattern}',
                            'entry_id': entry.id,
                            'pattern': pattern
                        })
            
            logger.info(f"Валидация знаний ассистента {assistant_id}: {result['knowledge_count']} записей, {result['document_count']} документов")
            
        except Exception as e:
            result['is_valid'] = False
            result['errors'].append({
                'type': 'VALIDATION_ERROR',
                'message': f'Ошибка валидации: {str(e)}'
            })
            logger.error(f"Ошибка валидации знаний ассистента {assistant_id}: {e}")
        
        return result
    
    def _is_fallback_knowledge(self, entry: models.UserKnowledge) -> bool:
        """Проверяет, является ли запись fallback знанием"""
        if not entry:
            return False
        
        # Проверяем тип записи
        entry_type = getattr(entry, 'type', '')
        if entry_type in ['fallback', 'system', 'default']:
            return True
        
        # Проверяем источник
        doc_type = getattr(entry, 'doc_type', '')
        if doc_type in ['system', 'fallback', 'template']:
            return True
        
        # Проверяем содержимое на предмет системных данных
        content = getattr(entry, 'content', '') or ''
        system_indicators = [
            'support@company.ru',
            '8 800 555-00-00',
            'Консультационные услуги',
            'Финансовый консалтинг'
        ]
        
        return any(indicator in content for indicator in system_indicators)
    
    def clear_fallback_knowledge(self, assistant_id: int, user_id: int) -> int:
        """
        Удаляет все fallback знания ассистента
        
        Returns:
            Количество удаленных записей
        """
        deleted_count = 0
        
        try:
            knowledge_entries = self.db.query(models.UserKnowledge).filter(
                models.UserKnowledge.user_id == user_id,
                models.UserKnowledge.assistant_id == assistant_id
            ).all()
            
            for entry in knowledge_entries:
                if self._is_fallback_knowledge(entry):
                    self.db.delete(entry)
                    deleted_count += 1
                    logger.info(f"Удалено fallback знание: {entry.id}")
            
            self.db.commit()
            logger.info(f"Удалено {deleted_count} fallback записей для ассистента {assistant_id}")
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Ошибка удаления fallback знаний: {e}")
        
        return deleted_count
    
    def ensure_clean_assistant(self, assistant_id: int, user_id: int) -> bool:
        """
        Гарантирует, что ассистент имеет только чистые знания
        
        Returns:
            True если ассистент чист, False если есть проблемы
        """
        try:
            # Валидируем знания
            validation = self.validate_assistant_knowledge(assistant_id, user_id)
            
            if validation['has_fallback_sources']:
                logger.warning(f"Ассистент {assistant_id} имеет fallback источники, очищаем...")
                
                # Удаляем fallback знания
                deleted = self.clear_fallback_knowledge(assistant_id, user_id)
                
                # Обновляем версию знаний
                assistant = self.db.query(models.Assistant).filter(
                    models.Assistant.id == assistant_id
                ).first()
                
                if assistant:
                    assistant.knowledge_version = (assistant.knowledge_version or 0) + 1
                    self.db.commit()
                
                logger.info(f"Ассистент {assistant_id} очищен: удалено {deleted} fallback записей")
            
            # Повторная валидация
            final_validation = self.validate_assistant_knowledge(assistant_id, user_id)
            
            return not final_validation['has_fallback_sources'] and final_validation['is_valid']
            
        except Exception as e:
            logger.error(f"Ошибка очистки ассистента {assistant_id}: {e}")
            return False


def create_knowledge_validator(db: Session) -> KnowledgeValidator:
    """Фабричная функция для создания валидатора"""
    return KnowledgeValidator(db)