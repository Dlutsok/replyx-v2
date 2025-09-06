"""
Regression тесты для iframe domain validation
Проверяют что проблема 4003 (Domain not allowed) решена для iframe сценариев
"""

import pytest
from unittest.mock import patch
from services.websocket_manager import _is_domain_allowed_by_token


class TestIframeDomainValidation:
    """Regression тесты для iframe валидации доменов"""
    
    def setup_method(self):
        """Настройка для каждого теста"""
        # JWT токен с allowed_domains="stencom.ru"
        self.test_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJhc3Npc3RhbnRfaWQiOjMsInR5cGUiOiJzaXRlIiwiYWxsb3dlZF9kb21haW5zIjoic3RlbmNvbS5ydSIsImRvbWFpbnNfaGFzaCI6ImNiYzNkOWM3ZGQyMTdmMTNkNzFjYTMyYTY3Mjc5NzJmYTEwYWVjNDc5OWQ4YjQ2ODM5ZTc4YWQyOGQ3NGYxMGUiLCJpc3N1ZWRfYXQiOjE3NTcxNDg5MjQsIndpZGdldF92ZXJzaW9uIjoiMSJ9.a5ECIDEWa5qKl3L6jGCEN3Ac-KM-KBFvig-37WdkdjI"
        
    def test_iframe_scenario_positive(self):
        """✅ ПОЗИТИВ: iframe на replyx.ru + parent_origin=stencom.ru → должен быть разрешён"""
        origin = "https://replyx.ru"
        parent_origin = "https://stencom.ru"
        
        result = _is_domain_allowed_by_token(origin, self.test_token, parent_origin)
        
        assert result == True, "Iframe сценарий replyx.ru → stencom.ru должен быть разрешён"
        
    def test_iframe_scenario_no_parent_origin(self):
        """❌ НЕГАТИВ: iframe на replyx.ru БЕЗ parent_origin → должен быть запрещён"""
        origin = "https://replyx.ru"
        parent_origin = None
        
        result = _is_domain_allowed_by_token(origin, self.test_token, parent_origin)
        
        assert result == False, "Trusted origin без parent_origin должен быть запрещён"
        
    def test_iframe_scenario_wrong_parent_origin(self):
        """❌ НЕГАТИВ: iframe на replyx.ru + parent_origin=evil.com → должен быть запрещён"""
        origin = "https://replyx.ru"
        parent_origin = "https://evil.com"
        
        result = _is_domain_allowed_by_token(origin, self.test_token, parent_origin)
        
        assert result == False, "Parent origin не из allowed_domains должен быть запрещён"
        
    def test_direct_connection_stencom_positive(self):
        """✅ ПОЗИТИВ: прямое подключение stencom.ru → должно быть разрешено"""
        origin = "https://stencom.ru"
        parent_origin = None
        
        result = _is_domain_allowed_by_token(origin, self.test_token, parent_origin)
        
        assert result == True, "Прямое подключение к stencom.ru должно быть разрешено"
        
    def test_direct_connection_replyx_negative(self):
        """❌ НЕГАТИВ: прямое подключение replyx.ru → должно быть запрещено"""
        origin = "https://replyx.ru"
        parent_origin = None
        
        result = _is_domain_allowed_by_token(origin, self.test_token, parent_origin)
        
        assert result == False, "Прямое подключение к replyx.ru должно быть запрещено"
        
    def test_untrusted_iframe_host(self):
        """❌ НЕГАТИВ: iframe на недоверенном хосте + parent_origin → должен быть запрещён"""
        origin = "https://evil.com"
        parent_origin = "https://stencom.ru"
        
        result = _is_domain_allowed_by_token(origin, self.test_token, parent_origin)
        
        assert result == False, "Недоверенный iframe host должен быть запрещён даже с правильным parent_origin"
        
    def test_www_subdomain_support(self):
        """✅ ПОЗИТИВ: поддержка www субдомена в parent_origin"""
        origin = "https://replyx.ru"
        parent_origin = "https://www.stencom.ru"  # www субдомен
        
        result = _is_domain_allowed_by_token(origin, self.test_token, parent_origin)
        
        assert result == True, "www субдомен в parent_origin должен поддерживаться"
        
    def test_case_insensitive_domains(self):
        """✅ ПОЗИТИВ: нечувствительность к регистру доменов"""
        origin = "https://REPLYX.RU"  # Верхний регистр
        parent_origin = "https://STENCOM.RU"  # Верхний регистр
        
        result = _is_domain_allowed_by_token(origin, self.test_token, parent_origin)
        
        assert result == True, "Домены должны быть нечувствительны к регистру"
        
    def test_multiple_allowed_domains(self):
        """✅ ПОЗИТИВ: поддержка нескольких разрешённых доменов в токене"""
        # Токен с несколькими доменами
        multi_domain_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhbGxvd2VkX2RvbWFpbnMiOiJzdGVuY29tLnJ1LGV4YW1wbGUuY29tIn0.dummy"
        
        with patch('services.websocket_manager.jwt.decode') as mock_decode:
            mock_decode.side_effect = Exception("Invalid signature")
            
            with patch('services.websocket_manager.jwt.get_unverified_claims') as mock_unverified:
                mock_unverified.return_value = {"allowed_domains": "stencom.ru,example.com"}
                
                # Первый домен
                result1 = _is_domain_allowed_by_token("https://replyx.ru", multi_domain_token, "https://stencom.ru")
                assert result1 == True
                
                # Второй домен  
                result2 = _is_domain_allowed_by_token("https://replyx.ru", multi_domain_token, "https://example.com")
                assert result2 == True
                
                # Недопустимый домен
                result3 = _is_domain_allowed_by_token("https://replyx.ru", multi_domain_token, "https://evil.com")
                assert result3 == False


class TestIframeRegressionScenarios:
    """Специфичные regression сценарии для stencom.ru проблемы"""
    
    def test_stencom_ru_exact_scenario(self):
        """
        Exact regression test для stencom.ru проблемы
        
        Сценарий:
        1. Страница загружается на stencom.ru
        2. iframe загружается с replyx.ru  
        3. WebSocket подключается из iframe
        4. Должен быть успешный handshake, НЕ код 4003
        """
        stencom_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJhc3Npc3RhbnRfaWQiOjMsInR5cGUiOiJzaXRlIiwiYWxsb3dlZF9kb21haW5zIjoic3RlbmNvbS5ydSIsImRvbWFpbnNfaGFzaCI6ImNiYzNkOWM3ZGQyMTdmMTNkNzFjYTMyYTY3Mjc5NzJmYTEwYWVjNDc5OWQ4YjQ2ODM5ZTc4YWQyOGQ3NGYxMGUiLCJpc3N1ZWRfYXQiOjE3NTcxNDg5MjQsIndpZGdldF92ZXJzaW9uIjoiMSJ9.a5ECIDEWa5qKl3L6jGCEN3Ac-KM-KBFvig-37WdkdjI"
        
        # WebSocket Origin (iframe host)
        websocket_origin = "https://replyx.ru"
        
        # Parent page origin
        parent_page_origin = "https://stencom.ru"
        
        # Должен быть разрешён
        result = _is_domain_allowed_by_token(websocket_origin, stencom_token, parent_page_origin)
        
        assert result == True, "stencom.ru iframe сценарий НЕ должен возвращать код 4003"
        
    def test_production_trusted_hosts_config(self):
        """Тест что production конфиг работает корректно"""
        
        with patch('core.app_config.WS_TRUSTED_IFRAME_HOSTS', ['replyx.ru', 'www.replyx.ru']):
            # Производственный сценарий: только replyx.ru и www.replyx.ru доверенные
            token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhbGxvd2VkX2RvbWFpbnMiOiJjbGllbnQuY29tIn0.dummy"
            
            with patch('services.websocket_manager.jwt.decode') as mock_decode:
                mock_decode.side_effect = Exception("Invalid signature")
                
                with patch('services.websocket_manager.jwt.get_unverified_claims') as mock_unverified:
                    mock_unverified.return_value = {"allowed_domains": "client.com"}
                    
                    # Доверенный хост → должен работать
                    result1 = _is_domain_allowed_by_token("https://replyx.ru", token, "https://client.com")
                    assert result1 == True
                    
                    # www вариант → тоже должен работать  
                    result2 = _is_domain_allowed_by_token("https://www.replyx.ru", token, "https://client.com")
                    assert result2 == True
                    
                    # localhost НЕ в production списке → должен блокироваться
                    result3 = _is_domain_allowed_by_token("https://localhost:3000", token, "https://client.com")
                    assert result3 == False
                    
    def test_no_code_4003_regression(self):
        """
        Regression тест: убедиться что НЕТ 4003 для валидных iframe сценариев
        
        Этот тест имитирует полный WebSocket handshake flow и проверяет
        что валидация пропускает iframe соединения
        """
        scenarios = [
            # (origin, parent_origin, token_domains, expected_result)
            ("https://replyx.ru", "https://stencom.ru", "stencom.ru", True),
            ("https://replyx.ru", "https://client.com", "client.com", True), 
            ("https://www.replyx.ru", "https://example.org", "example.org", True),
            ("https://replyx.ru", None, "stencom.ru", False),  # Нет parent_origin
            ("https://replyx.ru", "https://evil.com", "stencom.ru", False),  # Wrong parent
        ]
        
        for origin, parent_origin, token_domains, expected in scenarios:
            with patch('services.websocket_manager.jwt.decode') as mock_decode:
                mock_decode.side_effect = Exception("Invalid signature")
                
                with patch('services.websocket_manager.jwt.get_unverified_claims') as mock_unverified:
                    mock_unverified.return_value = {"allowed_domains": token_domains}
                    
                    result = _is_domain_allowed_by_token(origin, "dummy_token", parent_origin)
                    
                    assert result == expected, f"Scenario failed: origin={origin}, parent={parent_origin}, domains={token_domains}"


if __name__ == "__main__":
    # Запуск тестов
    pytest.main([__file__, "-v"])