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
from sqlalchemy import text
import importlib
Vector = None
try:
    _pgv = importlib.import_module('pgvector.sqlalchemy')  # type: ignore
    Vector = getattr(_pgv, 'Vector', None)
except Exception:
    Vector = None
from ai.ai_token_manager import ai_token_manager

logger = logging.getLogger(__name__)

class EmbeddingsService:
    """Сервис для генерации и поиска embeddings"""
    
    def __init__(self):
        self.embedding_model = "text-embedding-3-small"  # Более дешевая модель
        self.embedding_dimension = 1536
        self.max_chunk_tokens = 500  # Максимум токенов в чанке
        self.max_total_context_tokens = 2000  # Максимум токенов контекста для ответа
        # Единые пороги можно вынести в конфиг, пока держим здесь
    def build_context_messages(self, chunks: List[Dict], max_context_tokens: int) -> Tuple[List[str], int]:
        """Единая упаковка контекста: сортировка, MMR уже применена на входе, аккуратная резка по бюджету."""
        context_parts: List[str] = []
        total_tokens = 0
        for chunk in chunks:
            chunk_tokens = chunk.get('token_count', self.estimate_tokens(chunk['text']))
            if total_tokens + chunk_tokens > max_context_tokens:
                break
            context_parts.append(chunk['text'])
            total_tokens += chunk_tokens
        return context_parts, total_tokens
        
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
            try:
                # Возвращаем список чисел для обеих схем (pgvector/ARRAY(Float))
                return list(cached.embedding)
            except Exception:
                return None
        
        return None
    
    def cache_query_embedding(self, query: str, embedding: List[float], db: Session):
        """Сохраняет embedding запроса в кэш"""
        query_hash = hashlib.md5(query.encode()).hexdigest()
        
        try:
            cache_entry = models.QueryEmbeddingCache(
                query_hash=query_hash,
                query_text=query,
                embedding=embedding,
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
        
        paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
        chunks: List[str] = []
        current: List[str] = []
        current_len = 0
        for p in paragraphs:
            if current_len + len(p) <= chunk_size:
                current.append(p)
                current_len += len(p) + 2
            else:
                if current:
                    chunks.append('\n\n'.join(current))
                # если параграф слишком большой — режем его грубо по предложениям
                if len(p) > chunk_size:
                    sentences = p.split('. ')
                    buf: List[str] = []
                    buf_len = 0
                    for s in sentences:
                        if buf_len + len(s) <= chunk_size:
                            buf.append(s)
                            buf_len += len(s) + 2
                        else:
                            if buf:
                                chunks.append('. '.join(buf).strip())
                            buf = [s]
                            buf_len = len(s)
                    if buf:
                        chunks.append('. '.join(buf).strip())
                    current = []
                    current_len = 0
                else:
                    current = [p]
                    current_len = len(p)
        if current:
            chunks.append('\n\n'.join(current))
        # перекрытие простое: добавим последний абзац предыдущего чанка в начало следующего
        if overlap > 0 and len(chunks) > 1:
            overlapped: List[str] = []
            prev_tail = ''
            for ch in chunks:
                if prev_tail:
                    merged = (prev_tail + '\n\n' + ch)
                    overlapped.append(merged[:chunk_size])
                else:
                    overlapped.append(ch[:chunk_size])
                # prev_tail = последний абзац текущего чанка
                parts = ch.split('\n\n')
                prev_tail = parts[-1][:overlap] if parts else ''
            chunks = overlapped
        return chunks
    
    def estimate_tokens(self, text: str) -> int:
        """Точный подсчет токенов для gpt-4o-mini через tiktoken; fallback на 4 символа = 1 токен."""
        try:
            import tiktoken  # type: ignore
            enc = tiktoken.encoding_for_model("gpt-4o-mini")
            return len(enc.encode(text))
        except Exception:
            return len(text) // 4

    def _tokenize_for_similarity(self, text: str) -> set:
        words = [w.lower() for w in text.split() if len(w) > 2]
        return set(words)

    def _jaccard_similarity(self, a: set, b: set) -> float:
        if not a or not b:
            return 0.0
        inter = len(a & b)
        union = len(a | b)
        return inter / union if union else 0.0

    def _select_diverse_chunks(self, chunks: List[Dict], k: int, max_jaccard: float = 0.7) -> List[Dict]:
        """Грубая MMR/диверсификация: отбираем чанки, избегая сильных повторов текста."""
        selected: List[Dict] = []
        selected_tokens: List[set] = []
        for ch in chunks:
            ch_tokens = self._tokenize_for_similarity(ch['text'])
            is_similar = any(self._jaccard_similarity(ch_tokens, st) > max_jaccard for st in selected_tokens)
            if is_similar:
                continue
            selected.append(ch)
            selected_tokens.append(ch_tokens)
            if len(selected) >= k:
                break
        return selected
    
    def compute_chunk_hash(self, text: str) -> str:
        return hashlib.md5(text.encode('utf-8')).hexdigest()

    def upsert_embedding_chunk(self, *,
                               user_id: int,
                               assistant_id: Optional[int],
                               doc_id: int,
                               chunk_index: int,
                               chunk_text: str,
                               embedding: List[float],
                               doc_type: str,
                               importance: int,
                               token_count: int,
                               source: str,
                               db: Session,
                               qa_id: Optional[int] = None) -> bool:
        """Инкрементальная индексация: вставить/обновить чанк по (doc_id, chunk_hash)."""
        try:
            chunk_hash = self.compute_chunk_hash(chunk_text)
            # Проверяем существование записи, выбирая только id (избегаем чтения embedding-колонки)
            if qa_id:
                existing_id_row = db.query(models.KnowledgeEmbedding.id).filter(
                    models.KnowledgeEmbedding.qa_id == qa_id,
                    models.KnowledgeEmbedding.chunk_hash == chunk_hash,
                ).first()
            else:
                existing_id_row = db.query(models.KnowledgeEmbedding.id).filter(
                    models.KnowledgeEmbedding.doc_id == doc_id,
                    models.KnowledgeEmbedding.chunk_hash == chunk_hash,
                ).first()
            if existing_id_row:
                # Обновляем запись bulk-операцией без загрузки объекта
                if qa_id:
                    filter_query = db.query(models.KnowledgeEmbedding).filter(
                        models.KnowledgeEmbedding.qa_id == qa_id,
                        models.KnowledgeEmbedding.chunk_hash == chunk_hash,
                    )
                else:
                    filter_query = db.query(models.KnowledgeEmbedding).filter(
                        models.KnowledgeEmbedding.doc_id == doc_id,
                        models.KnowledgeEmbedding.chunk_hash == chunk_hash,
                    )
                filter_query.update({
                    models.KnowledgeEmbedding.chunk_index: chunk_index,
                    models.KnowledgeEmbedding.chunk_text: chunk_text,
                    models.KnowledgeEmbedding.embedding: embedding,
                    models.KnowledgeEmbedding.doc_type: doc_type,
                    models.KnowledgeEmbedding.importance: importance,
                    models.KnowledgeEmbedding.token_count: token_count,
                    models.KnowledgeEmbedding.updated_at: datetime.utcnow(),
                    models.KnowledgeEmbedding.source: source,
                }, synchronize_session=False)
                return True
            # Вставляем новую запись
            knowledge_embedding = models.KnowledgeEmbedding(
                user_id=user_id,
                assistant_id=assistant_id,
                doc_id=doc_id if not qa_id else None,
                qa_id=qa_id,
                chunk_index=chunk_index,
                chunk_text=chunk_text,
                embedding=embedding,
                doc_type=doc_type,
                importance=importance,
                token_count=token_count,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                chunk_hash=chunk_hash,
                source=source,
            )
            db.add(knowledge_embedding)
            return True
        except Exception as e:
            logger.error(f"Upsert chunk failed: {e}")
            return False

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
            
            # Инкрементальная вставка/обновление
            if self.upsert_embedding_chunk(
                user_id=user_id,
                assistant_id=assistant_id,
                doc_id=doc_id,
                chunk_index=i,
                chunk_text=chunk,
                embedding=embedding,
                doc_type=doc_type,
                importance=importance,
                token_count=token_count,
                source='document',
                db=db,
            ):
                indexed_count += 1
        
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
                              top_k: int = 5, min_similarity: float = 0.7, db: Session = None, 
                              include_qa: bool = False, qa_limit: int = 2) -> List[Dict]:
        """Ищет наиболее релевантные чанки знаний для запроса"""
        
        try:
            # Попытка получить из кэша топ-K чанков по (query_hash, assistant, knowledge_version)
            from cache.redis_cache import chatai_cache
            query_hash = hashlib.md5(query.encode()).hexdigest()
            knowledge_version = 0
            try:
                if assistant_id:
                    assistant = db.query(models.Assistant).filter(models.Assistant.id == assistant_id).first()
                    if assistant:
                        knowledge_version = assistant.knowledge_version or 0
                cached = chatai_cache.get_retrieved_chunks(user_id, assistant_id or 0, knowledge_version, query_hash)
                if cached:
                    return cached
            except Exception:
                pass

            # Получаем или генерируем embedding для запроса
            query_embedding = self.get_cached_query_embedding(query, db)
            if not query_embedding:
                query_embedding = self.generate_embedding(query, user_id)
                if not query_embedding:
                    logger.error("Failed to generate query embedding")
                    return []
                
                # Кэшируем embedding запроса
                self.cache_query_embedding(query, query_embedding, db)
            
            # Если pgvector доступен и миграция применена — используем SQL поиск по вектору
            if Vector:
                # Используем прямой SQL через psycopg2 для работы с pgvector (документы)
                import psycopg2
                from core.app_config import DATABASE_URL
                
                try:
                    conn = psycopg2.connect(DATABASE_URL)
                    cursor = conn.cursor()
                    
                    # Конвертируем embedding в строку pgvector формата
                    embedding_str = "[" + ",".join(map(str, query_embedding)) + "]"
                    
                    # SQL запрос с правильными плейсхолдерами для psycopg2
                    where_assistant = "AND (assistant_id = %s OR assistant_id IS NULL)" if assistant_id else ""
                    sql = f"""
                        SELECT id, doc_id, chunk_text, doc_type, importance, token_count,
                               1 - (embedding <=> %s::vector) AS similarity
                        FROM knowledge_embeddings
                        WHERE user_id = %s
                        AND qa_id IS NULL
                        {where_assistant}
                        ORDER BY embedding <=> %s::vector
                        LIMIT %s
                    """
                    
                    # Параметры в правильном порядке
                    params = [embedding_str, user_id]
                    if assistant_id:
                        params.append(assistant_id)
                    params.extend([embedding_str, top_k * 5])  # embedding дважды: для similarity и ORDER BY
                    
                    cursor.execute(sql, params)
                    rows = cursor.fetchall()
                    
                    cursor.close()
                    conn.close()
                    
                except Exception as e:
                    logger.error(f"Error in direct SQL chunks search: {e}")
                    rows = []
                relevant_chunks = []
                for row in rows:
                    if row[6] is not None and row[6] < min_similarity:
                        continue
                    chunk_tokens = row[5] or self.estimate_tokens(row[2])
                    relevant_chunks.append({
                        'id': row[0],
                        'doc_id': row[1],
                        'text': row[2],
                        'doc_type': row[3],
                        'importance': row[4],
                        'similarity': float(row[6]) if row[6] is not None else 0.0,
                        'token_count': chunk_tokens,
                    })
            else:
                # Fallback: приложение вычисляет схожесть (медленно)
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

                relevant_chunks = []
                query_vector = np.array(query_embedding)
                for embedding_row in embeddings_data:
                    try:
                        stored_vector = np.array(list(embedding_row.embedding))
                        similarity = np.dot(query_vector, stored_vector) / (
                            np.linalg.norm(query_vector) * np.linalg.norm(stored_vector)
                        )
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
            
            # Диверсифицируем список (MMR-грубо по Jaccard), затем ограничиваем количество и токены
            diversified = self._select_diverse_chunks(
                sorted(relevant_chunks, key=lambda x: x['similarity'], reverse=True),
                k=top_k,
                max_jaccard=0.7,
            )

            final_chunks = []
            total_tokens = 0
            
            for chunk in diversified[:top_k]:
                if total_tokens + chunk['token_count'] > self.max_total_context_tokens:
                    break
                final_chunks.append(chunk)
                total_tokens += chunk['token_count']
            
            logger.info(f"Found {len(final_chunks)} relevant chunks (total tokens: {total_tokens})")

            # Обновляем usage_count/last_used для задействованных знаний (если есть UserKnowledge по doc_id)
            try:
                if final_chunks:
                    doc_ids = list({c.get('doc_id') for c in final_chunks if c.get('doc_id') is not None})
                    if doc_ids:
                        db.query(models.UserKnowledge).filter(
                            models.UserKnowledge.user_id == user_id,
                            models.UserKnowledge.doc_id.in_(doc_ids)
                        ).update({
                            models.UserKnowledge.last_used: datetime.utcnow()
                        }, synchronize_session=False)
                        # Инкремент usage_count по каждому doc_id
                        for did in doc_ids:
                            db.query(models.UserKnowledge).filter(
                                models.UserKnowledge.user_id == user_id,
                                models.UserKnowledge.doc_id == did
                            ).update({
                                models.UserKnowledge.usage_count: models.UserKnowledge.usage_count + 1
                            }, synchronize_session=False)
                        db.commit()
            except Exception as _e:
                logger.debug(f"Failed to update usage counters: {_e}")

            # Интегрируем Q&A результаты если требуется
            if include_qa and qa_limit > 0:
                qa_results = self.search_relevant_qa(
                    query=query,
                    user_id=user_id,
                    assistant_id=assistant_id,
                    top_k=qa_limit,
                    min_similarity=min_similarity,
                    db=db
                )
                
                # Преобразуем Q&A результаты в формат chunks для совместимости
                for qa in qa_results:
                    qa_chunk = {
                        'id': f"qa_{qa['id']}",
                        'text': f"Q: {qa['question']}\nA: {qa['answer']}",
                        'doc_type': 'qa_knowledge',
                        'importance': qa['importance'],
                        'similarity': qa.get('max_similarity', qa.get('similarity', 0)),
                        'token_count': self.estimate_tokens(f"Q: {qa['question']}\nA: {qa['answer']}"),
                        'type': 'qa_knowledge',
                        'category': qa.get('category', None)
                    }
                    
                    # Вставляем Q&A результат в подходящее место по similarity
                    inserted = False
                    for i, chunk in enumerate(final_chunks):
                        if qa_chunk['similarity'] > chunk['similarity']:
                            final_chunks.insert(i, qa_chunk)
                            inserted = True
                            break
                    
                    if not inserted:
                        final_chunks.append(qa_chunk)
                
                # Ограничиваем общее количество результатов
                final_chunks = final_chunks[:top_k + qa_limit]
                
                # Пересчитываем общие токены с учетом Q&A
                recalc_total_tokens = 0
                filtered_chunks = []
                for chunk in final_chunks:
                    if recalc_total_tokens + chunk['token_count'] > self.max_total_context_tokens:
                        break
                    filtered_chunks.append(chunk)
                    recalc_total_tokens += chunk['token_count']
                
                final_chunks = filtered_chunks

            # Сохраняем результат ретрива в кэш на короткий TTL
            try:
                chatai_cache.cache_retrieved_chunks(user_id, assistant_id or 0, knowledge_version, query_hash, final_chunks, ttl=60)
            except Exception:
                pass

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

    def index_qa_knowledge(self, qa_id: int, user_id: int, assistant_id: Optional[int],
                          question: str, answer: str, importance: int = 10, db: Session = None) -> int:
        """Индексирует Q&A запись, создавая embeddings для вопроса и ответа"""
        logger.info(f"Starting Q&A indexing: qa_id={qa_id}, user_id={user_id}")
        
        indexed_count = 0
        
        # Создаем embedding для вопроса
        question_embedding = self.generate_embedding(question, user_id)
        if question_embedding:
            question_tokens = self.estimate_tokens(question)
            if self.upsert_embedding_chunk(
                user_id=user_id,
                assistant_id=assistant_id,
                doc_id=0,  # dummy value since doc_id will be None
                chunk_index=0,
                chunk_text=question,
                embedding=question_embedding,
                doc_type='qa_question',
                importance=importance,
                token_count=question_tokens,
                source='qa_knowledge',
                qa_id=qa_id,
                db=db,
            ):
                indexed_count += 1
        
        # Создаем embedding для ответа
        answer_embedding = self.generate_embedding(answer, user_id)
        if answer_embedding:
            answer_tokens = self.estimate_tokens(answer)
            if self.upsert_embedding_chunk(
                user_id=user_id,
                assistant_id=assistant_id,
                doc_id=0,  # dummy value since doc_id will be None
                chunk_index=1,
                chunk_text=answer,
                embedding=answer_embedding,
                doc_type='qa_answer',
                importance=importance,
                token_count=answer_tokens,
                source='qa_knowledge',
                qa_id=qa_id,
                db=db,
            ):
                indexed_count += 1
        
        # Коммитим изменения
        try:
            db.commit()
            logger.info(f"Successfully indexed {indexed_count} Q&A embeddings for qa_id {qa_id}")
            
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
            logger.error(f"Error committing Q&A embeddings: {e}")
            db.rollback()
            return 0

    def search_relevant_qa(self, query: str, user_id: int, assistant_id: Optional[int],
                          top_k: int = 3, min_similarity: float = 0.7, db: Session = None) -> List[Dict]:
        """Ищет наиболее релевантные Q&A записи для запроса"""
        try:
            # Получаем или генерируем embedding для запроса
            query_embedding = self.get_cached_query_embedding(query, db)
            if not query_embedding:
                query_embedding = self.generate_embedding(query, user_id)
                if not query_embedding:
                    logger.error("Failed to generate query embedding for Q&A search")
                    return []
                
                # Кэшируем embedding запроса
                self.cache_query_embedding(query, query_embedding, db)
            
            # Поиск по Q&A embeddings
            if Vector:
                # Используем прямой SQL через psycopg2 для работы с pgvector
                import psycopg2
                from core.app_config import DATABASE_URL
                
                try:
                    conn = psycopg2.connect(DATABASE_URL)
                    cursor = conn.cursor()
                    
                    # Конвертируем embedding в строку pgvector формата
                    embedding_str = "[" + ",".join(map(str, query_embedding)) + "]"
                    
                    # SQL запрос с правильными плейсхолдерами для psycopg2
                    where_assistant = "AND (ke.assistant_id = %s OR ke.assistant_id IS NULL)" if assistant_id else ""
                    sql = f"""
                        SELECT DISTINCT qa.id, qa.question, qa.answer, qa.category, qa.importance,
                               MAX(1 - (ke.embedding <=> %s::vector)) AS max_similarity
                        FROM qa_knowledge qa
                        JOIN knowledge_embeddings ke ON qa.id = ke.qa_id
                        WHERE qa.user_id = %s 
                        AND qa.is_active = true
                        {where_assistant}
                        GROUP BY qa.id, qa.question, qa.answer, qa.category, qa.importance
                        ORDER BY max_similarity DESC
                        LIMIT %s
                    """
                    
                    # Параметры в правильном порядке
                    params = [embedding_str, user_id]
                    if assistant_id:
                        params.append(assistant_id)
                    params.append(top_k * 2)  # Get more to filter by similarity
                    
                    cursor.execute(sql, params)
                    rows = cursor.fetchall()
                    
                    cursor.close()
                    conn.close()
                    
                except Exception as e:
                    logger.error(f"Error in direct SQL Q&A search: {e}")
                    # Fallback to numpy search
                    rows = []
                
                relevant_qa = []
                for row in rows:
                    if row[5] is not None and row[5] >= min_similarity:
                        relevant_qa.append({
                            'id': row[0],
                            'question': row[1],
                            'answer': row[2],
                            'category': row[3],
                            'importance': row[4],
                            'max_similarity': float(row[5]),
                            'type': 'qa_knowledge'
                        })
                
                return relevant_qa[:top_k]
                
            else:
                # Fallback без pgvector
                # Получаем все Q&A для пользователя/ассистента
                qa_query = db.query(models.QAKnowledge).filter(
                    models.QAKnowledge.user_id == user_id,
                    models.QAKnowledge.is_active == True
                )
                if assistant_id:
                    qa_query = qa_query.filter(
                        (models.QAKnowledge.assistant_id == assistant_id) |
                        (models.QAKnowledge.assistant_id.is_(None))
                    )
                
                qa_records = qa_query.all()
                if not qa_records:
                    logger.info("No Q&A records found for user/assistant")
                    return []
                
                # Получаем embeddings для этих Q&A
                qa_ids = [qa.id for qa in qa_records]
                embeddings_data = db.query(models.KnowledgeEmbedding).filter(
                    models.KnowledgeEmbedding.qa_id.in_(qa_ids)
                ).all()
                
                if not embeddings_data:
                    logger.info("No Q&A embeddings found")
                    return []
                
                # Вычисляем similarity
                relevant_qa = {}
                query_vector = np.array(query_embedding)
                
                for embedding_row in embeddings_data:
                    try:
                        stored_vector = np.array(list(embedding_row.embedding))
                        similarity = np.dot(query_vector, stored_vector) / (
                            np.linalg.norm(query_vector) * np.linalg.norm(stored_vector)
                        )
                        
                        qa_id = embedding_row.qa_id
                        if qa_id not in relevant_qa or similarity > relevant_qa[qa_id]['similarity']:
                            qa_record = next((qa for qa in qa_records if qa.id == qa_id), None)
                            if qa_record and similarity >= min_similarity:
                                relevant_qa[qa_id] = {
                                    'id': qa_record.id,
                                    'question': qa_record.question,
                                    'answer': qa_record.answer,
                                    'category': qa_record.category,
                                    'importance': qa_record.importance,
                                    'similarity': float(similarity),
                                    'type': 'qa_knowledge'
                                }
                    except Exception as e:
                        logger.warning(f"Error processing Q&A embedding {embedding_row.id}: {e}")
                        continue
                
                # Сортируем по similarity и возвращаем топ-K
                sorted_qa = sorted(relevant_qa.values(), key=lambda x: x['similarity'], reverse=True)
                return sorted_qa[:top_k]
                
        except Exception as e:
            logger.error(f"Error searching relevant Q&A: {e}")
            return []

    def search_combined_knowledge(self, query: str, user_id: int, assistant_id: Optional[int],
                                 doc_chunks_limit: int = 3, qa_limit: int = 2, 
                                 min_similarity: float = 0.7, db: Session = None) -> Tuple[List[Dict], List[Dict]]:
        """Комбинированный поиск по документам и Q&A знаниям"""
        try:
            # Поиск по документам (существующий функционал)
            doc_chunks = self.search_relevant_chunks(
                query=query,
                user_id=user_id,
                assistant_id=assistant_id,
                top_k=doc_chunks_limit,
                min_similarity=min_similarity,
                db=db
            )
            
            # Поиск по Q&A
            qa_results = self.search_relevant_qa(
                query=query,
                user_id=user_id,
                assistant_id=assistant_id,
                top_k=qa_limit,
                min_similarity=min_similarity,
                db=db
            )
            
            logger.info(f"Combined search found {len(doc_chunks)} document chunks and {len(qa_results)} Q&A records")
            
            # Обновляем usage_count для использованных Q&A
            if qa_results:
                try:
                    qa_ids = [qa['id'] for qa in qa_results]
                    db.query(models.QAKnowledge).filter(
                        models.QAKnowledge.id.in_(qa_ids)
                    ).update({
                        models.QAKnowledge.last_used: datetime.utcnow(),
                        models.QAKnowledge.usage_count: models.QAKnowledge.usage_count + 1
                    }, synchronize_session=False)
                    db.commit()
                except Exception as e:
                    logger.debug(f"Failed to update Q&A usage counters: {e}")
            
            return doc_chunks, qa_results
            
        except Exception as e:
            logger.error(f"Error in combined knowledge search: {e}")
            return [], []

    def delete_qa_embeddings(self, qa_id: int, db: Session):
        """Удаляет все embeddings для Q&A записи"""
        try:
            deleted = db.query(models.KnowledgeEmbedding).filter(
                models.KnowledgeEmbedding.qa_id == qa_id
            ).delete()
            
            db.commit()
            logger.info(f"Deleted {deleted} embeddings for Q&A {qa_id}")
            return deleted
            
        except Exception as e:
            logger.error(f"Error deleting Q&A embeddings: {e}")
            db.rollback()
            return 0


# Глобальный экземпляр сервиса
embeddings_service = EmbeddingsService()