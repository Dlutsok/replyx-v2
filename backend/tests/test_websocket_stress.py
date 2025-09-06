"""
Стресс-тесты для WebSocket системы ReplyX
Проверяет производительность под высокой нагрузкой
"""

import pytest
import asyncio
import time
import threading
from concurrent.futures import ThreadPoolExecutor
from unittest.mock import Mock, AsyncMock

from services.websocket_manager import (
    push_dialog_message,
    push_site_dialog_message,
    _check_rate_limit,
    ws_connections,
    ws_site_connections,
    _ws_rate_limits,
    _total_connections,
    get_connection_stats
)
from services.ws_message_queue import WSMessageQueue


class MockWebSocket:
    """Быстрый Mock WebSocket для стресс-тестов"""
    
    def __init__(self, should_fail=False):
        self.messages_sent = []
        self.should_fail = should_fail
        
    async def send_json(self, data):
        if self.should_fail:
            raise Exception("Mock connection error")
        self.messages_sent.append(data)


@pytest.fixture(autouse=True)
def cleanup_stress_tests():
    """Очистка после стресс-тестов"""
    global _total_connections
    ws_connections.clear()
    ws_site_connections.clear() 
    _ws_rate_limits.clear()
    _total_connections = 0
    yield
    ws_connections.clear()
    ws_site_connections.clear()
    _ws_rate_limits.clear()
    _total_connections = 0


class TestHighVolumeMessaging:
    """Тесты высокой нагрузки на отправку сообщений"""
    
    @pytest.mark.asyncio
    async def test_1000_concurrent_messages(self):
        """Стресс-тест: 1000 одновременных сообщений"""
        dialog_id = 1
        num_clients = 50
        num_messages = 1000
        
        # Создаем mock клиентов
        mock_clients = [MockWebSocket() for _ in range(num_clients)]
        ws_connections[dialog_id] = set(mock_clients)
        
        start_time = time.time()
        
        # Отправляем много сообщений параллельно
        tasks = []
        for i in range(num_messages):
            task = asyncio.create_task(
                push_dialog_message(dialog_id, {
                    "id": i, 
                    "text": f"Stress message {i}",
                    "timestamp": time.time()
                })
            )
            tasks.append(task)
            
        # Ждем завершения всех задач
        await asyncio.gather(*tasks)
        
        elapsed = time.time() - start_time
        
        print(f"Отправка {num_messages} сообщений {num_clients} клиентам заняла {elapsed:.2f}s")
        print(f"Производительность: {num_messages/elapsed:.2f} msg/sec")
        
        # Проверяем что все сообщения дошли
        for client in mock_clients:
            assert len(client.messages_sent) == num_messages
            
        # Производительность должна быть разумной (>100 msg/sec)
        assert num_messages/elapsed > 100, f"Производительность слишком низкая: {num_messages/elapsed:.2f} msg/sec"
        
    @pytest.mark.asyncio
    async def test_mixed_success_failure_load(self):
        """Стресс-тест со смешанными успешными и неуспешными отправками"""
        dialog_id = 1
        num_good_clients = 30
        num_bad_clients = 20
        num_messages = 500
        
        # Создаем смешанных клиентов
        good_clients = [MockWebSocket(should_fail=False) for _ in range(num_good_clients)]
        bad_clients = [MockWebSocket(should_fail=True) for _ in range(num_bad_clients)]
        
        all_clients = good_clients + bad_clients
        ws_connections[dialog_id] = set(all_clients)
        
        start_time = time.time()
        
        # Отправляем сообщения (некоторые будут падать)
        tasks = []
        for i in range(num_messages):
            task = asyncio.create_task(
                push_dialog_message(dialog_id, {"id": i, "text": f"Message {i}"})
            )
            tasks.append(task)
            
        await asyncio.gather(*tasks)
        
        elapsed = time.time() - start_time
        
        print(f"Смешанная отправка с ошибками заняла {elapsed:.2f}s")
        
        # Хорошие клиенты должны получить все сообщения
        for client in good_clients:
            assert len(client.messages_sent) == num_messages
            
        # Плохие клиенты должны быть удалены из соединений
        remaining_clients = ws_connections.get(dialog_id, set())
        for bad_client in bad_clients:
            assert bad_client not in remaining_clients


class TestRateLimitingPerformance:
    """Тесты производительности rate limiting"""
    
    def test_rate_limit_performance_single_ip(self):
        """Тест производительности rate limiting для одного IP"""
        test_ip = "192.168.1.100"
        num_checks = 10000
        
        start_time = time.time()
        
        for i in range(num_checks):
            _check_rate_limit(test_ip)
            
        elapsed = time.time() - start_time
        
        print(f"Rate limit проверка {num_checks} запросов заняла {elapsed:.2f}s")
        print(f"Производительность: {num_checks/elapsed:.2f} checks/sec")
        
        # Должно быть быстро (>1000 checks/sec)
        assert num_checks/elapsed > 1000, f"Rate limiting слишком медленный: {num_checks/elapsed:.2f} checks/sec"
        
    def test_rate_limit_performance_many_ips(self):
        """Тест производительности rate limiting для множества IP"""
        num_ips = 1000
        checks_per_ip = 10
        
        start_time = time.time()
        
        for i in range(num_ips):
            test_ip = f"192.168.{i//256}.{i%256}"
            for j in range(checks_per_ip):
                _check_rate_limit(test_ip)
                
        elapsed = time.time() - start_time
        total_checks = num_ips * checks_per_ip
        
        print(f"Rate limit для {num_ips} IP ({total_checks} проверок) заняло {elapsed:.2f}s")
        print(f"Производительность: {total_checks/elapsed:.2f} checks/sec")
        
        # Должно справляться с множеством IP
        assert total_checks/elapsed > 500
        
    def test_rate_limit_memory_usage(self):
        """Тест потребления памяти rate limiting"""
        import sys
        
        # Заполняем много IP адресов
        num_ips = 5000
        for i in range(num_ips):
            test_ip = f"10.{i//65536}.{(i//256)%256}.{i%256}"
            _check_rate_limit(test_ip)
            
        # Размер структуры данных должен быть разумным
        size = sys.getsizeof(_ws_rate_limits)
        print(f"Размер _ws_rate_limits для {num_ips} IP: {size} bytes")
        
        # Не должно превышать разумный размер (например, 1MB на 5000 IP)
        assert size < 1024 * 1024, f"Слишком большое потребление памяти: {size} bytes"


class TestConcurrentConnections:
    """Тесты множественных конкурентных подключений"""
    
    @pytest.mark.asyncio
    async def test_high_concurrency_different_dialogs(self):
        """Тест высокой конкурентности для разных диалогов"""
        num_dialogs = 100
        clients_per_dialog = 10
        messages_per_dialog = 50
        
        # Создаем клиентов для каждого диалога
        for dialog_id in range(1, num_dialogs + 1):
            mock_clients = [MockWebSocket() for _ in range(clients_per_dialog)]
            ws_connections[dialog_id] = set(mock_clients)
            
        start_time = time.time()
        
        # Отправляем сообщения во все диалоги параллельно
        all_tasks = []
        for dialog_id in range(1, num_dialogs + 1):
            for msg_num in range(messages_per_dialog):
                task = asyncio.create_task(
                    push_dialog_message(dialog_id, {
                        "id": msg_num,
                        "dialog_id": dialog_id, 
                        "text": f"Dialog {dialog_id} message {msg_num}"
                    })
                )
                all_tasks.append(task)
                
        await asyncio.gather(*all_tasks)
        
        elapsed = time.time() - start_time
        total_messages = num_dialogs * messages_per_dialog
        total_deliveries = total_messages * clients_per_dialog
        
        print(f"Доставка {total_deliveries} сообщений в {num_dialogs} диалогов заняла {elapsed:.2f}s")
        print(f"Производительность: {total_deliveries/elapsed:.2f} deliveries/sec")
        
        # Проверяем корректность доставки
        for dialog_id in range(1, num_dialogs + 1):
            clients = ws_connections[dialog_id]
            for client in clients:
                assert len(client.messages_sent) == messages_per_dialog
                
        # Производительность должна быть разумной
        assert total_deliveries/elapsed > 1000
        
    def test_connection_scaling_limits(self):
        """Тест лимитов масштабирования подключений"""
        max_connections = 1000
        dialog_id = 1
        
        # Создаем много подключений
        start_time = time.time()
        
        clients = []
        for i in range(max_connections):
            client = MockWebSocket()
            clients.append(client)
            
        ws_connections[dialog_id] = set(clients)
        
        creation_time = time.time() - start_time
        
        print(f"Создание {max_connections} подключений заняло {creation_time:.2f}s")
        
        # Тестируем отправку сообщения всем
        start_time = time.time()
        
        async def send_to_all():
            await push_dialog_message(dialog_id, {"text": "Scaling test message"})
            
        asyncio.run(send_to_all())
        
        broadcast_time = time.time() - start_time
        
        print(f"Отправка сообщения {max_connections} клиентам заняла {broadcast_time:.2f}s")
        
        # Все должны получить сообщение
        for client in clients:
            assert len(client.messages_sent) == 1
            
        # Время отправки должно быть разумным (< 1s для 1000 клиентов)
        assert broadcast_time < 1.0, f"Слишком медленная отправка: {broadcast_time:.2f}s"


class TestMemoryLeakProtection:
    """Тесты защиты от утечек памяти"""
    
    @pytest.mark.asyncio
    async def test_connection_cleanup_memory(self):
        """Тест очистки памяти при удалении соединений"""
        dialog_id = 1
        num_connections = 100
        
        # Создаем много соединений
        clients = [MockWebSocket() for _ in range(num_connections)]
        ws_connections[dialog_id] = set(clients)
        
        initial_stats = get_connection_stats()
        
        # Имитируем отключение всех клиентов через ошибки отправки
        for client in clients:
            client.should_fail = True
            
        # Отправляем сообщение (все клиенты должны быть удалены)
        await push_dialog_message(dialog_id, {"text": "cleanup test"})
        
        final_stats = get_connection_stats()
        
        # Все соединения должны быть очищены
        assert len(ws_connections.get(dialog_id, set())) == 0
        print(f"Очищено {num_connections} соединений после ошибок")
        
    def test_rate_limit_cleanup_memory(self):
        """Тест очистки памяти в rate limiting"""
        num_ips = 1000
        
        # Заполняем старые записи
        old_time = time.time() - 3600  # 1 час назад
        
        for i in range(num_ips):
            ip = f"172.16.{i//256}.{i%256}"
            _ws_rate_limits[ip] = [old_time] * 50
            
        initial_size = len(_ws_rate_limits)
        
        # Новая проверка должна очистить старые записи
        for i in range(100):
            ip = f"10.0.{i//256}.{i%256}"
            _check_rate_limit(ip)
            
        # Старые записи должны быть очищены во время проверки
        final_size = len(_ws_rate_limits)
        
        print(f"Rate limit записей: было {initial_size}, стало {final_size}")
        
        # Размер должен уменьшиться (старые записи очищаются)
        assert final_size < initial_size + 100  # Разрешаем небольшой рост от новых записей


class TestMessageQueuePerformance:
    """Тесты производительности message queue"""
    
    @pytest.mark.asyncio
    async def test_high_volume_ack_processing(self):
        """Тест обработки большого количества ACK сообщений"""
        queue = WSMessageQueue()
        num_messages = 1000
        
        # Отправляем много сообщений с ACK
        message_ids = []
        start_time = time.time()
        
        for i in range(num_messages):
            msg_id, _ = await queue.send_message_with_ack(
                dialog_id=1,
                websocket_id=f"ws_{i%10}",  # 10 разных websocket'ов
                payload={"text": f"Message {i}"}
            )
            message_ids.append(msg_id)
            
        send_time = time.time() - start_time
        
        # Обрабатываем все ACK
        ack_start = time.time()
        
        for i, msg_id in enumerate(message_ids):
            await queue.handle_ack(msg_id, f"ws_{i%10}")
            
        ack_time = time.time() - ack_start
        
        print(f"Отправка {num_messages} ACK сообщений: {send_time:.2f}s")
        print(f"Обработка {num_messages} ACK: {ack_time:.2f}s")
        print(f"Общая производительность: {num_messages/(send_time + ack_time):.2f} msg/sec")
        
        # Все сообщения должны быть обработаны
        assert len(queue.processed_messages) == num_messages
        assert len(queue.pending_messages) == 0
        
        # Производительность должна быть приемлемой
        assert num_messages/(send_time + ack_time) > 100


if __name__ == "__main__":
    # Запуск стресс-тестов
    pytest.main([__file__, "-v", "--asyncio-mode=auto", "-s"])  # -s для вывода print'ов