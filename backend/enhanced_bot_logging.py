#!/usr/bin/env python3
"""
🔍 УЛУЧШЕННАЯ СИСТЕМА ЛОГИРОВАНИЯ ДЛЯ ТРАССИРОВКИ ИСТОЧНИКОВ ОТВЕТОВ БОТОВ

Этот модуль добавляет детальное логирование для отслеживания:
- Откуда бот берет информацию для ответа
- Какие чанки embeddings используются
- Какие fallback-механизмы срабатывают
- Какие кэши задействованы
"""

import logging
import json
import hashlib
from datetime import datetime
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session

# Создаем специальный logger для трассировки ботов
bot_tracer = logging.getLogger('bot_tracer')
bot_tracer.setLevel(logging.INFO)

# Создаем файловый handler для сохранения трассировки
if not bot_tracer.handlers:
    file_handler = logging.FileHandler('bot_response_trace.log', encoding='utf-8')
    formatter = logging.Formatter(
        '%(asctime)s | %(levelname)s | %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    file_handler.setFormatter(formatter)
    bot_tracer.addHandler(file_handler)

class BotResponseTracer:
    """Трассировщик ответов ботов для выявления источников информации"""
    
    def __init__(self, user_id: int, assistant_id: int, query: str):
        self.user_id = user_id
        self.assistant_id = assistant_id
        self.query = query
        self.trace_id = hashlib.md5(
            f"{user_id}_{assistant_id}_{query}_{datetime.now().isoformat()}".encode()
        ).hexdigest()[:8]
        
        self.trace_data = {
            'trace_id': self.trace_id,
            'timestamp': datetime.now().isoformat(),
            'user_id': user_id,
            'assistant_id': assistant_id,
            'query': query,
            'sources_checked': [],
            'sources_used': [],
            'fallbacks_triggered': [],
            'cache_hits': [],
            'final_response': None
        }
        
        bot_tracer.info(f"🔍 TRACE_START [{self.trace_id}] User:{user_id} Assistant:{assistant_id} Query:'{query}'")
    
    def log_embeddings_search(self, found_chunks: List[Dict], search_params: Dict):
        """Логирует результаты поиска по embeddings"""
        
        source_info = {
            'type': 'embeddings_search',
            'params': search_params,
            'found_chunks': len(found_chunks),
            'chunks_details': []
        }
        
        for i, chunk in enumerate(found_chunks):
            chunk_info = {
                'index': i,
                'similarity': chunk.get('similarity', 0),
                'doc_type': chunk.get('doc_type', 'unknown'),
                'importance': chunk.get('importance', 0),
                'token_count': chunk.get('token_count', 0),
                'text_preview': chunk.get('text', '')[:100] + '...' if chunk.get('text') else ''
            }
            source_info['chunks_details'].append(chunk_info)
        
        self.trace_data['sources_checked'].append(source_info)
        
        if found_chunks:
            self.trace_data['sources_used'].append({
                'type': 'embeddings',
                'count': len(found_chunks),
                'avg_similarity': sum(c.get('similarity', 0) for c in found_chunks) / len(found_chunks)
            })
            
            bot_tracer.info(f"📊 EMBEDDINGS_FOUND [{self.trace_id}] Found {len(found_chunks)} chunks, "
                          f"avg similarity: {sum(c.get('similarity', 0) for c in found_chunks) / len(found_chunks):.3f}")
        else:
            bot_tracer.info(f"❌ EMBEDDINGS_EMPTY [{self.trace_id}] No relevant chunks found")
    
    def log_fallback_knowledge(self, knowledge_entries: List, fallback_type: str = "user_knowledge"):
        """Логирует использование fallback к старой системе знаний"""
        
        fallback_info = {
            'type': fallback_type,
            'entries_count': len(knowledge_entries),
            'entries_details': []
        }
        
        for entry in knowledge_entries[:3]:  # Логируем первые 3
            entry_info = {
                'id': getattr(entry, 'id', 'unknown'),
                'doc_type': getattr(entry, 'doc_type', 'unknown'),
                'importance': getattr(entry, 'importance', 0),
                'content_preview': getattr(entry, 'content', '')[:100] + '...' if hasattr(entry, 'content') else ''
            }
            fallback_info['entries_details'].append(entry_info)
        
        self.trace_data['fallbacks_triggered'].append(fallback_info)
        
        bot_tracer.info(f"⚠️  FALLBACK_TRIGGERED [{self.trace_id}] Type: {fallback_type}, "
                       f"entries: {len(knowledge_entries)}")
        
        # Проверяем на потенциально устаревшие данные
        for entry in knowledge_entries[:5]:
            content = getattr(entry, 'content', '').lower()
            if any(phrase in content for phrase in ['время работы', 'пн-пт', '09:00', '18:00']):
                bot_tracer.warning(f"🚨 POTENTIAL_STALE_DATA [{self.trace_id}] "
                                 f"Found working hours info in fallback entry {getattr(entry, 'id', 'unknown')}")
    
    def log_cache_hit(self, cache_type: str, cache_key: str, hit: bool):
        """Логирует попадания/промахи кэша"""
        
        cache_info = {
            'type': cache_type,
            'key_hash': hashlib.md5(cache_key.encode()).hexdigest()[:8],
            'hit': hit
        }
        
        if hit:
            self.trace_data['cache_hits'].append(cache_info)
            bot_tracer.info(f"💾 CACHE_HIT [{self.trace_id}] Type: {cache_type}")
        else:
            bot_tracer.info(f"💾 CACHE_MISS [{self.trace_id}] Type: {cache_type}")
    
    def log_system_prompt_usage(self, system_prompt: str):
        """Логирует использование системного промпта"""
        
        # Проверяем на хардкод в промпте
        prompt_lower = system_prompt.lower()
        suspicious_phrases = ['время работы', 'пн-пт', '09:00', '18:00', 'рабочие часы']
        
        found_phrases = [phrase for phrase in suspicious_phrases if phrase in prompt_lower]
        
        if found_phrases:
            bot_tracer.warning(f"🚨 HARDCODED_INFO [{self.trace_id}] "
                             f"Found suspicious phrases in system prompt: {found_phrases}")
            
            self.trace_data['sources_used'].append({
                'type': 'system_prompt_hardcode',
                'phrases': found_phrases
            })
    
    def log_final_response(self, response: str, model_used: str = None):
        """Логирует финальный ответ"""
        
        self.trace_data['final_response'] = {
            'text': response[:200] + '...' if len(response) > 200 else response,
            'length': len(response),
            'model': model_used,
            'contains_working_hours': any(phrase in response.lower() 
                                        for phrase in ['время работы', 'пн-пт', '09:00', '18:00'])
        }
        
        # Анализируем источник ответа
        if not self.trace_data['sources_used'] and not self.trace_data['fallbacks_triggered']:
            bot_tracer.warning(f"🤔 UNKNOWN_SOURCE [{self.trace_id}] "
                             f"Response generated without tracked knowledge sources")
        
        # Проверяем на потенциально устаревшую информацию в ответе
        if self.trace_data['final_response']['contains_working_hours']:
            bot_tracer.warning(f"🚨 WORKING_HOURS_IN_RESPONSE [{self.trace_id}] "
                             f"Response contains working hours information")
        
        bot_tracer.info(f"✅ TRACE_END [{self.trace_id}] Response length: {len(response)}, "
                       f"Sources used: {len(self.trace_data['sources_used'])}, "
                       f"Fallbacks: {len(self.trace_data['fallbacks_triggered'])}")
    
    def get_trace_summary(self) -> Dict[str, Any]:
        """Возвращает сводку трассировки"""
        return {
            'trace_id': self.trace_id,
            'query': self.query,
            'sources_summary': {
                'embeddings_chunks': sum(1 for s in self.trace_data['sources_used'] if s['type'] == 'embeddings'),
                'fallback_entries': sum(f['entries_count'] for f in self.trace_data['fallbacks_triggered']),
                'cache_hits': len(self.trace_data['cache_hits']),
                'hardcoded_sources': sum(1 for s in self.trace_data['sources_used'] if 'hardcode' in s['type'])
            },
            'potential_issues': {
                'no_tracked_sources': not self.trace_data['sources_used'] and not self.trace_data['fallbacks_triggered'],
                'contains_working_hours': self.trace_data.get('final_response', {}).get('contains_working_hours', False),
                'used_fallback': len(self.trace_data['fallbacks_triggered']) > 0
            }
        }

def patch_bot_response_with_tracing():
    """
    Патчит функцию get_bot_ai_response для добавления трассировки
    """
    
    # Этот код нужно интегрировать в api/bots.py
    patch_code = '''
# В начале функции get_bot_ai_response добавить:
from enhanced_bot_logging import BotResponseTracer

tracer = BotResponseTracer(user_id, assistant_id, message)

# После поиска embeddings:
tracer.log_embeddings_search(relevant_chunks, {
    'top_k': 5,
    'min_similarity': 0.7,
    'user_id': user_id,
    'assistant_id': assistant_id
})

# После fallback к UserKnowledge:
if not relevant_chunks and knowledge_entries:
    tracer.log_fallback_knowledge(knowledge_entries, "user_knowledge_fallback")

# При проверке кэша AI ответов:
tracer.log_cache_hit("ai_response", messages_hash, cached_response is not None)

# При использовании системного промпта:
tracer.log_system_prompt_usage(system_prompt)

# В конце, перед возвратом ответа:
tracer.log_final_response(ai_response, ai_model)

# Сохраняем trace для анализа
trace_summary = tracer.get_trace_summary()
if trace_summary['potential_issues']['contains_working_hours']:
    logger.warning(f"Potential stale data in response for user {user_id}")
'''
    
    return patch_code

def analyze_traces(hours: int = 24) -> Dict[str, Any]:
    """
    Анализирует логи трассировки за указанный период
    
    Args:
        hours: Количество часов для анализа (по умолчанию 24)
    
    Returns:
        Словарь с анализом проблем
    """
    
    import re
    from datetime import datetime, timedelta
    
    cutoff_time = datetime.now() - timedelta(hours=hours)
    
    issues = {
        'stale_data_responses': [],
        'unknown_source_responses': [],
        'fallback_usage': [],
        'hardcoded_info_usage': []
    }
    
    try:
        with open('bot_response_trace.log', 'r', encoding='utf-8') as f:
            for line in f:
                if 'WORKING_HOURS_IN_RESPONSE' in line:
                    match = re.search(r'\[(.*?)\].*TRACE_ID \[(.*?)\]', line)
                    if match:
                        timestamp_str, trace_id = match.groups()
                        try:
                            log_time = datetime.strptime(timestamp_str, '%Y-%m-%d %H:%M:%S')
                            if log_time >= cutoff_time:
                                issues['stale_data_responses'].append({
                                    'trace_id': trace_id,
                                    'timestamp': timestamp_str,
                                    'line': line.strip()
                                })
                        except ValueError:
                            continue
                
                elif 'UNKNOWN_SOURCE' in line:
                    match = re.search(r'\[(.*?)\].*TRACE_ID \[(.*?)\]', line)
                    if match:
                        timestamp_str, trace_id = match.groups()
                        try:
                            log_time = datetime.strptime(timestamp_str, '%Y-%m-%d %H:%M:%S')
                            if log_time >= cutoff_time:
                                issues['unknown_source_responses'].append({
                                    'trace_id': trace_id,
                                    'timestamp': timestamp_str,
                                    'line': line.strip()
                                })
                        except ValueError:
                            continue
                
                elif 'FALLBACK_TRIGGERED' in line:
                    match = re.search(r'\[(.*?)\].*TRACE_ID \[(.*?)\]', line)
                    if match:
                        timestamp_str, trace_id = match.groups()
                        try:
                            log_time = datetime.strptime(timestamp_str, '%Y-%m-%d %H:%M:%S')
                            if log_time >= cutoff_time:
                                issues['fallback_usage'].append({
                                    'trace_id': trace_id,
                                    'timestamp': timestamp_str,
                                    'line': line.strip()
                                })
                        except ValueError:
                            continue
                
                elif 'HARDCODED_INFO' in line:
                    match = re.search(r'\[(.*?)\].*TRACE_ID \[(.*?)\]', line)
                    if match:
                        timestamp_str, trace_id = match.groups()
                        try:
                            log_time = datetime.strptime(timestamp_str, '%Y-%m-%d %H:%M:%S')
                            if log_time >= cutoff_time:
                                issues['hardcoded_info_usage'].append({
                                    'trace_id': trace_id,
                                    'timestamp': timestamp_str,
                                    'line': line.strip()
                                })
                        except ValueError:
                            continue
    
    except FileNotFoundError:
        pass
    
    return issues

if __name__ == "__main__":
    # Пример использования
    print("🔍 Анализ логов трассировки за последние 24 часа:")
    
    issues = analyze_traces(24)
    
    print(f"📊 Найдено проблем:")
    print(f"  • Ответы с устаревшими данными: {len(issues['stale_data_responses'])}")
    print(f"  • Ответы с неизвестными источниками: {len(issues['unknown_source_responses'])}")
    print(f"  • Использование fallback: {len(issues['fallback_usage'])}")
    print(f"  • Использование хардкода: {len(issues['hardcoded_info_usage'])}")
    
    if issues['stale_data_responses']:
        print(f"\n🚨 ОТВЕТЫ С УСТАРЕВШИМИ ДАННЫМИ:")
        for issue in issues['stale_data_responses'][:5]:
            print(f"  {issue['timestamp']} [{issue['trace_id']}]")