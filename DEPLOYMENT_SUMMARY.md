# 🎯 CORS Security Deployment Summary

## 📊 Что сделано

✅ **DynamicCORSMiddleware** - безопасная замена CORS_ORIGINS="*"  
✅ **Разделение политик** - основное приложение (credentials) vs виджеты (JWT)  
✅ **Мониторинг безопасности** - метрики всех CORS запросов в Prometheus  
✅ **Тесты деплоя** - автоматическая проверка безопасности  
✅ **План отката** - быстрое восстановление в случае проблем  

## 🚀 Quick Deploy Commands

```bash
# 1. BACKUP (ОБЯЗАТЕЛЬНО!)
pg_dump replyx_prod > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Deploy
systemctl stop replyx-backend replyx-workers
git pull origin main
cp .env.production.example .env.production
nano .env.production  # Заполните CORS_ORIGINS, SITE_SECRET, etc.
pip install -r requirements.txt
alembic stamp head  # Если нужно
systemctl start replyx-backend replyx-workers

# 3. Test
./deployment_tests.sh
```

## 🔧 Key Configuration

### `.env.production`
```
CORS_ORIGINS=https://replyx.ru,https://www.replyx.ru  # БЕЗ "*"!
ENABLE_CSRF_PROTECTION=false                          # Для виджетов
SITE_SECRET=your-unique-widget-secret                 # JWT виджетов
```

### Nginx
```nginx
# УДАЛИТЕ старые CORS заголовки из nginx!
# add_header 'Access-Control-Allow-Origin' '*';  ❌

# ДОБАВЬТЕ только:
add_header Vary Origin always;  ✅
```

## ⚡ Quick Tests

```bash
# Health
curl -sS https://replyx.ru/health

# Admin (credentials)
curl -sS https://replyx.ru/api/login -H "Origin: https://replyx.ru" -H "Content-Type: application/json" -d '{"email":"test","password":"test"}' -i
# Expect: Access-Control-Allow-Credentials: true

# Widget (no credentials)  
curl -sS https://replyx.ru/api/validate-widget-token -X OPTIONS -H "Origin: https://stencom.ru" -H "Access-Control-Request-Method: POST" -i
# Expect: HTTP 200, NO credentials

# Block evil
curl -sS https://replyx.ru/api/validate-widget-token -X OPTIONS -H "Origin: https://evil.example" -i  
# Expect: HTTP 403 OR no CORS headers
```

## 🚨 Rollback (if needed)

```bash
systemctl stop replyx-backend replyx-workers
git checkout HEAD~1
export CORS_ORIGINS="https://replyx.ru,https://www.replyx.ru,https://stencom.ru"
systemctl start replyx-backend replyx-workers
```

## 📈 Monitoring

Watch these metrics in Grafana:
- `widget_cors_requests_total` - виджет трафик
- `widget_blocked_origins_total` - атаки
- `widget_token_validations_total{result="invalid"}` - подделки токенов

## 🎯 Success Criteria

- [ ] `./deployment_tests.sh` проходит все тесты
- [ ] Admin панель работает (с credentials)  
- [ ] Виджеты работают на внешних сайтах (без credentials)
- [ ] Злонамеренные домены блокируются
- [ ] Метрики собираются в Prometheus

---

**🏁 Ready to deploy!** 

Все файлы готовы:
- `DEPLOYMENT_CHECKLIST.md` - полный чек-лист
- `deployment_tests.sh` - автоматические тесты  
- `.env.production.example` - образец конфигурации
- `nginx_cors_config.conf` - конфиг для Nginx
- `check_alembic.sh` - проверка миграций