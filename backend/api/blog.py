from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
import logging
import asyncio

from database.connection import get_db
from database import models, schemas, crud
from core import auth
from ai.ai_token_manager import ai_token_manager
from services.s3_storage_service import get_s3_service

logger = logging.getLogger(__name__)

router = APIRouter()

# ==========================================
# PUBLIC BLOG ENDPOINTS (for frontend)
# ==========================================

@router.get("/blog/posts", response_model=List[schemas.BlogPostList])
def get_blog_posts(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=50),
    category: Optional[str] = None,
    featured: bool = False,
    db: Session = Depends(get_db)
):
    """Получить список опубликованных статей блога"""
    try:
        posts = crud.get_blog_posts(
            db=db,
            skip=skip,
            limit=limit,
            published_only=True,
            category=category,
            featured_only=featured
        )
        return posts
    except Exception as e:
        logger.error(f"Error getting blog posts: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/blog/posts/{post_id}", response_model=schemas.BlogPostRead)
def get_blog_post(
    post_id: int,
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = None
):
    """Получить статью блога по ID"""
    try:
        post = crud.get_blog_post(db=db, post_id=post_id)
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")

        if not post.is_published:
            raise HTTPException(status_code=404, detail="Post not found")

        # Увеличиваем счетчик просмотров в фоне
        if background_tasks:
            background_tasks.add_task(crud.increment_blog_post_views, db, post_id)

        return post
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting blog post {post_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/blog/posts/slug/{slug}", response_model=schemas.BlogPostRead)
def get_blog_post_by_slug(
    slug: str,
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = None
):
    """Получить статью блога по slug"""
    try:
        post = crud.get_blog_post_by_slug(db=db, slug=slug)
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")

        if not post.is_published:
            raise HTTPException(status_code=404, detail="Post not found")

        # Увеличиваем счетчик просмотров в фоне
        if background_tasks:
            background_tasks.add_task(crud.increment_blog_post_views, db, post.id)

        return post
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting blog post by slug {slug}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/admin/blog/publish-scheduled")
def publish_scheduled_blog_posts(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_admin)
):
    """Опубликовать запланированные статьи (ручной триггер для админа)"""
    try:
        published_count = crud.publish_scheduled_posts(db)
        return {
            "success": True,
            "published_count": published_count,
            "message": f"Опубликовано статей: {published_count}"
        }
    except Exception as e:
        logger.error(f"Error publishing scheduled posts: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/admin/blog/scheduled")
def get_scheduled_blog_posts(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_admin)
):
    """Получить список запланированных к публикации статей"""
    try:
        scheduled_posts = crud.get_scheduled_posts(db)
        return scheduled_posts
    except Exception as e:
        logger.error(f"Error getting scheduled posts: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/blog/posts/{post_id}/like")
def like_blog_post(
    post_id: int,
    db: Session = Depends(get_db)
):
    """Поставить лайк статье"""
    try:
        post = crud.get_blog_post(db=db, post_id=post_id)
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")

        if not post.is_published:
            raise HTTPException(status_code=404, detail="Post not found")

        updated_post = crud.increment_blog_post_likes(db=db, post_id=post_id)
        return {"message": "Post liked successfully", "likes": updated_post.likes}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error liking blog post {post_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/blog/categories")
def get_blog_categories(db: Session = Depends(get_db)):
    """Получить список категорий блога с количеством постов"""
    try:
        categories = crud.get_blog_categories(db=db)
        return [{"category": cat[0], "count": cat[1]} for cat in categories]
    except Exception as e:
        logger.error(f"Error getting blog categories: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/blog/featured", response_model=List[schemas.BlogPostList])
def get_featured_blog_posts(
    limit: int = Query(3, ge=1, le=10),
    db: Session = Depends(get_db)
):
    """Получить рекомендуемые статьи"""
    try:
        posts = crud.get_featured_blog_posts(db=db, limit=limit)
        return posts
    except Exception as e:
        logger.error(f"Error getting featured blog posts: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/blog/random", response_model=List[schemas.BlogPostList])
def get_random_blog_posts(
    limit: int = Query(3, ge=1, le=10),
    exclude_id: Optional[int] = Query(None, description="ID статьи для исключения"),
    db: Session = Depends(get_db)
):
    """Получить случайные статьи"""
    try:
        posts = crud.get_random_blog_posts(db=db, limit=limit, exclude_id=exclude_id)
        return posts
    except Exception as e:
        logger.error(f"Error getting random blog posts: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# ==========================================
# ADMIN BLOG ENDPOINTS (for admin panel)
# ==========================================

@router.get("/admin/blog/posts", response_model=List[schemas.BlogPostList])
def admin_get_blog_posts(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=50),
    category: Optional[str] = None,
    published: Optional[bool] = None,
    featured: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_admin)
):
    """Получить список всех статей для админа"""
    try:
        # Админ может видеть все статьи
        posts = crud.get_blog_posts(
            db=db,
            skip=skip,
            limit=limit,
            published_only=False if published is None else published,
            category=category,
            featured_only=featured or False
        )
        return posts
    except Exception as e:
        logger.error(f"Error getting admin blog posts: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/admin/blog/posts/{post_id}", response_model=schemas.BlogPostRead)
def admin_get_blog_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_admin)
):
    """Получить статью для админа"""
    try:
        post = crud.get_blog_post(db=db, post_id=post_id)
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")
        return post
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting admin blog post {post_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/admin/blog/posts", response_model=schemas.BlogPostRead)
def admin_create_blog_post(
    blog_post: schemas.BlogPostCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_admin)
):
    """Создать новую статью"""
    try:
        created_post = crud.create_blog_post(db=db, blog_post=blog_post)
        logger.info(f"Admin {current_user.email} created blog post: {created_post.title}")
        return created_post
    except Exception as e:
        logger.error(f"Error creating blog post: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.put("/admin/blog/posts/{post_id}", response_model=schemas.BlogPostRead)
def admin_update_blog_post(
    post_id: int,
    blog_post: schemas.BlogPostUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_admin)
):
    """Обновить статью"""
    try:
        updated_post = crud.update_blog_post(db=db, post_id=post_id, blog_post=blog_post)
        if not updated_post:
            raise HTTPException(status_code=404, detail="Post not found")

        logger.info(f"Admin {current_user.email} updated blog post: {updated_post.title}")
        return updated_post
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating blog post {post_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.delete("/admin/blog/posts/{post_id}")
def admin_delete_blog_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_admin)
):
    """Удалить статью"""
    try:
        # Получаем информацию о статье для логирования
        post = crud.get_blog_post(db=db, post_id=post_id)
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")

        success = crud.delete_blog_post(db=db, post_id=post_id)
        if not success:
            raise HTTPException(status_code=404, detail="Post not found")

        logger.info(f"Admin {current_user.email} deleted blog post: {post.title}")
        return {"message": "Post deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting blog post {post_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/admin/blog/stats")
def admin_get_blog_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_admin)
):
    """Получить статистику блога для админа"""
    try:
        total_posts = crud.get_blog_posts_count(db=db, published_only=False)
        published_posts = crud.get_blog_posts_count(db=db, published_only=True)
        draft_posts = total_posts - published_posts
        featured_posts = crud.get_blog_posts_count(db=db, featured_only=True)

        return {
            "total_posts": total_posts,
            "published_posts": published_posts,
            "draft_posts": draft_posts,
            "featured_posts": featured_posts
        }
    except Exception as e:
        logger.error(f"Error getting blog stats: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# ==========================================
# AI ASSISTANT ENDPOINTS
# ==========================================

@router.post("/admin/blog/ai-assistant", response_model=schemas.AIAssistantResponse)
async def blog_ai_assistant(
    request: schemas.AIAssistantRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_admin)
):
    """ИИ помощник для создания статей блога"""
    try:
        # Создаем промпты в зависимости от действия
        prompts = {
            "generate_title": _create_title_prompt,
            "generate_content": _create_content_prompt,
            "improve_text": _create_improve_prompt,
            "generate_excerpt": _create_excerpt_prompt,
            "generate_meta": _create_meta_prompt,
            "generate_full_article": _create_full_article_prompt
        }

        if request.action not in prompts:
            raise HTTPException(status_code=400, detail="Invalid action")

        # Создаем промпт
        prompt_function = prompts[request.action]
        messages = prompt_function(request)

        # Используем GPT-4o как запросил пользователь
        completion = await asyncio.to_thread(
            ai_token_manager.make_openai_request,
            messages=messages,
            model="gpt-4o",
            user_id=current_user.id,
            assistant_id=None,
            temperature=0.7,
            max_tokens=2000
        )

        # Извлекаем результат
        result = completion.choices[0].message.content.strip()

        # Обрабатываем результат в зависимости от действия
        if request.action == "generate_title":
            # Парсим несколько вариантов заголовков
            suggestions = [title.strip() for title in result.split('\n') if title.strip() and not title.startswith('#')][:5]
            result = suggestions[0] if suggestions else result

            return schemas.AIAssistantResponse(
                success=True,
                result=result,
                suggestions=suggestions[1:] if len(suggestions) > 1 else None
            )

        elif request.action == "generate_meta":
            # Парсим заголовок, описание и ключевые слова
            lines = [line.strip() for line in result.split('\n') if line.strip()]
            meta_title = ""
            meta_description = ""
            keywords = ""

            for line in lines:
                if line.startswith("Заголовок:") or line.startswith("Title:"):
                    meta_title = line.split(":", 1)[1].strip()
                elif line.startswith("Описание:") or line.startswith("Description:"):
                    meta_description = line.split(":", 1)[1].strip()
                elif line.startswith("Ключевые слова:") or line.startswith("Keywords:"):
                    keywords = line.split(":", 1)[1].strip()

            result = f"Заголовок: {meta_title}\nОписание: {meta_description}\nКлючевые слова: {keywords}"

        elif request.action == "generate_full_article":
            # Для полной статьи просто возвращаем результат как есть
            # Дополнительная обработка не требуется
            pass

        return schemas.AIAssistantResponse(
            success=True,
            result=result
        )

    except Exception as e:
        logger.error(f"Error in AI assistant: {e}")
        return schemas.AIAssistantResponse(
            success=False,
            result="",
            error=f"Ошибка ИИ помощника: {str(e)}"
        )

def _create_title_prompt(request: schemas.AIAssistantRequest) -> List[dict]:
    """Создает промпт для генерации заголовков"""
    context = request.context or request.topic or "AI и технологии"

    return [
        {
            "role": "system",
            "content": "Ты профессиональный копирайтер и контент-маркетолог. Создаешь привлекательные заголовки для статей блога о технологиях, AI и бизнесе. Заголовки должны быть цепляющими, информативными и SEO-оптимизированными. ВАЖНО: Пиши заголовки как обычные предложения, только первое слово с заглавной буквы."
        },
        {
            "role": "user",
            "content": f"Создай 5 привлекательных заголовков для статьи на тему: {context}\n\nТребования:\n- Заголовки должны быть цепляющими и информативными\n- Длина 50-60 символов для SEO\n- Использовать эмоциональные триггеры\n- Каждый заголовок с новой строки\n- Без нумерации"
        }
    ]

def _create_content_prompt(request: schemas.AIAssistantRequest) -> List[dict]:
    """Создает промпт для генерации контента"""
    topic = request.topic or request.context or "AI и технологии"
    length_map = {
        "short": "800-1200 слов",
        "medium": "1500-2000 слов",
        "long": "2500-3000 слов"
    }
    length = length_map.get(request.length, "1500-2000 слов")

    return [
        {
            "role": "system",
            "content": "Ты опытный технический писатель и эксперт по AI. Создаешь качественные, информативные статьи для блога о технологиях. Стиль: профессиональный, но доступный. Структура: введение, основная часть с подзаголовками, заключение. ВАЖНО: Заголовки пиши как обычные предложения, только первое слово с заглавной буквы."
        },
        {
            "role": "user",
            "content": f"Напиши статью на тему: {topic}\n\nТребования:\n- Объем: {length}\n- Структура: введение, 3-4 раздела с подзаголовками, заключение\n- Используй Markdown для форматирования\n- Включи практические примеры\n- Добавь полезные советы\n- Пиши простым и понятным языком"
        }
    ]

def _create_improve_prompt(request: schemas.AIAssistantRequest) -> List[dict]:
    """Создает промпт для улучшения текста"""
    text = request.text or ""
    style = request.style or "professional"

    style_map = {
        "professional": "профессиональный и экспертный",
        "casual": "непринужденный и дружелюбный",
        "technical": "технический и детальный",
        "marketing": "продающий и убедительный"
    }
    style_desc = style_map.get(style, "профессиональный")

    return [
        {
            "role": "system",
            "content": f"Ты редактор контента. Улучшаешь тексты, делая их более читабельными, структурированными и привлекательными. Стиль: {style_desc}."
        },
        {
            "role": "user",
            "content": f"Улучши этот текст:\n\n{text}\n\nТребования:\n- Сохрани основную идею\n- Улучши читабельность и структуру\n- Исправь грамматические ошибки\n- Добавь подзаголовки если нужно\n- Используй Markdown для форматирования\n- Сделай текст более привлекательным"
        }
    ]

def _create_excerpt_prompt(request: schemas.AIAssistantRequest) -> List[dict]:
    """Создает промпт для генерации описания статьи"""
    context = request.context or request.topic or ""
    content = request.text or ""

    source_text = content if content else context

    return [
        {
            "role": "system",
            "content": "Ты профессиональный копирайтер. Создаешь краткие, но полные и законченные описания статей для превью. Описание должно заинтересовать читателя и передать суть статьи. ВАЖНО: Всегда завершай мысль полностью, не обрывай предложения."
        },
        {
            "role": "user",
            "content": f"Создай краткое описание для статьи на основе этого текста:\n\n{source_text}\n\nТребования:\n- Длина: 200-300 символов\n- Обязательно завершай все предложения полностью\n- Заинтересовать читателя\n- Передать суть статьи\n- Писать простым и понятным языком\n- Избегать обрывов в середине предложения\n- Описание должно читаться как законченный текст"
        }
    ]

def _create_meta_prompt(request: schemas.AIAssistantRequest) -> List[dict]:
    """Создает промпт для генерации meta title и description"""
    context = request.context or request.topic or ""
    content = request.text or ""

    source_text = content if content else context

    return [
        {
            "role": "system",
            "content": "Ты SEO-специалист. Создаешь meta title и meta description для статей блога, оптимизированные для поисковых систем."
        },
        {
            "role": "user",
            "content": f"Создай meta title, meta description и ключевые слова для статьи:\n\n{source_text}\n\nТребования:\nЗаголовок: 50-60 символов, включи ключевые слова\nОписание: 150-160 символов, привлекательное и информативное\nКлючевые слова: 5-8 слов через запятую, релевантные теме\n\nФормат ответа:\nЗаголовок: [текст]\nОписание: [текст]\nКлючевые слова: [слово1, слово2, слово3]"
        }
    ]

def _create_full_article_prompt(request: schemas.AIAssistantRequest) -> List[dict]:
    """Создает промпт для генерации полной статьи на основе примера"""
    example_text = request.example_text or ""

    # Используем настройки статьи, если они переданы
    settings = request.article_settings
    if settings:
        article_type = settings.type
        style = settings.style
        tone = settings.tone
        audience = settings.audience
        length = settings.length
        focus = settings.focus
        language = settings.language
        seo_optimized = settings.seo_optimized
        include_examples = settings.include_examples
        include_statistics = settings.include_statistics
        include_case_studies = settings.include_case_studies
    else:
        # Fallback к старым параметрам
        article_type = "informational"
        style = request.style or "professional"
        tone = "expert"
        audience = "business"
        length = request.length or "medium"
        focus = "ai_technologies"
        language = "ru"
        seo_optimized = True
        include_examples = True
        include_statistics = False
        include_case_studies = False

    # Настройки проекта
    include_mentions = request.include_project_mentions or False
    features = request.project_features or []
    mention_freq = request.mention_frequency or "low"

    # Информация о проекте ReplyX для контекстных упоминаний
    project_info = """
ReplyX - это платформа для создания AI-ассистентов и чат-ботов с функциями:
- Создание умных чат-ботов для Telegram и веб-сайтов
- Интеграция с различными AI-моделями (GPT-4o, Claude, YandexGPT)
- Векторный поиск по документам и базам знаний
- Система аналитики диалогов и метрик
- Многопользовательская работа с командами
- API для интеграции в существующие системы
- Автоматизация процессов и handoff оператору
- Поддержка различных форматов контента
"""

    length_map = {
        "short": "1000-1500 слов",
        "medium": "2000-2500 слов",
        "long": "3000-4000 слов"
    }
    target_length = length_map.get(length, "2000-2500 слов")

    mention_instructions = ""
    if include_mentions and features:
        frequency_map = {
            "low": "1-2 упоминания в подходящем контексте",
            "medium": "3-4 естественных упоминания",
            "high": "5-6 упоминаний в разных разделах"
        }
        mention_count = frequency_map.get(mention_freq, "1-2 упоминания в подходящем контексте")

        selected_features = ", ".join(features[:3])  # Максимум 3 функции
        mention_instructions = f"""

ВАЖНО: Интегрируй упоминания ReplyX естественным образом в контекст статьи:
- Количество упоминаний: {mention_count}
- Фокус на функциях: {selected_features}
- Упоминания должны быть органичными и полезными для читателя
- Не делай статью рекламной, сохраняй экспертный тон
- Используй фразы типа "например, в платформах вроде ReplyX" или "решения такого типа, как ReplyX, позволяют"
"""

    # Маппинг значений для человекочитаемого вида
    type_map = {
        "informational": "информационную",
        "tutorial": "практическое руководство",
        "analysis": "аналитическую",
        "news": "новостную",
        "opinion": "экспертную статью-мнение",
        "case_study": "кейс-стади"
    }

    style_map = {
        "professional": "профессиональном",
        "casual": "неформальном",
        "technical": "техническом",
        "conversational": "разговорном",
        "academic": "академическом"
    }

    tone_map = {
        "expert": "экспертным",
        "friendly": "дружелюбным",
        "authoritative": "авторитетным",
        "educational": "образовательным",
        "inspiring": "вдохновляющим"
    }

    audience_map = {
        "business": "бизнес-аудитории",
        "developers": "разработчиков",
        "general": "широкой аудитории",
        "professionals": "профессионалов",
        "beginners": "новичков"
    }

    focus_map = {
        "ai_technologies": "искусственного интеллекта и технологий",
        "automation": "автоматизации бизнес-процессов",
        "digital_transformation": "цифровой трансформации",
        "chatbots": "чат-ботов и разговорного ИИ",
        "machine_learning": "машинного обучения",
        "business_intelligence": "бизнес-аналитики",
        "productivity": "повышения продуктивности",
        "customer_service": "клиентского сервиса"
    }

    # Дополнительные инструкции на основе настроек
    additional_requirements = []

    if include_examples:
        additional_requirements.append("- Включи практические примеры и реальные ситуации")

    if include_statistics:
        additional_requirements.append("- Добавь актуальную статистику и данные (можешь использовать реалистичные примеры)")

    if include_case_studies:
        additional_requirements.append("- Включи краткие кейсы успешного внедрения решений")

    if seo_optimized:
        additional_requirements.append("- Оптимизируй для SEO: используй ключевые слова, структурированные заголовки")

    system_prompt = f"""Ты опытный копирайтер и контент-стратег со специализацией на технологическом контенте.

ТВОЙ ПРОФИЛЬ:
- Экспертиза: {focus_map.get(focus, focus)}
- Стиль письма: {style_map.get(style, style)}
- Целевая аудитория: {audience_map.get(audience, audience)}
- Тон: {tone_map.get(tone, tone)}

ВАЖНО ПО СТИЛЮ ЗАГОЛОВКОВ:
- Заголовки пиши как обычные предложения, только первое слово с заглавной буквы
- НЕ используй "Title Case" (каждое слово с большой буквы)
- Правильно: "## Как внедрить искусственный интеллект в бизнес"
- Неправильно: "## Как Внедрить Искусственный Интеллект В Бизнес"

Твоя задача - создать уникальную, качественную статью на основе анализа примера, избегая прямого копирования.{mention_instructions}"""

    user_prompt = f"""Создай {type_map.get(article_type, article_type)} статью на основе анализа следующего примера:

ПРИМЕР СТАТЬИ:
{example_text}

НАСТРОЙКИ СТАТЬИ:
- Тип статьи: {type_map.get(article_type, article_type)}
- Стиль: {style_map.get(style, style)}
- Тон: {tone_map.get(tone, tone)}
- Аудитория: {audience_map.get(audience, audience)}
- Объем: {target_length}
- Основная тема: {focus_map.get(focus, focus)}
- Язык: {"Русский" if language == "ru" else "English"}

ОСНОВНЫЕ ТРЕБОВАНИЯ:
- Создай НОВУЮ структуру и содержание, не копируй пример
- Используй идеи и подходы из примера, но с новым углом зрения
- Добавь свежие инсайты и практические советы
- Используй Markdown для форматирования заголовков
- Включи 3-5 основных разделов с подзаголовками
- Напиши привлекательное введение и заключение с выводами
- Начни статью с H1 заголовка (# Заголовок статьи)
- Обязательно используй подзаголовки ## для основных разделов
- Добавь списки, выделения жирным текстом для лучшей читабельности

ВАЖНО ПО ФОРМАТИРОВАНИЮ:
- НЕ используй одиночные символы # как разделители
- Каждый заголовок должен быть в формате "# Текст заголовка" или "## Текст заголовка"
- Заголовки пиши обычным образом, только первое слово с заглавной буквы (например: "## Как использовать искусственный интеллект")
- НЕ пиши каждое слово в заголовке с большой буквы
- Разделяй разделы пустыми строками, а НЕ символами #
- Используй **жирный текст** для выделения ключевых понятий

ДОПОЛНИТЕЛЬНЫЕ ТРЕБОВАНИЯ:
{chr(10).join(additional_requirements) if additional_requirements else "- Стандартный подход к написанию"}

АЛГОРИТМ РАБОТЫ:
1. Проанализируй структуру и ключевые идеи примера
2. Определи основную тему и ценность для {audience_map.get(audience, audience)}
3. Создай новую структуру с уникальными разделами
4. Напиши статью в {style_map.get(style, style)} стиле с {tone_map.get(tone, tone)} тоном
5. Сделай контент практичным и ценным для читателя

ВАЖНО: Статья должна быть полностью уникальной, но вдохновленной подходом и тематикой примера. Учитывай все указанные настройки для создания целевого контента."""

    if include_mentions:
        user_prompt += f"\n\nИНФОРМАЦИЯ О ПРОЕКТЕ ДЛЯ КОНТЕКСТНЫХ УПОМИНАНИЙ:\n{project_info}"

    return [
        {
            "role": "system",
            "content": system_prompt
        },
        {
            "role": "user",
            "content": user_prompt
        }
    ]

# ==========================================
# BLOG IMAGE UPLOAD ENDPOINTS
# ==========================================

@router.post("/admin/blog/upload-image")
async def upload_blog_image(
    file: UploadFile = File(...),
    current_user: models.User = Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    """Загружает изображение для блога в S3"""

    # Получаем S3 сервис и проверяем, что он доступен
    s3_service = get_s3_service()
    if not s3_service:
        raise HTTPException(
            status_code=503,
            detail="Файловое хранилище временно недоступно"
        )

    # Читаем содержимое файла
    content = await file.read()
    await file.seek(0)

    # Валидация размера (максимум 10MB)
    if len(content) > 10 * 1024 * 1024:  # 10MB
        raise HTTPException(
            status_code=413,
            detail="Файл слишком большой. Максимальный размер: 10MB"
        )

    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Пустой файл")

    # Валидация типа файла
    import magic
    try:
        mime_type = magic.from_buffer(content, mime=True)
    except Exception:
        mime_type = file.content_type

    # Проверяем расширение
    import os
    _, ext = os.path.splitext(file.filename.lower())

    allowed_extensions = {'.jpg', '.jpeg', '.png', '.webp', '.gif'}
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Неподдерживаемый тип файла. Разрешены: {', '.join(allowed_extensions)}"
        )

    try:
        # Генерируем безопасное имя файла для блога (используем user_id как основу)
        secure_filename = s3_service.generate_widget_icon_filename(
            user_id=current_user.id,
            original_filename=file.filename,
            content=content
        )

        # Заменяем widget_icon на blog_image в имени файла
        secure_filename = secure_filename.replace('widget_icon', 'blog_image')

        # Загружаем в S3 в папку blog-images (аналогично widget-icons)
        object_key = s3_service.get_user_object_key(
            current_user.id,
            secure_filename,
            "blog-images"
        )

        # Добавляем метаданные (используем дефисы вместо подчеркиваний для Timeweb Cloud)
        metadata = {
            'user-id': str(current_user.id),
            'original-filename': file.filename,
            'file-type': 'blog-image'
        }

        upload_result = s3_service.upload_file(
            file_content=content,
            object_key=object_key,
            content_type=mime_type,
            metadata=metadata
        )

        if not upload_result.get('success'):
            raise Exception(f"S3 upload failed: {upload_result.get('error')}")

        logger.info(f"Blog image uploaded: {object_key} by user {current_user.id}")

        # Возвращаем URL через наш proxy endpoint вместо прямой ссылки на S3
        proxy_url = f"/api/files/blog-images/{current_user.id}/{secure_filename}"

        # Возвращаем информацию о загруженном изображении
        return {
            "success": True,
            "filename": secure_filename,
            "url": proxy_url,
            "size": len(content),
            "content_type": mime_type,
            "object_key": object_key
        }

    except Exception as e:
        logger.error(f"Blog image upload failed for user {current_user.id}: {e}")
        raise HTTPException(status_code=500, detail="Ошибка загрузки изображения")

@router.get("/posts/by-slug/{slug}")
async def get_blog_post_by_slug(slug: str, db: Session = Depends(get_db)):
    """Получить статью блога по slug"""
    try:
        post = crud.get_blog_post_by_slug(db, slug=slug)
        if not post:
            raise HTTPException(status_code=404, detail="Статья не найдена")

        logger.info(f"Retrieved blog post by slug: {slug}")
        return post
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving blog post by slug {slug}: {e}")
        raise HTTPException(status_code=500, detail="Ошибка получения статьи")

@router.get("/debug/scheduler")
async def debug_scheduler_info(db: Session = Depends(get_db)):
    """Debug endpoint для проверки планировщика блога"""
    try:
        from datetime import datetime, timezone, timedelta

        # Получаем все запланированные статьи
        scheduled_posts = db.query(models.BlogPost).filter(
            models.BlogPost.scheduled_for.isnot(None),
            models.BlogPost.is_published == False
        ).all()

        # Текущее время
        now_utc = datetime.utcnow()
        moscow_tz = timezone(timedelta(hours=3))
        now_msk = now_utc.replace(tzinfo=timezone.utc).astimezone(moscow_tz).replace(tzinfo=None)

        debug_info = {
            "current_time": {
                "utc": now_utc.isoformat(),
                "msk": now_msk.isoformat(),
                "timezone_offset": "+03:00"
            },
            "scheduled_posts_count": len(scheduled_posts),
            "scheduled_posts": []
        }

        for post in scheduled_posts:
            scheduled_for_utc = post.scheduled_for.replace(tzinfo=None) if post.scheduled_for.tzinfo else post.scheduled_for
            scheduled_for_msk = scheduled_for_utc.replace(tzinfo=timezone.utc).astimezone(moscow_tz).replace(tzinfo=None)

            time_diff = scheduled_for_utc - now_utc
            ready_to_publish = scheduled_for_utc <= now_utc

            debug_info["scheduled_posts"].append({
                "id": post.id,
                "title": post.title[:50] + "..." if len(post.title) > 50 else post.title,
                "scheduled_for_utc": scheduled_for_utc.isoformat(),
                "scheduled_for_msk": scheduled_for_msk.isoformat(),
                "time_until_publish_seconds": time_diff.total_seconds(),
                "ready_to_publish": ready_to_publish,
                "is_published": post.is_published
            })

        return debug_info

    except Exception as e:
        logger.error(f"Debug scheduler error: {e}")
        raise HTTPException(status_code=500, detail="Ошибка debug scheduler")

@router.post("/debug/run-scheduler")
async def debug_run_scheduler(current_user: models.User = Depends(auth.get_current_admin),
                             db: Session = Depends(get_db)):
    """Ручной запуск планировщика для тестирования"""
    try:
        published_count = crud.publish_scheduled_posts(db)
        return {
            "success": True,
            "published_posts": published_count,
            "message": f"Планировщик выполнен, опубликовано статей: {published_count}"
        }
    except Exception as e:
        logger.error(f"Manual scheduler run error: {e}")
        raise HTTPException(status_code=500, detail="Ошибка запуска планировщика")