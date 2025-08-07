from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional
import subprocess

from database import models, schemas, auth
from database import get_db

router = APIRouter()

# Helper functions for bot reloading
def reload_bot(user_id: int):
    """Перезапускает Telegram бота для пользователя"""
    try:
        subprocess.run(["node", "scripts/reload_telegram_bot.js", str(user_id)])
    except Exception as e:
        print(f"Error reloading bot: {e}")

# === LEGACY TOKEN ENDPOINTS ===

@router.get("/telegram-token", response_model=schemas.TelegramTokenRead)
def get_my_telegram_token(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    """Получает Telegram токен пользователя"""
    token = db.query(models.TelegramToken).filter(models.TelegramToken.user_id == current_user.id).first()
    if not token:
        raise HTTPException(status_code=404, detail="Telegram token not found")
    return token

@router.post("/telegram-token", response_model=schemas.TelegramTokenRead)
def set_my_telegram_token(data: schemas.TelegramTokenCreate, background_tasks: BackgroundTasks, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    """Устанавливает Telegram токен пользователя"""
    token = db.query(models.TelegramToken).filter(models.TelegramToken.user_id == current_user.id).first()
    if token:
        token.token = data.token
    else:
        token = models.TelegramToken(user_id=current_user.id, token=data.token)
        db.add(token)
    
    db.commit()
    db.refresh(token)
    
    # Запустить/перезапустить телеграм бота в фоне
    background_tasks.add_task(reload_bot, current_user.id)
    return token