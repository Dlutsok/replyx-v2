from fastapi import APIRouter, Query
# Migrated to SSE - debug info now for SSE connections
from services.sse_manager import get_sse_stats

def get_connection_stats():
    """SSE connection stats compatibility"""
    return get_sse_stats()

def get_dialog_sync_info(dialog_id: int):
    """SSE dialog info"""
    stats = get_sse_stats()
    clients_per_dialog = stats.get('clients_per_dialog', {})
    return {
        'dialog_id': dialog_id,
        'sse_connections': clients_per_dialog.get(dialog_id, 0),
        'total_sse_connections': stats.get('active_connections', 0)
    }

router = APIRouter()

@router.get("/debug/sse/sync")
def debug_sse_sync(dialog_id: int = Query(None)):
    """
    Диагностика синхронизации SSE подключений между админкой и виджетом
    Помогает найти причины проблем типа "работает только у одного"
    """
    sync_info = get_dialog_sync_info(dialog_id)
    stats = get_connection_stats()
    
    return {
        "sync_info": sync_info,
        "connection_stats": stats,
        "diagnosis": _diagnose_sync_issues(sync_info, dialog_id)
    }

def _diagnose_sync_issues(sync_info, dialog_id=None):
    """Автоматическая диагностика проблем синхронизации"""
    issues = []
    recommendations = []
    
    # Проверка 1: Orphaned dialogs
    if sync_info.get("admin_only_dialogs"):
        issues.append(f"Админские диалоги без виджета: {sync_info['admin_only_dialogs']}")
        recommendations.append("Проверить, что виджет правильно подключается к тем же dialog_id")
    
    if sync_info.get("site_only_dialogs"):
        issues.append(f"Виджет диалоги без админки: {sync_info['site_only_dialogs']}")
        recommendations.append("Открыть админку и подключиться к этим диалогам")
    
    # Проверка 2: Конкретный dialog_id если указан
    if dialog_id and "specific_dialog" in sync_info:
        dialog = sync_info["specific_dialog"]
        if not dialog["in_admin_pool"] and not dialog["in_site_pool"]:
            issues.append(f"Dialog {dialog_id} не найден ни в одном пуле!")
            recommendations.append("Проверить что dialog_id существует в БД")
        elif not dialog["in_admin_pool"]:
            issues.append(f"Dialog {dialog_id} не подключён в админке")
            recommendations.append("Открыть админку и выбрать этот диалог")
        elif not dialog["in_site_pool"]:
            issues.append(f"Dialog {dialog_id} не подключён в виджете")
            recommendations.append("Проверить WebSocket подключение виджета")
    
    # Проверка 3: Общее состояние
    if sync_info["admin_connections_count"] == 0:
        issues.append("Нет подключений админки")
        recommendations.append("Открыть админку в браузере")
    
    if sync_info["site_connections_count"] == 0:
        issues.append("Нет подключений виджетов")
        recommendations.append("Проверить работу виджетов на сайтах")
    
    return {
        "issues": issues,
        "recommendations": recommendations,
        "status": "healthy" if not issues else "has_issues"
    }