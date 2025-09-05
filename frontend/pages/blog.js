import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import {
  FiBookOpen, FiSearch, FiUser, FiClock, FiArrowRight,
  FiTag, FiCalendar, FiTrendingUp, FiChevronDown
} from 'react-icons/fi';
import blogStyles from '../styles/pages/Blog.module.css';

// Пример данных для блога (в реальном приложении это будет приходить из API)
const blogPosts = [
  {
    id: 1,
    title: "Как AI меняет будущее бизнеса: реальные кейсы внедрения",
    excerpt: "Узнайте, как компании уже сегодня используют искусственный интеллект для повышения эффективности и оптимизации процессов. Примеры из разных отраслей.",
    content: "Полный текст статьи...",
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
    content: "Полный текст статьи...",
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
    content: "Полный текст статьи...",
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
    content: "Полный текст статьи...",
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
    content: "Полный текст статьи...",
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

const categories = [
  { name: "Все", count: 25 },
  { name: "Кейсы", count: 8 },
  { name: "Руководства", count: 7 },
  { name: "Аналитика", count: 5 },
  { name: "Тренды", count: 3 },
  { name: "Новости", count: 2 }
];

function BlogHeader() {
  const router = useRouter();

  return (
    <header className={blogStyles.header}>
      <div className={blogStyles.headerContainer}>
        <Link href="/" className={blogStyles.logo}>
          <svg className={blogStyles.logoIcon} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 12l2 2 4-4"></path>
            <path d="M21 12c.552 0 1-.448 1-1V8c0-.552-.448-1-1-1h-1V6a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1H3c-.552 0-1 .448-1 1v3c0 .552.448 1 1 1h1v7a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4v-7h1z"></path>
            <circle cx="9" cy="9" r="1"></circle>
            <circle cx="15" cy="9" r="1"></circle>
          </svg>
          <span className={blogStyles.logoText}>ReplyX</span>
        </Link>

        <nav className={blogStyles.nav}>
          <Link href="/" className={blogStyles.navLink}>Главная</Link>
          <Link href="#features" className={blogStyles.navLink}>Возможности</Link>
          <Link href="#pricing" className={blogStyles.navLink}>Тарифы</Link>
          <Link href="/blog" className={`${blogStyles.navLink} ${blogStyles.active}`}>Блог</Link>
        </nav>

        <div className={blogStyles.headerActions}>
          <button
            className={blogStyles.loginButton}
            onClick={() => router.push('/login')}
          >
            Войти
          </button>
          <button
            className={blogStyles.ctaButton}
            onClick={() => router.push('/register')}
          >
            Начать бесплатно
          </button>
        </div>
      </div>
    </header>
  );
}

function BlogHero() {
  return (
    <section className={blogStyles.hero}>
      <div className={blogStyles.heroContainer}>
        <div className={blogStyles.heroContent}>
          <div className={blogStyles.heroBadge}>
            <FiBookOpen size={16} />
            <span>Блог ReplyX</span>
          </div>

          <h1 className={blogStyles.heroTitle}>
            Инсайты и кейсы
            <br />
            <span className={blogStyles.heroHighlight}>мира AI</span>
          </h1>

          <p className={blogStyles.heroSubtitle}>
            Профессиональные статьи о внедрении искусственного интеллекта,
            реальные кейсы и практические руководства для бизнеса.
          </p>

          <div className={blogStyles.heroSearch}>
            <div className={blogStyles.searchBox}>
              <FiSearch className={blogStyles.searchIcon} />
              <input
                type="text"
                placeholder="Поиск статей..."
                className={blogStyles.searchInput}
              />
              <button className={blogStyles.searchButton}>
                Искать
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}


function BlogPostCard({ post }) {
  return (
    <article className={blogStyles.blogPost}>
      <div className={blogStyles.postImage}>
        <img src={post.image} alt={post.title} />
        <div className={blogStyles.postOverlay}>
          <span className={blogStyles.postCategory}>{post.category}</span>
        </div>
      </div>

      <div className={blogStyles.postContent}>
        <div className={blogStyles.postMeta}>
          <span className={blogStyles.postTime}>
            <FiClock size={14} />
            {post.readTime}
          </span>
        </div>

        <h3 className={blogStyles.postTitle}>
          <Link href={`/blog/${post.id}`}>{post.title}</Link>
        </h3>

        <p className={blogStyles.postExcerpt}>{post.excerpt}</p>

        <div className={blogStyles.postFooter}>
          <Link href={`/blog/${post.id}`} className={blogStyles.readMoreLink}>
            Читать статью
            <FiArrowRight size={14} />
          </Link>
        </div>
      </div>
    </article>
  );
}

function BlogSidebar({ selectedCategory, onCategoryChange }) {
  return (
    <aside className={blogStyles.sidebar}>
      <div className={blogStyles.sidebarWidget}>
        <h3 className={blogStyles.widgetTitle}>Категории</h3>
        <div className={blogStyles.categoriesList}>
          {categories.map((category, index) => (
            <button
              key={index}
              className={`${blogStyles.categoryBtn} ${
                selectedCategory === category.name ? blogStyles.active : ''
              }`}
              onClick={() => onCategoryChange(category.name)}
            >
              <span className={blogStyles.categoryName}>{category.name}</span>
              <span className={blogStyles.categoryCount}>{category.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={blogStyles.sidebarWidget}>
        <h3 className={blogStyles.widgetTitle}>Подпишитесь на обновления</h3>
        <div className={blogStyles.newsletter}>
          <p className={blogStyles.newsletterText}>
            Получайте свежие статьи о AI и бизнесе
          </p>
          <div className={blogStyles.newsletterForm}>
            <input
              type="email"
              placeholder="Ваш email"
              className={blogStyles.newsletterInput}
            />
            <button className={blogStyles.newsletterBtn}>
              Подписаться
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default function Blog() {
  const [selectedCategory, setSelectedCategory] = useState('Все');

  const filteredPosts = selectedCategory === 'Все'
    ? blogPosts
    : blogPosts.filter(post => post.category === selectedCategory);

  const regularPosts = filteredPosts;


  return (
    <div className={blogStyles.blogPage}>
      <Head>
        <title>Блог ReplyX | Инсайты и кейсы мира AI</title>
        <meta name="description" content="Профессиональные статьи о внедрении искусственного интеллекта, реальные кейсы и практические руководства для бизнеса." />
        <meta name="keywords" content="AI, искусственный интеллект, бизнес, кейсы, аналитика, руководства" />
        <link rel="canonical" href="https://replyx.ru/blog" />

        <meta property="og:title" content="Блог ReplyX | Инсайты и кейсы мира AI" />
        <meta property="og:description" content="Профессиональные статьи о внедрении искусственного интеллекта, реальные кейсы и практические руководства для бизнеса." />
        <meta property="og:url" content="https://replyx.ru/blog" />
        <meta property="og:type" content="website" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Блог ReplyX | Инсайты и кейсы мира AI" />
        <meta name="twitter:description" content="Профессиональные статьи о внедрении искусственного интеллекта, реальные кейсы и практические руководства для бизнеса." />

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <BlogHeader />
      <BlogHero />

      <main className={blogStyles.main}>
        <div className={blogStyles.container}>
          <div className={blogStyles.content}>
            {/* Regular Posts */}
            <section className={blogStyles.postsSection}>
              <div className={blogStyles.postsHeader}>
                <h2 className={blogStyles.sectionTitle}>
                  {selectedCategory === 'Все' ? 'Все статьи' : selectedCategory}
                </h2>
              </div>

              <div className={blogStyles.postsGrid}>
                {regularPosts.map(post => (
                  <BlogPostCard key={post.id} post={post} />
                ))}
              </div>

              {regularPosts.length === 0 && (
                <div className={blogStyles.noPosts}>
                  <FiBookOpen size={48} />
                  <h3>Статей не найдено</h3>
                  <p>В этой категории пока нет статей.</p>
                </div>
              )}
            </section>
          </div>

          <BlogSidebar
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
          />
        </div>
      </main>

      {/* Footer - можно использовать тот же, что и на главной */}
      <footer className={blogStyles.footer}>
        <div className={blogStyles.footerContent}>
          <div className={blogStyles.footerLeft}>
            <Link href="/" className={blogStyles.footerBrand}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4"></path>
                <path d="M21 12c.552 0 1-.448 1-1V8c0-.552-.448-1-1-1h-1V6a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1H3c-.552 0-1 .448-1 1v3c0 .552.448 1 1 1h1v7a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4v-7h1z"></path>
                <circle cx="9" cy="9" r="1"></circle>
                <circle cx="15" cy="9" r="1"></circle>
              </svg>
              <span>ReplyX</span>
            </Link>
            <p className={blogStyles.footerSlogan}>
              Помогаем человечеству <br />
              шагнуть в будущее.
            </p>
          </div>

          <div className={blogStyles.footerRight}>
            <div className={blogStyles.footerColumn}>
              <div className={blogStyles.footerColumnTitle}>Компания</div>
              <Link href="/blog" className={blogStyles.footerLink}>Блог</Link>
              <a href="mailto:support@replyx.ru" className={blogStyles.footerLink}>Поддержка</a>
            </div>
            <div className={blogStyles.footerCopyright}>
              © 2025 ReplyX
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
