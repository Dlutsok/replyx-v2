# Полный чек-лист интеграции с Тинькоф Банком (эквайринг)
*Версия API: 2.0 | Дата создания: 2025-09-09*

## 🔍 АНАЛИЗ ТЕКУЩЕЙ ИНТЕГРАЦИИ

### ✅ Что реализовано:
- **Backend**: Модель Payment, API endpoints, алгоритм подписи
- **Frontend**: Страница баланса, виджеты оплаты, integration.js
- **База данных**: Таблица payments с полной схемой
- **Конфигурация**: Переменные окружения, CSP политики
- **Тестирование**: Mock режим, тестовые данные

### ❌ Критические проблемы:
- **Отсутствует endpoint для webhook уведомлений**
- **Неполная обработка статусов платежей**
- **Нет верификации подписи уведомлений**
- **Отсутствует параметр OperationInitiatorType**
- **Неполная обработка кодов ошибок**

---

## 1. ОБЯЗАТЕЛЬНЫЕ ПАРАМЕТРЫ МЕТОДА Init

### ✅ Реализованные обязательные параметры:
```python
data = {
    'TerminalKey': TINKOFF_TERMINAL_KEY,  # ✅ Обязательный
    'OrderId': order_id,                  # ✅ Обязательный 
    'Amount': amount,                     # ✅ Обязательный (в копейках)
    'Token': token,                       # ✅ Обязательный (подпись)
}
```

### ⚠️ Отсутствующие критически важные параметры:

#### **OperationInitiatorType** (Критически важно!)
**Статус**: ❌ ОТСУТСТВУЕТ  
**Требование**: Обязательный с определенной версии API
**Значения**: 
- `'Customer'` - инициатор клиент (рекомендуется)
- `'Merchant'` - инициатор мерчант

**Решение**:
```python
data['OperationInitiatorType'] = 'Customer'
```

### ✅ Корректно реализованные опциональные параметры:
```python
'Currency': 'RUB',           # ✅ По умолчанию
'Description': description,   # ✅ Рекомендуется
'CustomerKey': customer_key,  # ✅ Для привязки карт
'SuccessURL': success_url,    # ✅ URL успеха
'FailURL': fail_url,         # ✅ URL ошибки
'Language': 'ru',            # ✅ Язык интерфейса
'PayType': 'O'               # ✅ Одностадийный платеж
```

### 🔧 Рекомендуемые дополнительные параметры:
```python
# Добавить в data:
'Email': customer_email,           # Для отправки чека
'Phone': customer_phone,           # Для СМС уведомлений  
'Name': customer_name,             # ФИО плательщика
'Receipt': receipt_data,           # Данные чека (54-ФЗ)
'PaymentSource': 'web',           # Источник платежа
'IP': client_ip,                  # IP адрес клиента
'RedirectDueDate': expiry_date,   # Срок действия ссылки
```

---

## 2. АЛГОРИТМ ФОРМИРОВАНИЯ ТОКЕНА (ПОДПИСИ)

### ✅ Текущий алгоритм (корректный):
```python
def calculate_signature(data: dict) -> str:
    # 1. Исключаем поля подписи и пустые значения
    filtered_data = {k: v for k, v in data.items() 
                    if k not in ['token', 'Token'] and v is not None and str(v).strip() != ''}
    
    # 2. Добавляем секретный ключ
    filtered_data['Password'] = TINKOFF_SECRET_KEY
    
    # 3. Сортируем по ключам
    sorted_keys = sorted(filtered_data.keys())
    
    # 4. Создаем строку конкатенации
    concatenated_values = [str(filtered_data[key]) for key in sorted_keys]
    concatenated_string = ''.join(concatenated_values)
    
    # 5. SHA256 хеш
    return hashlib.sha256(concatenated_string.encode('utf-8')).hexdigest()
```

### 🔍 Проверка алгоритма:
- ✅ **Исключение полей**: token, Token, пустые значения
- ✅ **Добавление пароля**: как поле 'Password'
- ✅ **Сортировка**: по ключам в алфавитном порядке  
- ✅ **Кодировка**: UTF-8
- ✅ **Хеширование**: SHA256
- ✅ **Формат**: lowercase hex

### ⚠️ Потенциальные проблемы:
1. **Логирование**: Пароль логируется в debug режиме (угроза безопасности)
2. **Типы данных**: Нет проверки типов перед str()

**Улучшения**:
```python
def calculate_signature(data: dict) -> str:
    filtered_data = {}
    for k, v in data.items():
        if k.lower() in ['token'] or v is None:
            continue
        # Безопасное преобразование типов
        if isinstance(v, bool):
            filtered_data[k] = 'true' if v else 'false'
        elif isinstance(v, (int, float)):
            filtered_data[k] = str(v)
        else:
            filtered_data[k] = str(v).strip()
            
    filtered_data['Password'] = TINKOFF_SECRET_KEY
    
    sorted_keys = sorted(filtered_data.keys())
    concatenated_string = ''.join([filtered_data[key] for key in sorted_keys])
    
    # НЕ логируем пароль!
    logger.debug(f"Signature keys: {[k for k in sorted_keys if k != 'Password']}")
    
    return hashlib.sha256(concatenated_string.encode('utf-8')).hexdigest()
```

---

## 3. СТАТУСНАЯ МОДЕЛЬ ПЛАТЕЖЕЙ

### ✅ Текущие статусы в БД:
```python
status = Column(String, default='pending')
# 'pending', 'processing', 'success', 'failed', 'cancelled'
```

### 📋 Полная статусная модель Тинькоф:

#### **Основные статусы**:
- **`NEW`** - платеж создан
- **`FORM_SHOWED`** - покупателю отображена форма оплаты  
- **`AUTHORIZING`** - идет авторизация
- **`3DS_CHECKING`** - проверка 3DS
- **`AUTH_FAIL`** - авторизация отклонена
- **`AUTHORIZED`** - авторизован, ожидает подтверждения
- **`CONFIRMING`** - подтверждается
- **`CONFIRMED`** - подтвержден
- **`REVERSING`** - отменяется  
- **`PARTIAL_REVERSED`** - частично отменен
- **`REVERSED`** - отменен
- **`REFUNDING`** - возвращается
- **`PARTIAL_REFUNDED`** - частично возвращен  
- **`REFUNDED`** - возвращен
- **`DEADLINE_EXPIRED`** - истек срок оплаты
- **`REJECTED`** - отклонен
- **`CANCELED`** - отменен

#### **Маппинг для упрощенной модели**:
```python
TINKOFF_STATUS_MAPPING = {
    'NEW': 'pending',
    'FORM_SHOWED': 'pending', 
    'AUTHORIZING': 'processing',
    '3DS_CHECKING': 'processing',
    'AUTHORIZED': 'processing',
    'CONFIRMING': 'processing', 
    'CONFIRMED': 'success',
    'AUTH_FAIL': 'failed',
    'REJECTED': 'failed',
    'DEADLINE_EXPIRED': 'failed',
    'CANCELED': 'cancelled',
    'REVERSED': 'cancelled',
    'PARTIAL_REVERSED': 'partial_refunded',  # Новый статус
    'REFUNDED': 'refunded',                  # Новый статус
    'PARTIAL_REFUNDED': 'partial_refunded',  # Новый статус
}
```

---

## 4. ОБРАБОТКА УВЕДОМЛЕНИЙ (NOTIFICATIONS)

### ❌ **КРИТИЧЕСКАЯ ПРОБЛЕМА**: Отсутствует endpoint для webhook

**Требуется создать**:
```python
@router.post("/tinkoff-notification")
async def handle_tinkoff_notification(request: Request, db: Session = Depends(get_db)):
    """Обработка уведомлений от Тинькофф о статусе платежа"""
    try:
        # Получаем данные
        form_data = await request.form()
        data = dict(form_data)
        
        logger.info(f"Получено уведомление от Тинькофф: {data}")
        
        # КРИТИЧЕСКИ ВАЖНО: Проверяем подпись
        received_token = data.pop('Token', '')
        calculated_token = calculate_signature(data)
        
        if received_token.lower() != calculated_token.lower():
            logger.error(f"Неверная подпись уведомления: {received_token} != {calculated_token}")
            raise HTTPException(status_code=400, detail="Invalid signature")
        
        # Обрабатываем уведомление  
        order_id = data.get('OrderId')
        status = data.get('Status') 
        payment_id = data.get('PaymentId')
        
        payment = db.query(Payment).filter(Payment.order_id == order_id).first()
        if not payment:
            logger.warning(f"Платеж не найден: {order_id}")
            return {"status": "ok"}  # Возвращаем OK чтобы Тинькоф не повторял
            
        # Обновляем статус
        old_status = payment.status
        payment.status = TINKOFF_STATUS_MAPPING.get(status, 'unknown')
        payment.tinkoff_payment_id = payment_id
        
        if payment.status == 'success' and old_status != 'success':
            payment.completed_at = datetime.utcnow()
            
            # Пополняем баланс пользователя
            from services.balance_service import BalanceService
            balance_service = BalanceService(db)
            balance_service.add_balance(
                user_id=payment.user_id,
                amount=payment.amount,
                transaction_type='payment_topup',
                description=f"Пополнение через Т-Банк (заказ {order_id})"
            )
            
        db.commit()
        
        return {"status": "ok"}
        
    except Exception as e:
        logger.error(f"Ошибка обработки уведомления: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
```

### 🔧 Настройка NotificationURL:
```python
# В .env добавить:
TINKOFF_NOTIFICATION_URL=https://yourdomain.com/api/payments/tinkoff-notification

# В коде:
if os.getenv('TINKOFF_NOTIFICATION_URL'):
    data['NotificationURL'] = os.getenv('TINKOFF_NOTIFICATION_URL')
```

---

## 5. ТРЕБОВАНИЯ БЕЗОПАСНОСТИ

### ✅ Реализованные меры:
- ✅ **Подпись запросов**: SHA256 с секретным ключом
- ✅ **HTTPS**: Обязательно для продакшена  
- ✅ **Переменные окружения**: Секреты не в коде
- ✅ **CSP политики**: Обновлены для Т-Банк доменов

### ❌ **Критические недостатки**:

#### 1. **Верификация уведомлений**
**Проблема**: Нет проверки подписи входящих уведомлений
**Решение**: Добавить в webhook endpoint (см. выше)

#### 2. **Логирование секретов**  
**Проблема**: Пароль и токены логируются
```python
# ОПАСНО:
logger.error(f"Рассчитанный токен: {token}")
```

**Решение**:
```python
# БЕЗОПАСНО:
logger.info(f"Токен рассчитан успешно для OrderId: {order_id}")
```

#### 3. **Ограничение IP адресов**
**Проблема**: Нет whitelist IP Тинькофф для webhook  
**Решение**: Добавить проверку IP в nginx или коде:
```python
TINKOFF_IPS = ['91.194.226.0/23', '185.71.76.0/27', '185.71.77.0/27']

def is_tinkoff_ip(client_ip: str) -> bool:
    import ipaddress
    client = ipaddress.ip_address(client_ip)
    for network in TINKOFF_IPS:
        if client in ipaddress.ip_network(network):
            return True
    return False
```

#### 4. **Тайм-ауты и повторы**  
**Решение**:
```python
async def init_payment_tinkoff(...):
    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = await httpx.AsyncClient().post(
                f"{TINKOFF_API_URL}Init",
                json=data,
                timeout=30.0,  # Строгий тайм-аут
                headers={'User-Agent': 'YourApp/1.0'}
            )
            break
        except httpx.TimeoutException:
            if attempt == max_retries - 1:
                raise
            await asyncio.sleep(2 ** attempt)  # Exponential backoff
```

---

## 6. КОДЫ ОШИБОК И ОБРАБОТКА

### 📋 Основные коды ошибок Тинькоф:

#### **Ошибки авторизации**:
- **0** - Успешно
- **101** - Неверный терминал
- **102** - Неверная подпись
- **103** - Превышен лимит на операции  
- **104** - Неверная валюта
- **105** - Неверная сумма

#### **Ошибки платежа**:
- **106** - Платеж не найден
- **107** - Платеж в неверном статусе
- **108** - Превышен срок платежа
- **109** - Ошибка банка-эмитента
- **110** - Недостаточно средств

#### **Технические ошибки**:  
- **111** - Системная ошибка
- **112** - Неверный формат данных
- **113** - Дубль операции
- **114** - Запрещенная операция

### ✅ Улучшенная обработка:
```python
TINKOFF_ERROR_MESSAGES = {
    101: "Неверный терминал. Проверьте TerminalKey",
    102: "Неверная подпись. Проверьте алгоритм формирования токена", 
    103: "Превышен лимит операций. Обратитесь в поддержку",
    104: "Неподдерживаемая валюта",
    105: "Неверная сумма платежа",
    106: "Платеж не найден", 
    107: "Платеж нельзя обработать в текущем статусе",
    108: "Истек срок платежа",
    109: "Отказ банка-эмитента. Попробуйте другую карту",
    110: "Недостаточно средств на карте",
    111: "Системная ошибка. Повторите позже",
    112: "Неверный формат данных",
    113: "Дубль операции",
    114: "Операция запрещена"
}

async def init_payment_tinkoff(...):
    try:
        response = requests.post(f"{TINKOFF_API_URL}Init", json=data, timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            if result.get('Success'):
                return result['PaymentURL']
            else:
                error_code = result.get('ErrorCode', 0)
                error_msg = TINKOFF_ERROR_MESSAGES.get(error_code, result.get('Message', 'Неизвестная ошибка'))
                
                logger.error(f"Ошибка Тинькофф: код {error_code}, сообщение: {error_msg}")
                raise PaymentException(f"Ошибка платежной системы: {error_msg}", error_code)
                
    except requests.exceptions.Timeout:
        raise PaymentException("Превышено время ожидания ответа от платежной системы", 999)
    except requests.exceptions.ConnectionError:
        raise PaymentException("Ошибка соединения с платежной системой", 998)

class PaymentException(Exception):
    def __init__(self, message: str, error_code: int = 0):
        self.message = message
        self.error_code = error_code
        super().__init__(self.message)
```

---

## 7. НАСТРОЙКИ ТЕРМИНАЛА 

### 📋 Критически важные настройки в ЛК Тинькоф:

#### **Общие настройки**:
- ✅ **Протокол**: HTTP/HTTPS (только HTTPS для продакшена)
- ✅ **Кодировка**: UTF-8  
- ✅ **Формат уведомлений**: JSON или Form data
- ⚠️ **IP адреса**: Добавить IP вашего сервера в whitelist

#### **URL настройки**:  
- ✅ **Success URL**: `https://yourdomain.com/payment/success`
- ✅ **Fail URL**: `https://yourdomain.com/payment/error` 
- ❌ **Notification URL**: `https://yourdomain.com/api/payments/tinkoff-notification` (ДОБАВИТЬ!)

#### **Дополнительные возможности**:
- **3DS**: Рекомендуется включить для безопасности
- **Сохранение карт**: Для постоянных клиентов  
- **Платежи без CVV**: Для сохраненных карт
- **СБП**: Система быстрых платежей
- **Рассрочка**: Тинькофф Рассрочка

---

## 8. ПАРАМЕТР OperationInitiatorType

### ❌ **КРИТИЧЕСКИ ВАЖНО**: Отсутствует в текущей реализации!

**Описание**: С определенной версии API этот параметр стал обязательным для соответствия требованиям ЦБ РФ.

**Значения**:
- **`Customer`** - операция инициирована клиентом (рекомендуется для интернет-платежей)
- **`Merchant`** - операция инициирована мерчантом

**Добавить в код**:
```python
data = {
    'TerminalKey': TINKOFF_TERMINAL_KEY,
    'OrderId': order_id,  
    'Amount': amount,
    'OperationInitiatorType': 'Customer',  # ← ДОБАВИТЬ ЭТО!
    # ... остальные параметры
}
```

---

## 9. INTEGRATION.JS И СОВРЕМЕННЫЕ ВИДЖЕТЫ

### ✅ Реализовано:
- ✅ Подключение `https://integrationjs.tbank.ru/integration.js`
- ✅ CSP политики для всех доменов Т-Банк
- ✅ Поддержка T-Pay, СБП, BNPL виджетов
- ✅ Fallback к классическому методу

### 🔧 Проверить реализацию:
```javascript  
// В _app.tsx должно быть:
<Script src="https://integrationjs.tbank.ru/integration.js" />

// В balance.js должно быть:
if (window.PaymentIntegration) {
    window.PaymentIntegration.init({
        terminalKey: process.env.NEXT_PUBLIC_TINKOFF_TERMINAL_KEY
    });
}
```

---

## 10. ТЕСТИРОВАНИЕ

### ✅ Тестовые данные:
```
TerminalKey: 1757348842151DEMO  
SecretKey: lczutIQhGoZoZrgW
```

### 📋 Тестовые карты:
- **Успешный платеж**: `2200000000000004`
- **Отклонен банком**: `2200000000000012` 
- **3DS авторизация**: `2200000000000020`
- **Недостаточно средств**: `2200000000000038`

### 🧪 План тестирования:
1. **Создание платежа** - Init метод
2. **Успешная оплата** - до статуса CONFIRMED
3. **Отклоненная оплата** - различные ошибки  
4. **Уведомления** - webhook обработка
5. **Возвраты** - Refund метод
6. **3DS** - аутентификация  
7. **Виджеты** - новые способы оплаты
8. **Безопасность** - проверка подписей

---

## 11. ИТОГОВЫЙ ЧЕК-ЛИСТ КРИТИЧЕСКИХ ИСПРАВЛЕНИЙ

### 🔴 **ОБЯЗАТЕЛЬНО ИСПРАВИТЬ**:

- [ ] **Добавить OperationInitiatorType** в Init запрос
- [ ] **Создать endpoint** для webhook уведомлений  
- [ ] **Добавить проверку подписи** уведомлений
- [ ] **Убрать логирование** секретных данных
- [ ] **Настроить NotificationURL** в ЛК Тинькофф
- [ ] **Добавить IP whitelist** для webhook
- [ ] **Расширить статусную модель** для всех статусов Тинькофф
- [ ] **Улучшить обработку ошибок** с детальными кодами

### 🟡 **РЕКОМЕНДУЕТСЯ**:

- [ ] Добавить параметры Email, Phone, Name для чеков
- [ ] Реализовать метод GetState для проверки статуса
- [ ] Добавить Refund метод для возвратов  
- [ ] Настроить мониторинг платежей
- [ ] Добавить Rate Limiting для API
- [ ] Реализовать идемпотентность операций
- [ ] Добавить детальное логирование без секретов

### 🟢 **ДОПОЛНИТЕЛЬНО**:

- [ ] Интеграция с СБП через виджеты
- [ ] Поддержка рассрочки
- [ ] Сохранение карт клиентов
- [ ] A/B тестирование способов оплаты
- [ ] Аналитика конверсии платежей

---

## 📞 КОНТАКТЫ ПОДДЕРЖКИ

- **Техподдержка эквайринга**: acquiring@tbank.ru
- **Документация**: https://www.tbank.ru/kassa/develop/  
- **Статус API**: https://status.tbank.ru/
- **Тестовая среда**: https://rest-api-test.tinkoff.ru/v2/
- **Продуктивная среда**: https://securepay.tinkoff.ru/v2/

---

*Документ создан на основе анализа текущей интеграции и официальной документации Тинькоф API v2.0*