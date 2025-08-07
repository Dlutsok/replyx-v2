"""
Сервис для работы с embeddings и векторным поиском знаний
Реализует lazy-reload подход для минимизации расхода токенов
"""

import hashlib
import json
import logging
import numpy as np
from typing import List, Dict, Tuple, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text, desc
from datetime import datetime, timedelta

from database import models
from ai.ai_token_manager import ai_token_manager

logger = logging.getLogger(__name__)

class EmbeddingsService:
    """Сервис для генерации и поиска embeddings"""
    
    def __init__(self):
        self.embedding_model = "text-embedding-3-small"  # Более дешевая модель
        self.embedding_dimension = 1536
        self.max_chunk_tokens = 500  # Максимум токенов в чанке
        self.max_total_context_tokens = 2000  # Максимум токенов контекста для ответа
        
    def generate_embedding(self, text: str, user_id: int) -> List[float]:
        """Генерирует embedding для текста через OpenAI API"""
        try:
            response = ai_token_manager.make_openai_request(
                messages=[],  # Для embeddings messages не нужны
                model=self.embedding_model,
                user_id=user_id,
                is_embedding=True,
                input_text=text
            )
            
            # OpenAI возвращает embedding в response.data[0].embedding
            if hasattr(response, 'data') and len(response.data) > 0:
                return response.data[0].embedding
            else:
                logger.error(f"Unexpected embedding response format: {response}")
                return None
                
        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            return None
    
    def get_cached_query_embedding(self, query: str, db: Session) -> Optional[List[float]]:
        """Получает embedding запроса из кэша или генерирует новый"""
        query_hash = hashlib.md5(query.encode()).hexdigest()
        
        # Ищем в кэше
        cached = db.query(models.QueryEmbeddingCache).filter(
            models.QueryEmbeddingCache.query_hash == query_hash
        ).first()
        
        if cached:
            # Обновляем статистику использования
            cached.last_used = datetime.utcnow()
            cached.usage_count += 1
            db.commit()
            logger.debug(f"Cache hit for query: {query[:50]}...")
            return json.loads(cached.embedding)
        
        return None
    
    def cache_query_embedding(self, query: str, embedding: List[float], db: Session):
        """Сохраняет embedding запроса в кэш"""
        query_hash = hashlib.md5(query.encode()).hexdigest()
        
        try:
            cache_entry = models.QueryEmbeddingCache(
                query_hash=query_hash,
                query_text=query,
                embedding=json.dumps(embedding),
                created_at=datetime.utcnow(),
                last_used=datetime.utcnow(),
                usage_count=1
            )
            db.add(cache_entry)
            db.commit()
            logger.debug(f"Cached embedding for query: {query[:50]}...")
        except Exception as e:
            logger.error(f"Error caching query embedding: {e}")
            db.rollback()
    
    def split_text_into_chunks(self, text: str, chunk_size: int = 1000, overlap: int = 100) -> List[str]:
        """Разбивает текст на чанки с перекрытием для лучшего контекста"""
        if len(text) <= chunk_size:
            return [text]
        
        chunks = []
        start = 0
        
        while start < len(text):
            end = start + chunk_size
            
            # Если это не последний чанк, ищем ближайшую границу предложения
            if end < len(text):
                # Ищем точку, восклицательный или вопросительный знак
                for i in range(end, max(start + chunk_size // 2, end - 200), -1):
                    if text[i] in '.!?':
                        end = i + 1
                        break
                # Если не нашли, ищем пробел
                else:
                    for i in range(end, max(start + chunk_size // 2, end - 100), -1):
                        if text[i] == ' ':
                            end = i
                            break
            
            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)
            
            # Следующий чанк начинается с перекрытием
            start = end - overlap if end < len(text) else end
            
            # Избегаем бесконечного цикла
            if start >= len(text):
                break
        
        return chunks
    
    def estimate_tokens(self, text: str) -> int:
        """Приблизительная оценка количества токенов (1 токен ≈ 4 символа)"""
        return len(text) // 4
    
    def index_document(self, doc_id: int, user_id: int, assistant_id: Optional[int], 
                      text: str, doc_type: str, importance: int = 10, db: Session = None) -> int:
        """Индексирует документ, создавая embeddings для всех чанков"""
        logger.info(f"Starting document indexing: doc_id={doc_id}, user_id={user_id}")
        
        # Разбиваем текст на чанки
        chunks = self.split_text_into_chunks(text, chunk_size=800, overlap=50)
        logger.info(f"Document split into {len(chunks)} chunks")
        
        indexed_count = 0
        
        for i, chunk in enumerate(chunks):
            # Пропускаем слишком короткие чанки
            if len(chunk.strip()) < 50:
                continue
            
            # Генерируем embedding для чанка
            embedding = self.generate_embedding(chunk, user_id)
            if not embedding:
                logger.warning(f"Failed to generate embedding for chunk {i}")
                continue
            
            # Оцениваем количество токенов
            token_count = self.estimate_tokens(chunk)
            
            # Сохраняем в базу данных
            try:
                knowledge_embedding = models.KnowledgeEmbedding(
                    user_id=user_id,
                    assistant_id=assistant_id,
                    doc_id=doc_id,
                    chunk_index=i,
                    chunk_text=chunk,
                    embedding=json.dumps(embedding),
                    doc_type=doc_type,
                    importance=importance,
                    token_count=token_count,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                db.add(knowledge_embedding)
                indexed_count += 1
                
            except Exception as e:
                logger.error(f"Error saving embedding for chunk {i}: {e}")
                continue
        
        # Коммитим все изменения
        try:
            db.commit()
            logger.info(f"Successfully indexed {indexed_count} chunks for document {doc_id}")
            
            # Увеличиваем версию знаний для ассистента
            if assistant_id:
                self.increment_knowledge_version(assistant_id, db)
            else:
                # Если ассистент не указан, обновляем для всех ассистентов пользователя
                assistants = db.query(models.Assistant).filter(
                    models.Assistant.user_id == user_id
                ).all()
                for assistant in assistants:
                    self.increment_knowledge_version(assistant.id, db)
            
            return indexed_count
            
        except Exception as e:
            logger.error(f"Error committing embeddings: {e}")
            db.rollback()
            return 0
    
    def increment_knowledge_version(self, assistant_id: int, db: Session):
        """Увеличивает версию знаний ассистента для lazy reload"""
        try:
            assistant = db.query(models.Assistant).filter(
                models.Assistant.id == assistant_id
            ).first()
            
            if assistant:
                assistant.knowledge_version = (assistant.knowledge_version or 0) + 1
                db.commit()
                logger.debug(f"Incremented knowledge version for assistant {assistant_id} to {assistant.knowledge_version}")
        except Exception as e:
            logger.error(f"Error incrementing knowledge version: {e}")
            db.rollback()
    
    def search_relevant_chunks(self, query: str, user_id: int, assistant_id: Optional[int], 
                              top_k: int = 5, min_similarity: float = 0.7, db: Session = None) -> List[Dict]:
        """Ищет наиболее релевантные чанки знаний для запроса"""
        
        try:
            # Получаем или генерируем embedding для запроса
            query_embedding = self.get_cached_query_embedding(query, db)
            if not query_embedding:
                query_embedding = self.generate_embedding(query, user_id)
                if not query_embedding:
                    logger.error("Failed to generate query embedding")
                    return []
                
                # Кэшируем embedding запроса
                self.cache_query_embedding(query, query_embedding, db)
            
            # Получаем все embeddings для пользователя/ассистента
            query_filter = db.query(models.KnowledgeEmbedding).filter(
                models.KnowledgeEmbedding.user_id == user_id
            )
            
            if assistant_id:
                query_filter = query_filter.filter(
                    (models.KnowledgeEmbedding.assistant_id == assistant_id) |
                    (models.KnowledgeEmbedding.assistant_id.is_(None))
                )
            
            embeddings_data = query_filter.all()
            
            if not embeddings_data:
                logger.info("No embeddings found for user/assistant")
                return []
            
            # Вычисляем косинусное сходство с каждым embedding
            relevant_chunks = []
            query_vector = np.array(query_embedding)
            
            for embedding_row in embeddings_data:
                try:
                    # Парсим embedding из JSON
                    stored_embedding = json.loads(embedding_row.embedding)
                    stored_vector = np.array(stored_embedding)
                    
                    # Вычисляем косинусное сходство
                    similarity = np.dot(query_vector, stored_vector) / (
                        np.linalg.norm(query_vector) * np.linalg.norm(stored_vector)
                    )
                    
                    # Проверяем порог схожести
                    if similarity >= min_similarity:
                        chunk_tokens = embedding_row.token_count or self.estimate_tokens(embedding_row.chunk_text)
                        
                        relevant_chunks.append({
                            'id': embedding_row.id,
                            'text': embedding_row.chunk_text,
                            'doc_type': embedding_row.doc_type,
                            'importance': embedding_row.importance,
                            'similarity': float(similarity),
                            'token_count': chunk_tokens
                        })
                        
                except Exception as e:
                    logger.warning(f"Error processing embedding {embedding_row.id}: {e}")
                    continue
            
            # Сортируем по схожести
            relevant_chunks.sort(key=lambda x: x['similarity'], reverse=True)
            
            # Ограничиваем количество и токены
            final_chunks = []
            total_tokens = 0
            
            for chunk in relevant_chunks[:top_k]:
                if total_tokens + chunk['token_count'] > self.max_total_context_tokens:
                    break
                final_chunks.append(chunk)
                total_tokens += chunk['token_count']
            
            logger.info(f"Found {len(final_chunks)} relevant chunks (total tokens: {total_tokens})")
            return final_chunks
            
        except Exception as e:
            logger.error(f"Error searching relevant chunks: {e}")
            return []
    
    def cleanup_old_cache(self, db: Session, days_old: int = 30):
        """Очищает старый кэш embeddings запросов"""
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days_old)
            
            deleted = db.query(models.QueryEmbeddingCache).filter(
                models.QueryEmbeddingCache.last_used < cutoff_date
            ).delete()
            
            db.commit()
            logger.info(f"Cleaned up {deleted} old cached embeddings")
            
        except Exception as e:
            logger.error(f"Error cleaning up cache: {e}")
            db.rollback()
    
    def delete_document_embeddings(self, doc_id: int, db: Session):
        """Удаляет все embeddings для документа"""
        try:
            deleted = db.query(models.KnowledgeEmbedding).filter(
                models.KnowledgeEmbedding.doc_id == doc_id
            ).delete()
            
            db.commit()
            logger.info(f"Deleted {deleted} embeddings for document {doc_id}")
            return deleted
            
        except Exception as e:
            logger.error(f"Error deleting document embeddings: {e}")
            db.rollback()
            return 0


# Глобальный экземпляр сервиса
embeddings_service = EmbeddingsService()