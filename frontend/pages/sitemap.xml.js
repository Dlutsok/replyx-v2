export default function Sitemap() {
  // This component will never be rendered
  return null;
}

export async function getServerSideProps({ res }) {
  try {
    // Базовые страницы
    const staticPages = [
      {
        url: 'https://replyx.ru/',
        lastmod: new Date().toISOString().split('T')[0],
        changefreq: 'weekly',
        priority: '1.0'
      },
      {
        url: 'https://replyx.ru/blog',
        lastmod: new Date().toISOString().split('T')[0],
        changefreq: 'daily',
        priority: '0.9'
      },
      {
        url: 'https://replyx.ru/legal',
        lastmod: '2025-09-12',
        changefreq: 'monthly',
        priority: '0.8'
      },
      {
        url: 'https://replyx.ru/legal/privacy',
        lastmod: '2025-09-08',
        changefreq: 'monthly',
        priority: '0.6'
      },
      {
        url: 'https://replyx.ru/legal/terms',
        lastmod: '2025-09-08',
        changefreq: 'monthly',
        priority: '0.6'
      },
      {
        url: 'https://replyx.ru/legal/offer',
        lastmod: '2025-09-08',
        changefreq: 'monthly',
        priority: '0.6'
      },
      {
        url: 'https://replyx.ru/legal/cookies',
        lastmod: '2025-09-08',
        changefreq: 'monthly',
        priority: '0.6'
      }
    ];

    // Получаем статьи блога из API
    let blogPosts = [];
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/blog/posts?limit=50`);

      if (response.ok) {
        const posts = await response.json();
        blogPosts = posts.map(post => ({
          url: `https://replyx.ru/blog/${post.slug || post.id}`,
          lastmod: post.updated_at || post.created_at || post.date,
          changefreq: 'weekly',
          priority: post.featured ? '0.8' : '0.7'
        }));
      }
    } catch (error) {
      console.error('Error fetching blog posts for sitemap:', error);
    }

    // Объединяем все страницы
    const allPages = [...staticPages, ...blogPosts];

    // Генерируем XML sitemap
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${allPages.map(page => `  <url>
    <loc>${page.url}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

    res.setHeader('Content-Type', 'text/xml');
    res.write(sitemap);
    res.end();

    return {
      props: {},
    };
  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).end();
    return {
      props: {},
    };
  }
}