# Рекомендации по безопасности загрузки файлов

## Текущие защитные механизмы ✅
- [x] Валидация расширений файлов
- [x] MIME-type проверка через python-magic
- [x] Path traversal защита  
- [x] Сканирование подозрительных паттернов
- [x] Ограничение размера файлов
- [x] Rate limiting (10 файлов за 5 минут)
- [x] Изоляция по пользователям (/uploads/{user_id}/)

## Критические улучшения 🔴

### 1. Сканирование на вирусы
```python
# Интеграция с ClamAV или VirusTotal API
def scan_file_for_viruses(file_path: str) -> bool:
    import pyclamd
    cd = pyclamd.ClamdAgnostic()
    scan_result = cd.scan_file(file_path)
    return scan_result is None  # None = чистый файл
```

### 2. Проверка макросов в Office документах  
```python
# Использовать oletools для анализа макросов
from oletools.olevba import VBA_Parser
def check_office_macros(file_path: str) -> bool:
    vba_parser = VBA_Parser(file_path)
    if vba_parser.detect_vba_macros():
        return False  # Блокировать файлы с макросами
    return True
```

### 3. PDF JavaScript детекция
```python
# Анализ PDF на наличие JavaScript
import PyPDF2
def check_pdf_javascript(file_path: str) -> bool:
    with open(file_path, 'rb') as f:
        reader = PyPDF2.PdfReader(f)
        for page in reader.pages:
            if '/JS' in str(page) or '/JavaScript' in str(page):
                return False  # Блокировать PDF с JS
    return True
```

## Дополнительные меры 🟡

### 4. Sandbox выполнение
```python
# Запуск обработки в изолированном контейнере
# Docker контейнер без сетевого доступа для извлечения текста
```

### 5. Двухэтапная проверка
```python
# 1. Быстрая проверка → временное хранение
# 2. Глубокое сканирование → окончательное размещение
```

### 6. Мониторинг аномалий
```python
# Логирование подозрительных активностей:
# - Множественные загрузки одинаковых файлов
# - Файлы с подозрительными именами  
# - Превышение лимитов размера
```

### 7. Content Security Policy для PDF
```python
# При отдаче PDF файлов добавлять заголовки:
headers = {
    'Content-Security-Policy': "script-src 'none'",
    'X-Content-Type-Options': 'nosniff'
}
```

## Архитектурные улучшения 🔵

### 8. Отдельный сервис обработки
```python
# Выделить обработку файлов в отдельный микросервис
# С ограниченными правами доступа
```

### 9. S3/MinIO для хранения
```python
# Хранить файлы в S3, а не в файловой системе сервера
# Использовать pre-signed URLs для доступа
```

### 10. Карантин новых файлов
```python
# Новые файлы 24 часа находятся в карантине
# Дополнительное сканирование и проверки
```

## Готовый код улучшений

### Улучшенный FileValidator:
```python
class EnhancedFileValidator:
    @staticmethod 
    async def deep_scan_file(file_path: str, content: bytes) -> Tuple[bool, str]:
        \"\"\"Глубокое сканирование файла\"\"\"
        
        # 1. Проверка на вирусы (если доступен ClamAV)
        try:
            import pyclamd
            cd = pyclamd.ClamdAgnostic()
            if cd.ping():
                scan_result = cd.scan_file(file_path)
                if scan_result:
                    return False, f"Вирус обнаружен: {scan_result}"
        except ImportError:
            logger.warning("ClamAV не установлен, пропускаем антивирусную проверку")
        
        # 2. Проверка макросов в Office файлах
        if file_path.endswith(('.doc', '.docx', '.xls', '.xlsx')):
            try:
                from oletools.olevba import VBA_Parser
                vba = VBA_Parser(file_path)
                if vba.detect_vba_macros():
                    return False, "Файл содержит VBA макросы"
            except ImportError:
                logger.warning("oletools не установлен")
        
        # 3. Проверка PDF JavaScript
        if file_path.endswith('.pdf'):
            try:
                import PyPDF2
                with open(file_path, 'rb') as f:
                    reader = PyPDF2.PdfReader(f)
                    for page in reader.pages:
                        page_content = str(page)
                        if '/JS' in page_content or '/JavaScript' in page_content:
                            return False, "PDF содержит JavaScript"
            except Exception as e:
                logger.warning(f"Ошибка проверки PDF: {e}")
        
        return True, ""
```

## Немедленные действия (можно реализовать сегодня):

1. **Блокировать файлы с макросами** - добавить в DANGEROUS_PATTERNS
2. **Ограничить PDF функциональность** - проверять на JavaScript
3. **Усилить логирование** - записывать все попытки загрузки подозрительных файлов
4. **Добавить карантин** - новые файлы недоступны 1 час после загрузки
5. **Мониторинг дискового пространства** - алерты при превышении лимитов

## Оценка текущих рисков:
- 🟢 **XSS/JS injection** - защищены (сканирование паттернов)
- 🟢 **Path traversal** - защищены (валидация путей) 
- 🟢 **Executable files** - защищены (белый список расширений)
- 🟡 **Office макросы** - НЕ защищены (нужны oletools)
- 🟡 **PDF JavaScript** - НЕ защищены (нужна проверка)
- 🔴 **Вирусы/малварь** - НЕ защищены (нужен антивирус)