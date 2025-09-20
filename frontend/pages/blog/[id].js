import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import {
  FiArrowLeft, FiClock, FiUser, FiTag, FiCalendar, FiShare2,
  FiEye, FiHeart, FiBookOpen, FiChevronRight, FiMail, FiCopy
} from 'react-icons/fi';
import { FaTelegramPlane, FaWhatsapp } from 'react-icons/fa';
import articleStyles from '../../styles/pages/Article.module.css';
import landingStyles from '../../styles/pages/Landing.module.css';
import { formatNumber } from '../../utils/formatters';

function ArticleHeader({ post }) {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Десктопная версия хедера */}
      <header className={`hidden lg:block ${landingStyles.header}`}>
        <div className={landingStyles.headerContainer}>
          <Link href="/" className={landingStyles.logo}>
            <img src="/logo.svg" alt="Logo" className={landingStyles.logoIcon} style={{width: '130px', height: '60px'}} />
          </Link>

          <nav className={landingStyles.nav}>
            <a href="/#features" className={landingStyles.navLink}>Возможности</a>
            <a href="/#pricing" className={landingStyles.navLink}>Цена</a>
            <a href="/#testimonials" className={landingStyles.navLink}>Отзывы</a>
            <Link href="/blog" className={`${landingStyles.navLink} ${landingStyles.active}`}>Блог</Link>
          </nav>

          <div className={landingStyles.headerActions}>
            <button
              className={landingStyles.loginButton}
              onClick={() => router.push('/login')}
            >
              Войти
            </button>
            <button
              className="px-6 py-2.5 text-white font-semibold rounded-[0.9rem] transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-primary-200 h-11"
              onClick={() => router.push('/register')}
              style={{backgroundColor: '#6334E5'}}
            >
              Зарегистрироваться
            </button>
          </div>
        </div>
      </header>

      {/* Мобильная версия хедера */}
      <header className={`block lg:hidden ${landingStyles.header}`}>
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* Логотип */}
            <Link href="/" className={landingStyles.logo}>
              <img src="/logo.svg" alt="Logo" className={landingStyles.logoIcon} style={{width: '120px', height: '60px'}} />
            </Link>

            {/* Мобильное меню */}
            <div className="flex items-center gap-3">
              {/* Гамбургер меню */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                aria-label="Меню"
              >
                <div className="w-5 h-5 flex flex-col justify-center items-center">
                  <span className={`block w-4 h-0.5 bg-gray-600 transition-all duration-300 ${isMobileMenuOpen ? 'rotate-45 translate-y-1' : '-translate-y-1'}`}></span>
                  <span className={`block w-4 h-0.5 bg-gray-600 transition-all duration-300 ${isMobileMenuOpen ? 'opacity-0' : 'opacity-100'}`}></span>
                  <span className={`block w-4 h-0.5 bg-gray-600 transition-all duration-300 ${isMobileMenuOpen ? '-rotate-45 -translate-y-1' : 'translate-y-1'}`}></span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Мобильное выдвигающееся меню */}
        <div className={`lg:hidden fixed right-0 top-0 z-[200] w-[80vw] h-screen transform transition-all duration-300 ease-out ${isMobileMenuOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}>
          {/* Фон оверлея */}
          <div
            className="absolute inset-0 w-full h-full bg-black/20"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>

          {/* Простое меню */}
          <div className="absolute inset-0 w-full h-full bg-white shadow-xl">
            <div className="p-6 h-full flex flex-col">
              {/* Заголовок меню */}
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold text-[#6334E5]">Меню</h2>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  aria-label="Закрыть меню"
                >
                  <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Навигационные ссылки */}
              <nav className="space-y-3 mb-8 flex-1">
                <a
                  href="/#features"
                  className="flex items-center px-4 py-3 text-gray-700 hover:text-[#6334E5] hover:bg-gray-50 rounded-lg transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className="font-medium text-lg">Возможности</span>
                </a>
                <a
                  href="/#pricing"
                  className="flex items-center px-4 py-3 text-gray-700 hover:text-[#6334E5] hover:bg-gray-50 rounded-lg transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className="font-medium text-lg">Цена</span>
                </a>
                <a
                  href="/#testimonials"
                  className="flex items-center px-4 py-3 text-gray-700 hover:text-[#6334E5] hover:bg-gray-50 rounded-lg transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className="font-medium text-lg">Отзывы</span>
                </a>
                <Link
                  href="/blog"
                  className="flex items-center px-4 py-3 text-[#6334E5] bg-gray-50 rounded-lg transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className="font-medium text-lg">Блог</span>
                </Link>
              </nav>

              {/* Кнопки действий */}
              <div className="space-y-3 mt-auto">
                <button
                  className="w-full px-6 py-3 text-[#6334E5] border border-[#6334E5] font-medium rounded-lg hover:bg-[#6334E5] hover:text-white transition-colors"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    router.push('/login');
                  }}
                >
                  Войти
                </button>
                <button
                  className="w-full px-6 py-3 text-white font-medium rounded-lg bg-[#6334E5] hover:bg-[#5a2fc2] transition-colors"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    router.push('/register');
                  }}
                >
                  Регистрация
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}

function Breadcrumbs({ post }) {
  return (
    <nav className={articleStyles.breadcrumbs}>
      <div className={articleStyles.breadcrumbsContainer}>
        <Link href="/" className={articleStyles.breadcrumbLink}>
          Главная
        </Link>
        <FiChevronRight className={articleStyles.breadcrumbSeparator} />
        <Link href="/blog" className={articleStyles.breadcrumbLink}>
          Блог
        </Link>
        <FiChevronRight className={articleStyles.breadcrumbSeparator} />
        <span className={articleStyles.breadcrumbCurrent}>
          {post.title}
        </span>
      </div>
    </nav>
  );
}

function ArticleHero({ post }) {
  return (
    <section className={articleStyles.hero}>
      <div className={articleStyles.heroContainer}>
        <div className={articleStyles.heroContent}>
          {/* Категория */}
          <div className={articleStyles.categoryBadge}>
            <FiTag size={14} />
            <span>{post.category}</span>
          </div>

          {/* Заголовок */}
          <h1 className={articleStyles.title}>{post.title}</h1>

          {/* Описание */}
          <p className={articleStyles.excerpt}>{post.excerpt}</p>

          {/* Мета информация */}
          <div className={articleStyles.meta}>
            <div className={articleStyles.metaItem}>
              <FiUser size={16} />
              <span>{post.author}</span>
            </div>
            <div className={articleStyles.metaItem}>
              <FiCalendar size={16} />
              <span>{(() => {
                // БД хранит время в UTC, конвертируем в MSK (UTC+3)
                const utcDate = new Date(post.date);
                const mskDate = new Date(utcDate.getTime() + (3 * 60 * 60 * 1000));
                return mskDate.toLocaleDateString('ru-RU', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                });
              })()}</span>
            </div>
            <div className={articleStyles.metaItem}>
              <FiClock size={16} />
              <span>{post.readTime}</span>
            </div>
            <div className={articleStyles.metaItem}>
              <FiEye size={16} />
              <span>{formatNumber(post.views)}</span>
            </div>
          </div>

          {/* Теги */}
          <div className={articleStyles.tags}>
            {post.tags.map((tag, index) => (
              <span key={index} className={articleStyles.tag}>
                #{tag}
              </span>
            ))}
          </div>
        </div>

        {/* Изображение статьи */}
        <div className={articleStyles.heroImage}>
          <img src={post.image} alt={post.title} />
        </div>
      </div>
    </section>
  );
}

function ArticleContent({ post }) {
  const [copied, setCopied] = useState(false);
  const [likes, setLikes] = useState(post.likes || 0);
  const [isLiking, setIsLiking] = useState(false);
  const [hasLiked, setHasLiked] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Не удалось скопировать ссылку: ', err);
    }
  };

  const handleLike = async () => {
    if (isLiking || hasLiked) return;

    setIsLiking(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/blog/posts/${post.id}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setLikes(data.likes);
        setHasLiked(true);

        // Сохраняем в localStorage, что пользователь поставил лайк
        const likedPosts = JSON.parse(localStorage.getItem('likedPosts') || '[]');
        likedPosts.push(post.id);
        localStorage.setItem('likedPosts', JSON.stringify(likedPosts));
      }
    } catch (error) {
      console.error('Ошибка при постановке лайка:', error);
    } finally {
      setIsLiking(false);
    }
  };

  // Проверяем, ставил ли пользователь лайк этой статье
  React.useEffect(() => {
    const likedPosts = JSON.parse(localStorage.getItem('likedPosts') || '[]');
    if (likedPosts.includes(post.id)) {
      setHasLiked(true);
    }
  }, [post.id]);

  // Добавляем кнопки копирования к блокам кода
  React.useEffect(() => {
    const addCopyButtons = () => {
      const articleContent = document.querySelector(`.${articleStyles.articleContent}`);
      if (!articleContent) return;

      const codeBlocks = articleContent.querySelectorAll('pre');

      codeBlocks.forEach((block, index) => {
        // Избегаем дублирования кнопок
        if (block.querySelector('[data-copy-button]')) return;

        const copyButton = document.createElement('button');
        copyButton.className = articleStyles.copyButton;
        copyButton.setAttribute('data-copy-button', 'true');
        copyButton.innerHTML = `
          <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
            <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
            <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
          </svg>
          <span>Копировать</span>
        `;

        copyButton.addEventListener('click', async () => {
          const code = block.querySelector('code');
          const text = code ? code.textContent : block.textContent;

          try {
            await navigator.clipboard.writeText(text);
            copyButton.innerHTML = `
              <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
              </svg>
              <span>Скопировано!</span>
            `;
            copyButton.classList.add('copied');

            setTimeout(() => {
              copyButton.innerHTML = `
                <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
                  <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
                </svg>
                <span>Копировать</span>
              `;
              copyButton.classList.remove('copied');
            }, 2000);
          } catch (err) {
            console.error('Не удалось скопировать код:', err);
          }
        });

        block.style.position = 'relative';
        block.appendChild(copyButton);
      });
    };

    // Запускаем добавление кнопок после рендера контента
    const timer = setTimeout(addCopyButtons, 100);

    return () => clearTimeout(timer);
  }, [post.content]);

  const shareToTelegram = () => {
    const url = window.location.href;

    // Создаем текст для Telegram без ссылки в тексте
    const telegramText = `${post.title}

${post.excerpt}

Ключевые факты:
• Автор: ${post.author}
• Время чтения: ${post.readTime}
• Категория: ${post.category}
• Просмотров: ${formatNumber(post.views)}

Теги: ${post.tags.map(tag => `#${tag}`).join(' ')}`;

    const encodedText = encodeURIComponent(telegramText);

    // Передаем ссылку отдельно через параметр url
    window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodedText}`, '_blank');
  };

  const shareToWhatsApp = () => {
    const url = window.location.href;

    // Создаем текст для WhatsApp без эмодзи
    const whatsappText = `*${post.title}*

${post.excerpt}

*Подробности:*
Автор: ${post.author}
Время чтения: ${post.readTime}
Категория: ${post.category}

Читать статью: ${url}`;

    const encodedText = encodeURIComponent(whatsappText);
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
  };

  const shareToEmail = () => {
    const subject = encodeURIComponent(`Рекомендую статью: ${post.title}`);

    const emailBody = `Привет!

Хочу поделиться интересной статьей из блога ReplyX:

"${post.title}"

${post.excerpt}

О статье:
• Автор: ${post.author}
• Время чтения: ${post.readTime}
• Категория: ${post.category}
• Теги: ${post.tags.join(', ')}

Читать полностью: ${window.location.href}

Думаю, тебе будет интересно!

С уважением!`;

    const encodedBody = encodeURIComponent(emailBody);
    window.location.href = `mailto:?subject=${subject}&body=${encodedBody}`;
  };

  return (
    <main className={articleStyles.main}>
      <div className={articleStyles.container}>
        <div className={articleStyles.content}>
          {/* Основной контент */}
          <article className={articleStyles.article}>
            <div
              className={articleStyles.articleContent}
              dangerouslySetInnerHTML={{
                __html: post.content
              }}
            />

            {/* Кнопки действий */}
            <div className={articleStyles.articleActions}>
              <button
                className={`${articleStyles.likeButton} ${hasLiked ? articleStyles.liked : ''}`}
                onClick={handleLike}
                disabled={isLiking || hasLiked}
                title={hasLiked ? 'Вы уже поставили лайк' : 'Поставить лайк'}
              >
                <FiHeart size={18} />
                <span>{likes}</span>
              </button>
              <button
                className={articleStyles.shareButton}
                onClick={copyToClipboard}
                title="Скопировать ссылку"
              >
                <FiCopy size={18} />
                <span>{copied ? 'Скопировано!' : 'Копировать ссылку'}</span>
              </button>
            </div>

            {/* Информация об авторе */}
            <div className={articleStyles.authorCard}>
              <div className={articleStyles.authorAvatar}>
                <FiUser size={24} />
              </div>
              <div className={articleStyles.authorInfo}>
                <h3 className={articleStyles.authorName}>{post.author}</h3>
                <p className={articleStyles.authorBio}>
                  Эксперт в области искусственного интеллекта и автоматизации бизнес-процессов
                </p>
              </div>
            </div>
          </article>

          {/* Навигация */}
          <div className={articleStyles.navigation}>
            <Link href="/blog" className={articleStyles.backButton}>
              <FiArrowLeft size={16} />
              <span>Назад к статьям</span>
            </Link>
          </div>
        </div>

        {/* Сайдбар */}
        <aside className={articleStyles.sidebar}>
          {/* Поделиться */}
          <div className={articleStyles.sidebarWidget}>
            <h3 className={articleStyles.widgetTitle}>Поделиться</h3>
            <div className={articleStyles.shareButtons}>
              <button
                className={articleStyles.shareBtn}
                onClick={shareToTelegram}
                title="Поделиться в Telegram"
              >
                <FaTelegramPlane size={18} />
                <span>Telegram</span>
              </button>
              <button
                className={articleStyles.shareBtn}
                onClick={shareToWhatsApp}
                title="Поделиться в WhatsApp"
              >
                <FaWhatsapp size={18} />
                <span>WhatsApp</span>
              </button>
              <button
                className={articleStyles.shareBtn}
                onClick={shareToEmail}
                title="Поделиться по Email"
              >
                <FiMail size={18} />
                <span>Email</span>
              </button>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

function RelatedArticles({ currentPostId }) {
  const [relatedPosts, setRelatedPosts] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchRelatedPosts = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const response = await fetch(`${apiUrl}/api/blog/random?limit=3&exclude_id=${currentPostId}`);

        if (response.ok) {
          const posts = await response.json();
          setRelatedPosts(posts);
        } else {
          // Fallback to static data
          const staticRelated = blogPosts
            .filter(post => post.id !== currentPostId)
            .slice(0, 3);
          setRelatedPosts(staticRelated);
        }
      } catch (error) {
        console.error('Error fetching related posts:', error);
        // Fallback to static data
        const staticRelated = blogPosts
          .filter(post => post.id !== currentPostId)
          .slice(0, 3);
        setRelatedPosts(staticRelated);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRelatedPosts();
  }, [currentPostId]);

  if (isLoading) {
    return (
      <section className={articleStyles.relatedSection}>
        <div className={articleStyles.relatedContainer}>
          <h2 className={articleStyles.relatedTitle}>Другие статьи</h2>
          <div className={articleStyles.relatedGrid}>
            {[1, 2, 3].map((i) => (
              <div key={i} className={articleStyles.relatedCard}>
                <div className={articleStyles.skeletonImage}></div>
                <div className={articleStyles.relatedContent}>
                  <div className={articleStyles.skeletonTitle}></div>
                  <div className={articleStyles.skeletonText}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={articleStyles.relatedSection}>
      <div className={articleStyles.relatedContainer}>
        <h2 className={articleStyles.relatedTitle}>Другие статьи</h2>
        <div className={articleStyles.relatedGrid}>
          {relatedPosts.map((post) => (
            <Link key={post.id} href={`/blog/${post.slug || post.id}`} className={articleStyles.relatedCard}>
              <img src={post.image} alt={post.title} />
              <div className={articleStyles.relatedContent}>
                <h3>{post.title}</h3>
                <p>{post.excerpt}</p>
                <span className={articleStyles.relatedMeta}>{post.read_time || post.readTime}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function LandingFooter() {
  const router = useRouter();

  return (
    <footer className={landingStyles.whiteFooter}>
      {/* Десктопная версия */}
      <div className="hidden lg:block">
        <div className={landingStyles.whiteFooterContent}>
          <div className={landingStyles.whiteFooterLeft}>
            <Link href="/" className={landingStyles.whiteFooterBrand}>
              <img src="/logo.svg" alt="Logo" className={landingStyles.logoIcon} style={{width: '130px', height: '60px'}} />
            </Link>
            <p className={landingStyles.whiteFooterSlogan}>
              Помогаем человечеству <br />
              шагнуть в будущее.
            </p>

            {/* Виджеты социальных сетей */}
            <div className={landingStyles.footerWidgets}>
              <a href="https://tenchat.ru/2710161" target="_blank" rel="noopener noreferrer" className={landingStyles.footerWidget} title="TenChat">
                <svg width="24" height="22" viewBox="0 0 53 49" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9.4095 2.25481C20.6737 -0.751604 32.5281 -0.751604 43.7923 2.25481C47.5736 3.2638 50.4615 6.36222 51.2122 10.2152C52.5422 17.0432 52.5422 24.066 51.2122 30.8941C50.4617 34.747 47.5737 37.8454 43.7923 38.8554C43.5067 38.9317 43.2205 39.0061 42.9339 39.0785C42.3669 39.2214 41.9664 39.7372 41.9664 40.3244V48.4863C41.9664 48.686 41.8504 48.868 41.6699 48.9522C41.4895 49.0363 41.2758 49.0079 41.1239 48.8788L32.8282 41.8501C32.129 41.258 31.2296 40.9556 30.316 41.0065C23.2777 41.3999 16.2217 40.6737 9.4095 38.8554C5.62808 37.8454 2.74012 34.747 1.98965 30.8941C0.659699 24.066 0.659699 17.0432 1.98965 10.2152C2.74032 6.36222 5.62827 3.2638 9.4095 2.25481ZM31.2107 30.8324C31.4917 30.8324 31.7229 30.6005 31.7229 30.3186V20.5546H41.4542C41.7352 20.5546 41.9664 20.3227 41.9664 20.0408V10.7906C41.9664 10.5088 41.7352 10.2768 41.4542 10.2768H11.7481C11.4671 10.2768 11.2359 10.5088 11.2359 10.7906V20.0408C11.2359 20.3227 11.4671 20.5546 11.7481 20.5546H21.4795V30.3186C21.4795 30.6005 21.7106 30.8324 21.9915 30.8324H31.2107Z" fill="#FC3234"/>
                  <rect width="31.8985" height="31.8985" transform="translate(10.7031 4.68359)" fill="#FC3234"/>
                  <path fillRule="evenodd" clipRule="evenodd" d="M38.4365 10.2345C38.4365 9.46859 37.8156 8.84766 37.0496 8.84766H16.2463C15.4803 8.84766 14.8594 9.46859 14.8594 10.2345V15.0887C14.8594 15.8546 15.4803 16.4756 16.2463 16.4756H21.1043C21.8702 16.4756 22.4912 17.0965 22.4912 17.8625L22.4912 31.0311C22.4912 31.7971 23.1121 32.418 23.878 32.418H29.4256C30.1916 32.418 30.8125 31.7971 30.8125 31.0311L30.8125 17.8625C30.8125 17.0965 31.4334 16.4756 32.1994 16.4756H37.0496C37.8156 16.4756 38.4365 15.8546 38.4365 15.0887V10.2345Z" fill="white"/>
                </svg>
                <span>TenChat</span>
              </a>
              <a href="https://t.me/replyxai" target="_blank" rel="noopener noreferrer" className={landingStyles.footerWidget} title="Telegram">
                <svg width="24" height="24" viewBox="0 0 256 256" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" preserveAspectRatio="xMidYMid">
                  <g>
                    <path d="M128,0 C57.307,0 0,57.307 0,128 L0,128 C0,198.693 57.307,256 128,256 L128,256 C198.693,256 256,198.693 256,128 L256,128 C256,57.307 198.693,0 128,0 L128,0 Z" fill="#40B3E0"></path>
                    <path d="M190.2826,73.6308 L167.4206,188.8978 C167.4206,188.8978 164.2236,196.8918 155.4306,193.0548 L102.6726,152.6068 L83.4886,143.3348 L51.1946,132.4628 C51.1946,132.4628 46.2386,130.7048 45.7586,126.8678 C45.2796,123.0308 51.3546,120.9528 51.3546,120.9528 L179.7306,70.5928 C179.7306,70.5928 190.2826,65.9568 190.2826,73.6308" fill="#FFFFFF"></path>
                    <path d="M98.6178,187.6035 C98.6178,187.6035 97.0778,187.4595 95.1588,181.3835C93.2408,175.3085 83.4888,143.3345 83.4888,143.3345 L161.0258,94.0945 C161.0258,94.0945 165.5028,91.3765 165.3428,94.0945 C165.3428,94.0945 166.1418,94.5735 163.7438,96.8115C161.3458,99.0505 102.8328,151.6475 102.8328,151.6475" fill="#D2E5F1"></path>
                    <path d="M122.9015,168.1154 L102.0335,187.1414 C102.0335,187.1414 100.4025,188.3794 98.6175,187.6034 L102.6135,152.2624" fill="#B5CFE4"></path>
                  </g>
                </svg>
                <span>Telegram</span>
              </a>
            </div>
          </div>

          <div className={landingStyles.whiteFooterRight}>
            <div className="grid grid-cols-3 gap-8">
              {/* Колонка 1: Продукт */}
              <div className={landingStyles.footerColumn}>
                <button
                  className={landingStyles.footerColumnTitle}
                  style={{
                    cursor: 'pointer',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    fontSize: 'inherit',
                    fontWeight: 'bold',
                    color: '#6334E5',
                    textAlign: 'left',
                    width: '100%'
                  }}
                >
                  Продукт
                </button>
                <a href="/#features" className={landingStyles.whiteFooterLink}>
                  Возможности
                </a>
                <a href="/#pricing" className={landingStyles.whiteFooterLink}>
                  Цена
                </a>
                <a href="/#testimonials" className={landingStyles.whiteFooterLink}>
                  Отзывы
                </a>
              </div>

              {/* Колонка 2: Информация */}
              <div className={landingStyles.footerColumn}>
                <button
                  onClick={() => router.push('/legal')}
                  className={landingStyles.footerColumnTitle}
                  style={{
                    cursor: 'pointer',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    fontSize: 'inherit',
                    fontWeight: 'bold',
                    color: '#6334E5',
                    textAlign: 'left',
                    width: '100%'
                  }}
                >
                  Информация
                </button>
                <div className="flex flex-col gap-2">
                  <span className={landingStyles.whiteFooterLink} style={{cursor: 'default', color: '#6b7280'}}>
                    ИП Луцок Дан
                  </span>
                  <span className={landingStyles.whiteFooterLink} style={{cursor: 'default', color: '#6b7280'}}>
                    ОГРНИП 325508100484721
                  </span>
                  <span className={landingStyles.whiteFooterLink} style={{cursor: 'default', color: '#6b7280'}}>
                    ИНН 330303450398
                  </span>
                </div>
              </div>

              {/* Колонка 3: Связь с нами */}
              <div className={landingStyles.footerColumn}>
                <div
                  className={landingStyles.footerColumnTitle}
                  style={{
                    cursor: 'default',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    fontSize: 'inherit',
                    fontWeight: 'bold',
                    color: '#6334E5',
                    textAlign: 'left',
                    width: '100%'
                  }}
                >
                  Связь с нами
                </div>
                <div className="flex flex-col gap-2">
                  <a href="mailto:info@replyx.ru" className={landingStyles.whiteFooterLink}>
                    Email: info@replyx.ru
                  </a>
                  <a href="tel:+79933349913" className={landingStyles.whiteFooterLink}>
                    Телефон: +7 (993) 334-99-13
                  </a>
                </div>
              </div>
            </div>
            <div className={landingStyles.whiteFooterCopyright} style={{display: 'flex', alignItems: 'center', gap: '20px', marginTop: '32px'}}>
              <button onClick={() => router.push('/legal')} className={landingStyles.whiteFooterLink}>
                Правовая информация
              </button>
              <span>© 2025 ReplyX</span>
            </div>
          </div>
        </div>
      </div>

      {/* Мобильная версия */}
      <div className="block lg:hidden px-4 sm:px-6 lg:px-8">
        <div className={landingStyles.whiteFooterContent}>
          {/* Логотип и слоган */}
          <div className="mb-6">
            <Link href="/" className={landingStyles.whiteFooterBrand}>
              <img src="/logo.svg" alt="Logo" className={landingStyles.logoIcon} style={{width: '130px', height: '60px'}} />
            </Link>
            <p className={landingStyles.whiteFooterSlogan}>
              Помогаем человечеству <br />
              шагнуть в будущее.
            </p>
          </div>

          {/* Контент футера */}
          <div className="grid grid-cols-1 gap-6 mb-6">
            {/* Продукт */}
            <div>
              <h3 className="text-[#6334E5] font-bold mb-3">Продукт</h3>
              <div className="space-y-2">
                <a href="/#features" className={landingStyles.whiteFooterLink}>Возможности</a>
                <a href="/#pricing" className={landingStyles.whiteFooterLink}>Цена</a>
                <a href="/#testimonials" className={landingStyles.whiteFooterLink}>Отзывы</a>
              </div>
            </div>

            {/* Информация */}
            <div>
              <h3 className="text-[#6334E5] font-bold mb-3">Информация</h3>
              <div className="space-y-2">
                <div className="text-gray-600 text-sm">ИП Луцок Дан</div>
                <div className="text-gray-600 text-sm">ОГРНИП 325508100484721</div>
                <div className="text-gray-600 text-sm">ИНН 330303450398</div>
              </div>
            </div>

            {/* Связь с нами */}
            <div>
              <h3 className="text-[#6334E5] font-bold mb-3">Связь с нами</h3>
              <div className="space-y-2">
                <a href="mailto:info@replyx.ru" className={landingStyles.whiteFooterLink}>Email: info@replyx.ru</a>
                <a href="tel:+79933349913" className={landingStyles.whiteFooterLink}>Телефон: +7 (993) 334-99-13</a>
              </div>
            </div>
          </div>

          {/* Правовая информация и копирайт */}
          <div className="border-t pt-6 space-y-4">
            <button onClick={() => router.push('/legal')} className={landingStyles.whiteFooterLink}>
              Правовая информация
            </button>
            <div className="text-gray-400 text-sm">© 2025 ReplyX</div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function Article({ post }) {
  const router = useRouter();

  // Если статья не найдена
  if (!post) {
    return (
      <div className={articleStyles.articlePage}>
        <ArticleHeader />
        <div className={articleStyles.notFound}>
          <h1>Статья не найдена</h1>
          <p>Извините, запрашиваемая статья не существует.</p>
          <Link href="/blog" className={articleStyles.backButton}>
            <FiArrowLeft size={16} />
            <span>Назад к блогу</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={articleStyles.articlePage}>
      <Head>
        <title>{post.meta_title || post.title} | Блог ReplyX</title>
        <meta name="description" content={post.meta_description || post.excerpt} />
        <meta name="keywords" content={post.keywords || post.tags.join(', ')} />
        <meta name="author" content={post.author} />
        <meta name="robots" content="index, follow" />
        <meta name="language" content="ru" />
        <meta name="geo.region" content="RU" />
        <meta name="geo.country" content="Russia" />
        <meta name="article:reading_time" content={post.read_time || post.readTime} />
        <link rel="canonical" href={`https://replyx.ru/blog/${post.slug || post.id}`} />

        {/* Open Graph теги */}
        <meta property="og:title" content={`${post.title} | Блог ReplyX`} />
        <meta property="og:description" content={post.excerpt} />
        <meta property="og:image" content={`https://replyx.ru${post.image}`} />
        <meta property="og:url" content={`https://replyx.ru/blog/${post.slug || post.id}`} />
        <meta property="og:site_name" content="ReplyX" />
        <meta property="og:locale" content="ru_RU" />
        <meta property="og:type" content="article" />
        <meta property="article:author" content={post.author} />
        <meta property="article:published_time" content={post.date} />
        <meta property="article:section" content={post.category} />
        {post.tags.map((tag, index) => (
          <meta key={index} property="article:tag" content={tag} />
        ))}

        {/* Twitter Cards */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@replyx_ai" />
        <meta name="twitter:creator" content="@replyx_ai" />
        <meta name="twitter:title" content={`${post.title} | Блог ReplyX`} />
        <meta name="twitter:description" content={post.excerpt} />
        <meta name="twitter:image" content={`https://replyx.ru${post.image}`} />
        <meta name="twitter:image:alt" content={post.title} />

        {/* JSON-LD для статьи */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Article",
              "headline": post.title,
              "description": post.excerpt,
              "image": {
                "@type": "ImageObject",
                "url": `https://replyx.ru${post.image}`,
                "width": 1200,
                "height": 630
              },
              "author": {
                "@type": "Person",
                "name": post.author,
                "url": "https://replyx.ru"
              },
              "publisher": {
                "@type": "Organization",
                "name": "ReplyX",
                "logo": {
                  "@type": "ImageObject",
                  "url": "https://replyx.ru/logo.svg",
                  "width": 512,
                  "height": 512
                },
                "url": "https://replyx.ru"
              },
              "datePublished": post.date,
              "dateModified": post.updated_at || post.date,
              "wordCount": post.content ? post.content.replace(/<[^>]*>/g, '').split(' ').length : 1000,
              "timeRequired": `PT${(post.read_time || post.readTime || '5 мин').replace(/[^0-9]/g, '')}M`,
              "articleSection": post.category,
              "keywords": post.tags,
              "inLanguage": "ru-RU",
              "mainEntityOfPage": {
                "@type": "WebPage",
                "@id": `https://replyx.ru/blog/${post.slug || post.id}`
              },
              "url": `https://replyx.ru/blog/${post.slug || post.id}`
            })
          }}
        />

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <ArticleHeader post={post} />
      <Breadcrumbs post={post} />
      <ArticleHero post={post} />
      <ArticleContent post={post} />
      <RelatedArticles currentPostId={post.id} />
      <LandingFooter />
    </div>
  );
}

// Импортируем данные напрямую (те же, что в API)
// Статические данные удалены - теперь используем только API
const blogPosts = [
  {
    id: 1,
    title: "Как AI меняет будущее бизнеса: реальные кейсы внедрения",
    excerpt: "Узнайте, как компании уже сегодня используют искусственный интеллект для повышения эффективности и оптимизации процессов. Примеры из разных отраслей.",
    content: `
      <h2>Введение</h2>
      <p>Искусственный интеллект больше не является далекой технологией будущего. Сегодня компании по всему миру активно внедряют AI-решения для автоматизации процессов, улучшения клиентского сервиса и повышения общей эффективности бизнеса.</p>

      <h2>Реальные кейсы внедрения AI</h2>

      <h3>1. Автоматизация клиентской поддержки</h3>
      <p>Компания TechCorp внедрила AI-чат-бота для обработки клиентских запросов. Результаты превзошли ожидания:</p>
      <ul>
        <li>Снижение времени ответа на 75%</li>
        <li>Обработка 80% запросов без участия человека</li>
        <li>Экономия на персонале до 40%</li>
      </ul>

      <h3>2. Оптимизация логистики</h3>
      <p>Логистическая компания LogiSmart использует машинное обучение для:</p>
      <ul>
        <li>Прогнозирования спроса</li>
        <li>Оптимизации маршрутов доставки</li>
        <li>Автоматического планирования складских операций</li>
      </ul>

      <h3>3. Персонализация маркетинга</h3>
      <p>E-commerce платформа ShopAI увеличила конверсию на 35% благодаря:</p>
      <ul>
        <li>Персонализированным рекомендациям товаров</li>
        <li>Динамическому ценообразованию</li>
        <li>Предсказательной аналитике поведения клиентов</li>
      </ul>

      <h2>Ключевые преимущества внедрения AI</h2>
      <p>Анализ успешных кейсов показывает общие преимущества:</p>
      <ul>
        <li><strong>Повышение эффективности:</strong> Автоматизация рутинных задач освобождает время сотрудников для более важной работы</li>
        <li><strong>Снижение затрат:</strong> Уменьшение операционных расходов в среднем на 20-40%</li>
        <li><strong>Улучшение качества сервиса:</strong> Быстрое и точное решение клиентских вопросов</li>
        <li><strong>Масштабируемость:</strong> AI-решения легко адаптируются под рост бизнеса</li>
      </ul>

      <h2>Заключение</h2>
      <p>Внедрение искусственного интеллекта — это не просто технологический тренд, а необходимость для сохранения конкурентоспособности. Компании, которые уже сегодня инвестируют в AI, получают значительные преимущества и готовятся к будущему цифровой экономики.</p>
    `,
    author: "Александр Иванов",
    date: "2025-01-15",
    readTime: "8 мин",
    category: "Кейсы",
    tags: ["AI", "Бизнес", "Автоматизация"],
    image: "/images/blog/blog-default.webp",
    featured: true,
    views: 1250,
    likes: 89
  },
  {
    id: 2,
    title: "Руководство по внедрению чат-ботов в 2025 году",
    excerpt: "Комплексное руководство по выбору, настройке и оптимизации чат-ботов для вашего бизнеса. Лучшие практики и распространенные ошибки.",
    content: `
      <h2>Зачем нужны чат-боты в 2025 году?</h2>
      <p>Современные чат-боты стали неотъемлемой частью цифровой стратегии компаний. Они не только экономят ресурсы, но и значительно улучшают клиентский опыт.</p>

      <h2>Этапы внедрения чат-бота</h2>

      <h3>Этап 1: Анализ потребностей</h3>
      <p>Перед внедрением необходимо четко определить:</p>
      <ul>
        <li>Какие задачи должен решать бот</li>
        <li>Какие каналы связи использовать</li>
        <li>Каковы ожидания от автоматизации</li>
      </ul>

      <h3>Этап 2: Выбор платформы</h3>
      <p>Критерии выбора включают:</p>
      <ul>
        <li>Интеграция с существующими системами</li>
        <li>Возможности настройки и кастомизации</li>
        <li>Масштабируемость решения</li>
        <li>Стоимость владения</li>
      </ul>

      <h3>Этап 3: Настройка и обучение</h3>
      <p>Ключевые моменты:</p>
      <ul>
        <li>Создание базы знаний</li>
        <li>Настройка сценариев диалогов</li>
        <li>Тестирование на реальных данных</li>
        <li>Обучение команды работе с системой</li>
      </ul>

      <h2>Лучшие практики</h2>
      <ul>
        <li><strong>Начинайте с простого:</strong> Реализуйте базовые сценарии, затем усложняйте</li>
        <li><strong>Анализируйте диалоги:</strong> Регулярно изучайте статистику для улучшений</li>
        <li><strong>Обеспечьте переход к человеку:</strong> Всегда должна быть возможность связаться с оператором</li>
        <li><strong>Поддерживайте актуальность:</strong> Регулярно обновляйте базу знаний</li>
      </ul>

      <h2>Распространенные ошибки</h2>
      <ul>
        <li>Слишком сложные сценарии на старте</li>
        <li>Игнорирование обратной связи пользователей</li>
        <li>Недостаточное тестирование перед запуском</li>
        <li>Отсутствие плана развития бота</li>
      </ul>

      <h2>Заключение</h2>
      <p>Правильно внедренный чат-бот становится мощным инструментом для улучшения клиентского сервиса и оптимизации бизнес-процессов. Главное — следовать системному подходу и не спешить с усложнением функционала.</p>
    `,
    author: "Мария Петрова",
    date: "2025-01-12",
    readTime: "12 мин",
    category: "Руководства",
    tags: ["Чат-боты", "Внедрение", "Лучшие практики"],
    image: "/images/blog/blog-default.webp",
    featured: false,
    views: 980,
    likes: 67
  },
  {
    id: 3,
    title: "Будущее работы: как AI влияет на рынок труда",
    excerpt: "Анализ того, как искусственный интеллект меняет требования к навыкам сотрудников и создает новые возможности для карьерного роста.",
    content: `
      <h2>Трансформация рынка труда</h2>
      <p>Искусственный интеллект кардинально меняет ландшафт современной работы. Некоторые профессии исчезают, другие трансформируются, а новые специальности появляются с невиданной скоростью.</p>

      <h2>Профессии под угрозой</h2>
      <p>AI в первую очередь заменяет работы, связанные с:</p>
      <ul>
        <li>Рутинными операциями (бухгалтерский учет, документооборот)</li>
        <li>Простым анализом данных</li>
        <li>Стандартизированным обслуживанием клиентов</li>
        <li>Базовым переводом и транскрипцией</li>
      </ul>

      <h2>Новые возможности</h2>
      <p>Параллельно создаются новые роли:</p>
      <ul>
        <li><strong>AI-тренеры:</strong> Специалисты по обучению нейросетей</li>
        <li><strong>Этики AI:</strong> Эксперты по этическим аспектам ИИ</li>
        <li><strong>Интерпретаторы AI:</strong> Переводчики между AI и людьми</li>
        <li><strong>AI-аудиторы:</strong> Специалисты по проверке качества AI-решений</li>
      </ul>

      <h2>Навыки будущего</h2>
      <p>Востребованными станут:</p>
      <ul>
        <li><strong>Креативность:</strong> То, что пока недоступно машинам</li>
        <li><strong>Эмоциональный интеллект:</strong> Понимание и работа с людьми</li>
        <li><strong>Критическое мышление:</strong> Анализ и оценка информации</li>
        <li><strong>Адаптивность:</strong> Способность быстро изучать новое</li>
        <li><strong>Междисциплинарность:</strong> Знания на стыке областей</li>
      </ul>

      <h2>Как подготовиться к изменениям</h2>

      <h3>Для сотрудников:</h3>
      <ul>
        <li>Изучайте основы работы с AI-инструментами</li>
        <li>Развивайте уникальные человеческие навыки</li>
        <li>Ищите возможности для переквалификации</li>
        <li>Следите за трендами в вашей отрасли</li>
      </ul>

      <h3>Для работодателей:</h3>
      <ul>
        <li>Инвестируйте в обучение команды</li>
        <li>Создавайте гибкие рабочие места</li>
        <li>Поощряйте экспериментирование с AI</li>
        <li>Планируйте трансформацию заранее</li>
      </ul>

      <h2>Заключение</h2>
      <p>AI не обязательно заменит людей — скорее, изменит характер работы. Успешными будут те, кто научится эффективно сотрудничать с искусственным интеллектом, используя его как мощный инструмент для решения сложных задач.</p>
    `,
    author: "Дмитрий Соколов",
    date: "2025-01-10",
    readTime: "6 мин",
    category: "Аналитика",
    tags: ["Карьера", "Будущее", "Образование"],
    image: "/images/blog/blog-default.webp",
    featured: true,
    views: 1540,
    likes: 123
  },
  {
    id: 4,
    title: "Топ-10 трендов AI в 2025 году",
    excerpt: "Обзор самых важных тенденций развития искусственного интеллекта, которые определят будущее технологий в ближайшие годы.",
    content: `
      <h2>Главные тренды AI в 2025 году</h2>
      <p>Искусственный интеллект продолжает стремительно развиваться. Рассмотрим ключевые тренды, которые будут определять направление развития AI в 2025 году.</p>

      <h2>1. Мультимодальные AI-модели</h2>
      <p>Системы, способные одновременно обрабатывать текст, изображения, аудио и видео. Это открывает новые возможности для создания более естественных интерфейсов.</p>

      <h2>2. Edge AI</h2>
      <p>Перенос вычислений AI ближе к источникам данных. Преимущества:</p>
      <ul>
        <li>Снижение задержек</li>
        <li>Повышение приватности данных</li>
        <li>Уменьшение зависимости от интернета</li>
      </ul>

      <h2>3. Explainable AI (XAI)</h2>
      <p>Развитие "объяснимого" искусственного интеллекта, который может объяснить свои решения. Критично для медицины, финансов и юриспруденции.</p>

      <h2>4. AI for Code</h2>
      <p>Продвинутые инструменты для:</p>
      <ul>
        <li>Автоматического написания кода</li>
        <li>Поиска и исправления ошибок</li>
        <li>Оптимизации производительности</li>
        <li>Генерации документации</li>
      </ul>

      <h2>5. Quantum-Enhanced AI</h2>
      <p>Интеграция квантовых вычислений с машинным обучением для решения особо сложных задач оптимизации и моделирования.</p>

      <h2>6. Sustainable AI</h2>
      <p>Фокус на энергоэффективности и экологичности AI-решений:</p>
      <ul>
        <li>Зеленые алгоритмы</li>
        <li>Оптимизация энергопотребления</li>
        <li>Переработка данных</li>
      </ul>

      <h2>7. AI-powered Cybersecurity</h2>
      <p>Использование AI для:</p>
      <ul>
        <li>Обнаружения угроз в реальном времени</li>
        <li>Предиктивной защиты</li>
        <li>Автоматического реагирования на инциденты</li>
      </ul>

      <h2>8. Conversational AI 2.0</h2>
      <p>Новое поколение диалоговых систем с:</p>
      <ul>
        <li>Эмоциональным интеллектом</li>
        <li>Долговременной памятью</li>
        <li>Персонализацией на основе контекста</li>
      </ul>

      <h2>9. AI-as-a-Service (AIaaS)</h2>
      <p>Демократизация AI через облачные платформы, делающие передовые технологии доступными для малого и среднего бизнеса.</p>

      <h2>10. Regulatory AI</h2>
      <p>Развитие AI для регулирования и соответствия требованиям:</p>
      <ul>
        <li>Автоматическая проверка соблюдения законов</li>
        <li>Мониторинг этических стандартов</li>
        <li>Управление рисками</li>
      </ul>

      <h2>Заключение</h2>
      <p>2025 год станет переломным для искусственного интеллекта. Эти тренды формируют будущее, в котором AI станет еще более интегрированным в нашу повседневную жизнь и бизнес-процессы.</p>
    `,
    author: "Елена Козлова",
    date: "2025-01-08",
    readTime: "10 мин",
    category: "Тренды",
    tags: ["Тренды", "ИИ", "Технологии"],
    image: "/images/blog/blog-default.webp",
    featured: false,
    views: 2100,
    likes: 156
  },
  {
    id: 5,
    title: "Как выбрать правильного AI-провайдера для вашего бизнеса",
    excerpt: "Пошаговое руководство по оценке и выбору поставщика AI-решений. Критерии выбора, вопросы для проверки и красные флаги.",
    content: `
      <h2>Важность правильного выбора AI-провайдера</h2>
      <p>Выбор поставщика AI-решений — это стратегическое решение, которое влияет на успех всего проекта. Неправильный выбор может привести к потере времени, денег и доверия клиентов.</p>

      <h2>Ключевые критерии оценки</h2>

      <h3>1. Техническая экспертиза</h3>
      <ul>
        <li>Опыт работы с вашей отраслью</li>
        <li>Портфолио успешных проектов</li>
        <li>Квалификация команды</li>
        <li>Владение современными технологиями</li>
      </ul>

      <h3>2. Масштабируемость решений</h3>
      <ul>
        <li>Способность обрабатывать растущие объемы данных</li>
        <li>Гибкость архитектуры</li>
        <li>Возможность интеграции с существующими системами</li>
      </ul>

      <h3>3. Безопасность и соответствие</h3>
      <ul>
        <li>Сертификации безопасности</li>
        <li>Соблюдение GDPR и других регуляций</li>
        <li>Прозрачность в обработке данных</li>
        <li>Политики резервного копирования</li>
      </ul>

      <h2>Вопросы для провайдера</h2>

      <h3>О технологии:</h3>
      <ul>
        <li>Какие алгоритмы и модели используются?</li>
        <li>Как обеспечивается точность результатов?</li>
        <li>Какова архитектура системы?</li>
        <li>Как происходит обновление моделей?</li>
      </ul>

      <h3>О поддержке:</h3>
      <ul>
        <li>Какой уровень технической поддержки предоставляется?</li>
        <li>Есть ли возможность кастомизации?</li>
        <li>Как осуществляется обучение пользователей?</li>
        <li>Какие SLA гарантируются?</li>
      </ul>

      <h3>О стоимости:</h3>
      <ul>
        <li>Прозрачная модель ценообразования</li>
        <li>Скрытые расходы и дополнительные платежи</li>
        <li>Стоимость масштабирования</li>
        <li>ROI и окупаемость</li>
      </ul>

      <h2>Красные флаги</h2>
      <p>Избегайте провайдеров, которые:</p>
      <ul>
        <li><strong>Обещают нереальные результаты:</strong> 100% точность или мгновенное внедрение</li>
        <li><strong>Скрывают детали:</strong> Не объясняют, как работает их технология</li>
        <li><strong>Игнорируют ваши потребности:</strong> Предлагают только стандартные решения</li>
        <li><strong>Не предоставляют референсы:</strong> Отказываются показать успешные кейсы</li>
        <li><strong>Требуют предоплату:</strong> Настаивают на полной оплате до начала работ</li>
      </ul>

      <h2>Процесс выбора</h2>

      <h3>Этап 1: Анализ потребностей</h3>
      <p>Четко определите, что именно вы хотите получить от AI-решения.</p>

      <h3>Этап 2: Исследование рынка</h3>
      <p>Изучите доступных провайдеров и их предложения.</p>

      <h3>Этап 3: Техническая оценка</h3>
      <p>Проведите пилотный проект или POC с несколькими кандидатами.</p>

      <h3>Этап 4: Коммерческие переговоры</h3>
      <p>Обсудите условия сотрудничества и заключите договор.</p>

      <h2>Заключение</h2>
      <p>Правильный выбор AI-провайдера — это инвестиция в будущее вашего бизнеса. Не спешите с решением, тщательно оценивайте все факторы и всегда требуйте доказательств заявленных возможностей.</p>
    `,
    author: "Андрей Волков",
    date: "2025-01-05",
    readTime: "15 мин",
    category: "Руководства",
    tags: ["Выбор", "Провайдеры", "Консультации"],
    image: "/images/blog/blog-default.webp",
    featured: false,
    views: 875,
    likes: 45
  }
];

// Получение данных статьи на сервере
export async function getServerSideProps(context) {
  const { id } = context.params;

  try {
    // Получаем статью через API
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    let response;
    // Сначала пытаемся найти по slug, затем по ID
    if (isNaN(parseInt(id))) {
      // Это slug
      response = await fetch(`${apiUrl}/api/blog/posts/slug/${encodeURIComponent(id)}`);
    } else {
      // Это ID
      response = await fetch(`${apiUrl}/api/blog/posts/${parseInt(id)}`);
    }

    if (!response.ok) {
      if (response.status === 404) {
        return {
          notFound: true,
        };
      }
      throw new Error('Failed to fetch post');
    }

    const post = await response.json();

    // Форматируем дату для совместимости с текущим компонентом
    const formattedPost = {
      ...post,
      date: post.date || post.created_at,
      readTime: post.read_time || post.read_time,
      // Обеспечиваем, что изображение корректно отображается
      image: post.image || '/images/blog/blog-default.webp'
    };

    return {
      props: {
        post: formattedPost,
      },
    };
  } catch (error) {
    console.error('Error fetching post:', error);

    return {
      notFound: true,
    };
  }
}