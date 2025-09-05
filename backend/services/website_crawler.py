"""
Сервис краулинга сайтов для загрузки знаний ассистента.

Особенности:
- Уважает robots.txt
- Поддерживает sitemap.xml как источник стартовых URL
- Ограничивает домен и количество страниц
- Извлекает чистый текст из HTML (удаляет меню/скрипты/футеры по эвристикам)
"""

import re
import time
import logging
from dataclasses import dataclass
from typing import List, Set, Dict, Tuple, Optional
from urllib.parse import urlparse, urljoin, urldefrag

import requests
from bs4 import BeautifulSoup, Tag
from urllib import robotparser


logger = logging.getLogger(__name__)


@dataclass
class CrawlOptions:
    max_pages: int = 30
    same_domain_only: bool = True
    include_sitemap: bool = True
    allowed_paths: Optional[List[str]] = None  # префиксы путей, если заданы — фильтруем по ним
    request_timeout_seconds: int = 10
    request_delay_seconds: float = 0.5  # мягкий троттлинг


class WebsiteCrawler:
    """Простой BFS-краулер сайта c очисткой контента."""

    def __init__(self, user_agent: str = "ChatAI-Crawler/1.0"):
        self.user_agent = user_agent

    def _normalize_url(self, base: str, href: str) -> Optional[str]:
        try:
            if not href:
                return None
            url = urljoin(base, href)
            url, _frag = urldefrag(url)
            parsed = urlparse(url)
            if parsed.scheme not in {"http", "https"}:
                return None
            return url
        except Exception:
            return None

    def _allowed_by_paths(self, path: str, allowed_paths: Optional[List[str]]) -> bool:
        if not allowed_paths:
            return True
        return any(path.startswith(prefix) for prefix in allowed_paths)

    def _load_robots(self, base_url: str) -> robotparser.RobotFileParser:
        parsed = urlparse(base_url)
        robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
        rp = robotparser.RobotFileParser()
        try:
            rp.set_url(robots_url)
            rp.read()
        except Exception:
            # Если robots недоступен — считаем, что разрешено
            rp = robotparser.RobotFileParser()
            rp.parse("")
        return rp

    def _discover_sitemap_urls(self, base_url: str) -> List[str]:
        parsed = urlparse(base_url)
        candidates = [
            f"{parsed.scheme}://{parsed.netloc}/sitemap.xml",
            f"{parsed.scheme}://{parsed.netloc}/sitemap_index.xml",
        ]
        urls: List[str] = []
        headers = {"User-Agent": self.user_agent}
        for candidate in candidates:
            try:
                resp = requests.get(candidate, headers=headers, timeout=10)
                if resp.status_code == 200 and "<urlset" in resp.text:
                    soup = BeautifulSoup(resp.text, "xml")
                    for loc in soup.find_all("loc"):
                        if loc and loc.text:
                            urls.append(loc.text.strip())
                    if urls:
                        break
            except Exception:
                continue
        return urls

    def _extract_visible_text(self, html: str) -> str:
        soup = BeautifulSoup(html, "html.parser")
        
        # Удаляем скрипты, стили и скрытые элементы
        for tag in soup(["script", "style", "noscript", "meta", "link"]):
            tag.decompose()
            
        # Расширенный список шумовых элементов
        noise_keywords = [
            "nav", "menu", "footer", "header", "breadcrumb", "crumb", "cookie", "consent",
            "subscribe", "newsletter", "social", "sidebar", "aside", "advert", "promo", 
            "banner", "popup", "modal", "overlay", "share", "follow", "like", "comment",
            "pagination", "pager", "toolbar", "widget", "gadget", "plugin", "embed",
            "tracking", "analytics", "gtm", "fb-", "twitter-", "linkedin-", "instagram-",
            "captcha", "recaptcha", "ads", "advertisement", "sponsored", "affiliate"
        ]
        
        # Удаляем элементы по классам/ID и атрибутам
        for node in soup.find_all(True):
            try:
                if not isinstance(node, Tag):
                    continue
                    
                attrs = getattr(node, 'attrs', {}) or {}
                classes = attrs.get('class', [])
                if not isinstance(classes, list):
                    classes = [str(classes)]
                id_value = attrs.get('id', '')
                role = attrs.get('role', '')
                data_attrs = ' '.join([f"{k}={v}" for k, v in attrs.items() if k.startswith('data-')])
                
                # Объединяем все атрибуты для проверки
                label = f"{' '.join(classes)} {id_value} {role} {data_attrs}".lower()
                
                # Проверяем на шумовые ключевые слова
                should_remove = any(keyword in label for keyword in noise_keywords)
                
                # Дополнительные проверки
                if not should_remove:
                    # Скрытые элементы
                    style = attrs.get('style', '')
                    if 'display:none' in style.replace(' ', '') or 'visibility:hidden' in style.replace(' ', ''):
                        should_remove = True
                    
                    # Элементы с малой высотой (обычно декоративные)
                    if 'height:1px' in style.replace(' ', '') or 'height:0' in style.replace(' ', ''):
                        should_remove = True
                
                if should_remove:
                    # Удаляем только если контент не слишком большой (избегаем удаления основного контента)
                    text_len = len(node.get_text(strip=True)) if hasattr(node, 'get_text') else 0
                    if text_len < 500 and hasattr(node, 'decompose'):
                        node.decompose()
                        
            except Exception:
                continue

        # Извлекаем текст с учетом структуры
        text_parts = []
        for element in soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'div', 'article', 'section', 'main', 'li', 'td', 'th']):
            if element.name in ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']:
                text_parts.append(f"\n## {element.get_text(strip=True)}")
            else:
                element_text = element.get_text(strip=True)
                if element_text and len(element_text) > 10:  # Игнорируем очень короткие фрагменты
                    text_parts.append(element_text)
        
        # Если структурированное извлечение дало мало контента, используем простой метод
        if len(' '.join(text_parts)) < 500:
            text = soup.get_text("\n", strip=True)
        else:
            text = '\n'.join(text_parts)
        
        # Очищаем и нормализуем текст
        text = re.sub(r'\n\s*\n\s*\n+', '\n\n', text)  # Убираем лишние переносы
        text = re.sub(r'[ \t]+', ' ', text)  # Нормализуем пробелы
        text = re.sub(r'^[ \t]+|[ \t]+$', '', text, flags=re.MULTILINE)  # Убираем отступы в строках
        
        return text.strip()

    def crawl(self, base_url: str, options: Optional[CrawlOptions] = None) -> List[Tuple[str, str]]:
        opts = options or CrawlOptions()
        headers = {"User-Agent": self.user_agent}
        parsed_base = urlparse(base_url)
        start_url = f"{parsed_base.scheme}://{parsed_base.netloc}"
        rp = self._load_robots(base_url)

        visited: Set[str] = set()
        queue: List[str] = []
        contents: List[Tuple[str, str]] = []  # (url, text)

        # Стартовые URL: главная + sitemap (если доступен)
        queue.append(base_url)
        if opts.include_sitemap:
            for u in self._discover_sitemap_urls(base_url)[: opts.max_pages // 2]:
                norm = self._normalize_url(start_url, u)
                if norm:
                    queue.append(norm)

        while queue and len(contents) < opts.max_pages:
            url = queue.pop(0)
            if url in visited:
                continue
            visited.add(url)

            pu = urlparse(url)
            if opts.same_domain_only and pu.netloc != parsed_base.netloc:
                continue
            if not self._allowed_by_paths(pu.path or "/", opts.allowed_paths):
                continue
            try:
                if not rp.can_fetch(self.user_agent, url):
                    logger.debug(f"Blocked by robots.txt: {url}")
                    continue
            except Exception:
                pass

            try:
                resp = requests.get(url, headers=headers, timeout=opts.request_timeout_seconds)
                if resp.status_code != 200 or "text/html" not in resp.headers.get("Content-Type", ""):
                    continue
                text = self._extract_visible_text(resp.text)
                if len(text) >= 200:
                    contents.append((url, text))
                # Парсим ссылки и добавляем в очередь
                soup = BeautifulSoup(resp.text, "html.parser")
                for a in soup.find_all("a", href=True):
                    nxt = self._normalize_url(url, a.get("href"))
                    if not nxt or nxt in visited:
                        continue
                    npu = urlparse(nxt)
                    if opts.same_domain_only and npu.netloc != parsed_base.netloc:
                        continue
                    if not self._allowed_by_paths(npu.path or "/", opts.allowed_paths):
                        continue
                    queue.append(nxt)
                time.sleep(opts.request_delay_seconds)
            except Exception as e:
                logger.debug(f"Fetch failed for {url}: {e}")
                continue

        return contents


# Глобальный экземпляр
website_crawler = WebsiteCrawler()


