"""
API endpoints для мониторинга прокси метрик
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, List
import logging
from datetime import datetime

from ai.proxy_manager import get_proxy_manager
from core.auth import get_current_admin

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/proxy", tags=["proxy-monitoring"])


@router.get("/metrics", response_model=Dict[str, Any])
async def get_proxy_metrics(admin_user = Depends(get_current_admin)):
    """
    Получить метрики всех прокси (только для админов)
    
    Returns:
        - total_proxies: Общее количество настроенных прокси
        - available_proxies: Количество доступных прокси  
        - all_proxies_down: Все ли прокси недоступны (алерт)
        - proxies: Детальная информация по каждому прокси
    """
    try:
        proxy_manager = get_proxy_manager()
        metrics = proxy_manager.get_proxy_metrics()
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "status": "success",
            **metrics
        }
    except Exception as e:
        logger.error(f"Ошибка получения прокси метрик: {e}")
        raise HTTPException(status_code=500, detail="Ошибка получения метрик")


@router.get("/health")
async def proxy_health_check():
    """
    Простая проверка здоровья системы прокси (без авторизации)
    Для использования в health checks и мониторинге
    """
    try:
        proxy_manager = get_proxy_manager()
        metrics = proxy_manager.get_proxy_metrics()
        
        # Определяем общий статус
        if metrics["all_proxies_down"]:
            status = "unhealthy"
            message = "Все прокси недоступны"
            http_status = 503  # Service Unavailable
        elif metrics["available_proxies"] < metrics["total_proxies"]:
            status = "degraded" 
            message = f"{metrics['available_proxies']}/{metrics['total_proxies']} прокси доступны"
            http_status = 200
        else:
            status = "healthy"
            message = f"Все {metrics['total_proxies']} прокси работают"
            http_status = 200
        
        response = {
            "status": status,
            "message": message,
            "timestamp": datetime.utcnow().isoformat(),
            "available_proxies": metrics["available_proxies"],
            "total_proxies": metrics["total_proxies"]
        }
        
        if status == "unhealthy":
            raise HTTPException(status_code=http_status, detail=response)
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка health check прокси: {e}")
        raise HTTPException(
            status_code=500, 
            detail={
                "status": "error",
                "message": "Ошибка проверки прокси",
                "timestamp": datetime.utcnow().isoformat()
            }
        )


@router.get("/proxies/{proxy_name}/metrics")
async def get_single_proxy_metrics(proxy_name: str, admin_user = Depends(get_current_admin)):
    """Получить детальные метрики одного прокси"""
    try:
        proxy_manager = get_proxy_manager()
        metrics = proxy_manager.get_proxy_metrics()
        
        # Ищем прокси по имени
        proxy_metrics = None
        for proxy in metrics["proxies"]:
            if proxy["name"] == proxy_name:
                proxy_metrics = proxy
                break
        
        if not proxy_metrics:
            raise HTTPException(status_code=404, detail=f"Прокси '{proxy_name}' не найден")
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "proxy": proxy_metrics
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка получения метрик прокси {proxy_name}: {e}")
        raise HTTPException(status_code=500, detail="Ошибка получения метрик прокси")


@router.post("/proxies/{proxy_name}/reset")
async def reset_proxy_circuit_breaker(proxy_name: str, admin_user = Depends(get_current_admin)):
    """Принудительно сбросить circuit breaker для прокси"""
    try:
        proxy_manager = get_proxy_manager()
        
        # Ищем прокси по имени
        target_proxy = None
        for proxy in proxy_manager.proxies:
            if proxy.name == proxy_name:
                target_proxy = proxy
                break
        
        if not target_proxy:
            raise HTTPException(status_code=404, detail=f"Прокси '{proxy_name}' не найден")
        
        # Сбрасываем circuit breaker
        from ai.proxy_manager import CircuitState
        target_proxy.circuit_state = CircuitState.CLOSED
        target_proxy.failure_count = 0
        target_proxy.opened_at = None
        
        logger.info(f"🔄 Circuit breaker для прокси '{proxy_name}' сброшен администратором")
        
        return {
            "status": "success",
            "message": f"Circuit breaker для прокси '{proxy_name}' сброшен",
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка сброса circuit breaker для {proxy_name}: {e}")
        raise HTTPException(status_code=500, detail="Ошибка сброса circuit breaker")


@router.get("/alerts")
async def get_proxy_alerts():
    """
    Получить активные алерты по прокси (без авторизации для мониторинга)
    """
    try:
        proxy_manager = get_proxy_manager()
        metrics = proxy_manager.get_proxy_metrics()
        alerts = []
        
        # Критичный алерт: все прокси недоступны
        if metrics["all_proxies_down"]:
            alerts.append({
                "severity": "critical",
                "title": "Все прокси недоступны",
                "description": f"Все {metrics['total_proxies']} прокси заблокированы или неисправны",
                "timestamp": datetime.utcnow().isoformat(),
                "tags": ["proxy", "outage", "critical"]
            })
        
        # Предупреждение: частичная недоступность
        elif metrics["available_proxies"] < metrics["total_proxies"]:
            unavailable = metrics["total_proxies"] - metrics["available_proxies"]
            alerts.append({
                "severity": "warning", 
                "title": "Прокси частично недоступны",
                "description": f"{unavailable} из {metrics['total_proxies']} прокси недоступны",
                "timestamp": datetime.utcnow().isoformat(),
                "tags": ["proxy", "degraded"]
            })
        
        # Проверяем отдельные прокси на проблемы
        for proxy in metrics["proxies"]:
            if proxy["circuit_state"] == "open":
                alerts.append({
                    "severity": "warning",
                    "title": f"Прокси '{proxy['name']}' заблокирован",
                    "description": f"Circuit breaker открыт. Последняя ошибка: {proxy['last_error_type']}",
                    "timestamp": proxy["last_error_time"] or datetime.utcnow().isoformat(),
                    "tags": ["proxy", "circuit-breaker", proxy["name"]]
                })
            
            # Низкий success rate
            if proxy["success_rate"] < 80 and proxy["requests_total"] > 10:
                alerts.append({
                    "severity": "warning",
                    "title": f"Низкий success rate прокси '{proxy['name']}'",
                    "description": f"Success rate: {proxy['success_rate']:.1f}%",
                    "timestamp": datetime.utcnow().isoformat(),
                    "tags": ["proxy", "performance", proxy["name"]]
                })
        
        return {
            "alerts": alerts,
            "total_alerts": len(alerts),
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Ошибка получения алертов прокси: {e}")
        raise HTTPException(status_code=500, detail="Ошибка получения алертов")


# Эндпоинт для Prometheus метрик (если используется)
@router.get("/metrics/prometheus")
async def prometheus_metrics():
    """
    Экспорт метрик в формате Prometheus
    """
    try:
        proxy_manager = get_proxy_manager()
        metrics = proxy_manager.get_proxy_metrics()
        
        prometheus_output = []
        
        # Общие метрики
        prometheus_output.append(f"# HELP proxy_total_count Total number of configured proxies")
        prometheus_output.append(f"# TYPE proxy_total_count gauge")
        prometheus_output.append(f'proxy_total_count {metrics["total_proxies"]}')
        
        prometheus_output.append(f"# HELP proxy_available_count Number of available proxies") 
        prometheus_output.append(f"# TYPE proxy_available_count gauge")
        prometheus_output.append(f'proxy_available_count {metrics["available_proxies"]}')
        
        prometheus_output.append(f"# HELP proxy_all_down All proxies down flag")
        prometheus_output.append(f"# TYPE proxy_all_down gauge") 
        prometheus_output.append(f'proxy_all_down {1 if metrics["all_proxies_down"] else 0}')
        
        # Метрики по каждому прокси
        for proxy in metrics["proxies"]:
            labels = f'proxy_name="{proxy["name"]}"'
            
            prometheus_output.append(f"# HELP proxy_requests_total Total requests through proxy")
            prometheus_output.append(f"# TYPE proxy_requests_total counter")
            prometheus_output.append(f'proxy_requests_total{{{labels}}} {proxy["requests_total"]}')
            
            prometheus_output.append(f"# HELP proxy_requests_ok Successful requests through proxy")
            prometheus_output.append(f"# TYPE proxy_requests_ok counter") 
            prometheus_output.append(f'proxy_requests_ok{{{labels}}} {proxy["requests_ok"]}')
            
            prometheus_output.append(f"# HELP proxy_success_rate Success rate percentage")
            prometheus_output.append(f"# TYPE proxy_success_rate gauge")
            prometheus_output.append(f'proxy_success_rate{{{labels}}} {proxy["success_rate"]}')
            
            prometheus_output.append(f"# HELP proxy_response_time_p95 95th percentile response time")
            prometheus_output.append(f"# TYPE proxy_response_time_p95 gauge")
            prometheus_output.append(f'proxy_response_time_p95{{{labels}}} {proxy["p95_response_time"]}')
            
            circuit_state_value = {"closed": 0, "open": 1, "half_open": 0.5}.get(proxy["circuit_state"], 0)
            prometheus_output.append(f"# HELP proxy_circuit_open Circuit breaker open flag")
            prometheus_output.append(f"# TYPE proxy_circuit_open gauge")
            prometheus_output.append(f'proxy_circuit_open{{{labels}}} {circuit_state_value}')
        
        return "\n".join(prometheus_output) + "\n"
        
    except Exception as e:
        logger.error(f"Ошибка генерации Prometheus метрик: {e}")
        return "# Error generating metrics\n"