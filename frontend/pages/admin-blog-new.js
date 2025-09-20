import { useState, useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { withAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import AdminDashboard from '@/components/layout/AdminDashboard';
import {
  FiEdit3, FiSave, FiArrowLeft, FiImage, FiTag,
  FiUser, FiCalendar, FiEye, FiToggleLeft, FiToggleRight,
  FiStar, FiUpload, FiX, FiPlus, FiZap, FiLoader, FiCheck, FiClock
} from 'react-icons/fi';
import dynamic from 'next/dynamic';

// Функция транслитерации русского текста в латиницу для slug
const transliterate = (text) => {
  const translitMap = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
    'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
  };

  return text.toLowerCase().split('').map(char => translitMap[char] || char).join('');
};

// Функция генерации slug из заголовка
const generateSlugFromTitle = (title) => {
  let slug = transliterate(title)
    .replace(/[^a-z0-9\s-]/g, '') // Только латинские символы, цифры, пробелы и дефисы
    .replace(/\s+/g, '-')         // Пробелы в дефисы
    .replace(/-+/g, '-')          // Множественные дефисы в одинарные
    .replace(/^-+|-+$/g, '');     // Убираем дефисы в начале и конце

  // Ограничиваем длину до 80 символов
  if (slug.length > 80) {
    const words = slug.split('-');
    let truncatedSlug = '';
    for (const word of words) {
      if ((truncatedSlug + '-' + word).length <= 80) {
        truncatedSlug = truncatedSlug ? truncatedSlug + '-' + word : word;
      } else {
        break;
      }
    }
    slug = truncatedSlug;
  }

  return slug;
};

// Динамический импорт ReactQuill для избежания SSR проблем
const ReactQuill = dynamic(
  () => {
    return import('react-quill').then((mod) => {
      // Импортируем стили вместе с компонентом
      import('react-quill/dist/quill.snow.css');
      return mod;
    });
  },
  {
    ssr: false,
    loading: () => (
      <div className="border border-gray-300 rounded-lg bg-white p-4 min-h-[400px] flex items-center justify-center">
        <div className="text-gray-500 flex items-center gap-2">
          <FiLoader className="animate-spin" size={20} />
          Загрузка редактора...
        </div>
      </div>
    )
  }
);

const AdminBlogNewPage = () => {
  const router = useRouter();
  const { showSuccess, showError } = useNotifications();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const [newTag, setNewTag] = useState('');

  // AI Assistant state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [showAiPanel, setShowAiPanel] = useState(false);

  // Full Article Generation state
  const [exampleText, setExampleText] = useState('');
  const [includeProjectMentions, setIncludeProjectMentions] = useState(false);
  const [selectedFeatures, setSelectedFeatures] = useState([]);
  const [mentionFrequency, setMentionFrequency] = useState('low');

  // Article Generation Settings
  const [articleSettings, setArticleSettings] = useState({
    type: 'informational', // informational, tutorial, analysis, news, opinion
    style: 'professional', // professional, casual, technical, conversational
    tone: 'expert', // expert, friendly, authoritative, educational
    audience: 'business', // business, developers, general, professionals
    length: 'medium', // short, medium, long
    focus: 'ai_technologies', // ai_technologies, automation, digital_transformation, chatbots
    language: 'ru', // ru, en
    seo_optimized: true,
    include_examples: true,
    include_statistics: false,
    include_case_studies: false
  });

  // Markdown preview state
  const [showPreview, setShowPreview] = useState(false);

  // React Quill configuration
  const quillModules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      ['link', 'image'],
      [{ 'align': [] }],
      ['blockquote', 'code-block'],
      [{ 'color': [] }, { 'background': [] }],
      ['clean']
    ],
    clipboard: {
      matchVisual: false,
    }
  }), []);

  const quillFormats = [
    'header', 'bold', 'italic', 'underline', 'strike',
    'list', 'bullet', 'indent', 'link', 'image',
    'align', 'blockquote', 'code-block', 'color', 'background'
  ];

  const [formData, setFormData] = useState({
    title: '',
    excerpt: '',
    content: '',
    author: '',
    read_time: '',
    category: '',
    tags: [],
    image: '',
    featured: false,
    is_published: true,
    slug: '',
    meta_title: '',
    meta_description: '',
    keywords: '',

    // Планирование публикации
    scheduled_for: null,
    initial_views: 0,
    initial_likes: 0
  });

  // Состояние для планирования публикации
  const [publishingMode, setPublishingMode] = useState('now'); // 'now', 'scheduled'

  // Инициализируем поля времени текущим локальным временем + 10 минут
  const [scheduledDate, setScheduledDate] = useState(() => {
    const now = new Date();
    const inTenMinutes = new Date(now.getTime() + (10 * 60 * 1000)); // +10 минут
    return inTenMinutes.toISOString().split('T')[0]; // Формат: YYYY-MM-DD
  });

  const [scheduledTime, setScheduledTime] = useState(() => {
    const now = new Date();
    const inTenMinutes = new Date(now.getTime() + (10 * 60 * 1000)); // +10 минут
    return inTenMinutes.toTimeString().slice(0, 5); // Формат: HH:MM
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Auto-generate slug from title
    if (name === 'title' && value) {
      const slug = generateSlugFromTitle(value);
      setFormData(prev => ({ ...prev, slug }));
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Проверяем размер файла (10MB)
    if (file.size > 10 * 1024 * 1024) {
      showError('Размер файла не должен превышать 10MB');
      return;
    }

    // Проверяем тип файла
    if (!file.type.startsWith('image/')) {
      showError('Файл должен быть изображением');
      return;
    }

    setImageUploading(true);

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/admin/blog/upload-image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        setFormData(prev => ({ ...prev, image: result.url }));
        showSuccess('Изображение успешно загружено!');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Ошибка загрузки изображения');
      }
    } catch (error) {
      showError(error.message || 'Ошибка загрузки изображения');
    } finally {
      setImageUploading(false);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Валидация планированного времени
      if (publishingMode === 'scheduled') {
        if (!scheduledDate || !scheduledTime) {
          showError('Необходимо указать дату и время публикации');
          setIsSubmitting(false);
          return;
        }

        // Проверяем, что время в будущем (используем локальное время = MSK)
        const [year, month, day] = scheduledDate.split('-').map(Number);
        const [hours, minutes] = scheduledTime.split(':').map(Number);
        const scheduledTime_obj = new Date(year, month - 1, day, hours, minutes, 0);
        const now = new Date();

        // Допускаем планирование максимум на 30 дней вперед
        const maxFutureTime = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));

        if (scheduledTime_obj > maxFutureTime) {
          showError('Нельзя планировать публикацию более чем на 30 дней вперед');
          setIsSubmitting(false);
          return;
        }

        // Предупреждение для публикации в ближайшие 2 минуты
        const twoMinutesFromNow = new Date(now.getTime() + (2 * 60 * 1000));
        if (scheduledTime_obj <= twoMinutesFromNow && scheduledTime_obj > now) {
          const confirmed = window.confirm(
            `Внимание: статья будет опубликована через ${Math.round((scheduledTime_obj - now) / 60000)} минут(ы). Продолжить?`
          );
          if (!confirmed) {
            setIsSubmitting(false);
            return;
          }
        }
      }
      // Подготавливаем данные для отправки
      let submissionData = { ...formData };

      // Обрабатываем планирование публикации
      if (publishingMode === 'scheduled' && scheduledDate && scheduledTime) {
        // ИСПРАВЛЯЕМ: Создаем MSK время напрямую без автоконверсии браузера
        // Разбираем дату и время на компоненты
        const [year, month, day] = scheduledDate.split('-').map(Number);
        const [hours, minutes] = scheduledTime.split(':').map(Number);

        // Создаем время ЯВНО в MSK (без участия браузера)
        // Пользователь вводит MSK время, мы отправляем MSK время
        const mskYear = year;
        const mskMonth = String(month).padStart(2, '0');
        const mskDay = String(day).padStart(2, '0');
        const mskHours = String(hours).padStart(2, '0');
        const mskMinutes = String(minutes).padStart(2, '0');
        const mskSeconds = '00';

        // Формат: YYYY-MM-DDTHH:MM:SS без Z (без timezone info) - MSK время
        submissionData.scheduled_for = `${mskYear}-${mskMonth}-${mskDay}T${mskHours}:${mskMinutes}:${mskSeconds}`;

        // Создаем Date объект из введенного времени (локальное время = MSK)
        const scheduledTime_obj = new Date(year, month - 1, day, hours, minutes, 0);
        const now = new Date();

        // DEBUG: выводим в консоль для отладки
        console.log('FRONTEND DEBUG (ИСПРАВЛЕНО):', {
          inputDate: scheduledDate,
          inputTime: scheduledTime,
          parsedComponents: { year, month, day, hours, minutes },
          formattedForBackend: submissionData.scheduled_for,
          currentTime: now.toString(),
          scheduledTime: scheduledTime_obj.toString(),
          isInFuture: scheduledTime_obj > now
        });

        // Используем локальное время для сравнения
        if (scheduledTime_obj <= now) {
          // Публикация задним числом - добавляем начальные просмотры/лайки
          submissionData.is_published = true;
        } else {
          // Запланированная публикация в будущем
          submissionData.is_published = false;
        }
      } else {
        // Обычная публикация сейчас
        submissionData.scheduled_for = null;
      }

      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/blog/posts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submissionData)
      });

      if (response.ok) {
        const createdPost = await response.json();

        let message = `Статья успешно создана! URL: /blog/${createdPost.slug || createdPost.id}`;
        if (publishingMode === 'scheduled' && scheduledDate && scheduledTime) {
          // Используем локальное время для проверки
          const [year, month, day] = scheduledDate.split('-').map(Number);
          const [hours, minutes] = scheduledTime.split(':').map(Number);
          const scheduledTime_obj = new Date(year, month - 1, day, hours, minutes, 0);
          const now = new Date();

          if (scheduledTime_obj <= now) {
            message = `Статья опубликована задним числом (${scheduledDate} ${scheduledTime} MSK)! URL: /blog/${createdPost.slug || createdPost.id}`;
          } else {
            message = `Статья запланирована к публикации ${scheduledDate} в ${scheduledTime} MSK`;
          }
        }

        showSuccess(message);
        router.push('/admin-blog');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Ошибка создания статьи');
      }
    } catch (error) {
      showError(error.message || 'Ошибка создания статьи');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (confirm('Вы уверены, что хотите отменить создание статьи? Все данные будут потеряны.')) {
      router.push('/admin-blog');
    }
  };

  // AI Assistant functions
  const callAiAssistant = async (action, options = {}) => {
    setAiLoading(true);
    setAiSuggestions(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/blog/ai-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action,
          context: options.context || formData.title,
          text: options.text,
          topic: options.topic,
          style: options.style || 'professional',
          length: options.length || 'medium'
        })
      });

      const data = await response.json();

      if (data.success) {
        setAiSuggestions(data);
        setShowAiPanel(true);
        showSuccess('ИИ сгенерировал предложения!');
      } else {
        throw new Error(data.error || 'Ошибка ИИ помощника');
      }
    } catch (error) {
      showError(error.message || 'Ошибка при обращении к ИИ');
    } finally {
      setAiLoading(false);
    }
  };

  const generateTitle = () => {
    window.lastAiAction = 'title';
    const topic = formData.content || formData.excerpt || 'AI и технологии';
    callAiAssistant('generate_title', { topic });
  };

  const generateContent = () => {
    window.lastAiAction = 'content';
    const topic = formData.title || 'AI и технологии';
    callAiAssistant('generate_content', { topic, length: 'medium' });
  };

  const improveText = (text, field) => {
    window.lastAiAction = field;
    callAiAssistant('improve_text', { text, context: field });
  };

  const generateExcerpt = () => {
    window.lastAiAction = 'excerpt';
    const context = formData.content || formData.title;
    callAiAssistant('generate_excerpt', { context });
  };

  const generateMeta = () => {
    window.lastAiAction = 'meta';
    const context = formData.title + '\n\n' + formData.content;
    callAiAssistant('generate_meta', { context });
  };

  const generateFullArticle = async () => {
    if (!exampleText.trim()) {
      showError('Пожалуйста, введите примерный текст статьи');
      return;
    }

    setAiLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/blog/ai-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'generate_full_article',
          example_text: exampleText,
          include_project_mentions: includeProjectMentions,
          project_features: selectedFeatures,
          mention_frequency: mentionFrequency,
          article_settings: articleSettings
        })
      });

      const data = await response.json();

      if (data.success) {
        // ИИ возвращает полную статью в свободном формате
        const result = data.result;

        // Логирование для отладки
        console.log('AI Response:', result);

        // Парсим результат для извлечения заголовка и контента
        const lines = result.split('\n').filter(line => line.trim());

        // Ищем первый заголовок (обычно в самом начале или после # )
        let title = '';
        let content = result;
        let excerpt;

        // Пытаемся найти заголовок (приоритет H1 заголовкам)
        for (let i = 0; i < Math.min(lines.length, 10); i++) {
          const line = lines[i];
          // Ищем H1 заголовок (# )
          if (line.startsWith('# ')) {
            title = line.replace(/^#\s*/, '').trim();
            break;
          }
        }

        // Если H1 не найден, ищем другие заголовки или первую содержательную строку
        if (!title) {
          for (let i = 0; i < Math.min(lines.length, 8); i++) {
            const line = lines[i];
            // Ищем H2 заголовки
            if (line.startsWith('## ')) {
              title = line.replace(/^#+\s*/, '').trim();
              break;
            }
            // Ищем первую содержательную строку как потенциальный заголовок
            else if (line.length > 20 && line.length < 120 &&
                     !line.includes('.') &&
                     !line.includes('#') &&
                     !line.includes('*') &&
                     i < 5) {
              title = line.trim();
              break;
            }
          }
        }

        // Найдем второй абзац для описания (чтобы не дублировать заголовок)
        excerpt = '';
        const paragraphs = result.split('\n\n').filter(p => p.trim());

        // Ищем подходящий абзац для описания (не заголовок)
        for (let i = 0; i < paragraphs.length; i++) {
          let paragraph = paragraphs[i]
            .replace(/^#+\s*/, '') // убираем заголовки
            .replace(/\*\*(.*?)\*\*/g, '$1') // убираем жирный текст
            .replace(/\*(.*?)\*/g, '$1') // убираем курсив
            .replace(/###?\s*[^\n]*/g, '') // убираем подзаголовки
            .replace(/^#$/, '') // убираем одиночные #
            .trim();

          // Берем абзац, который не является заголовком и содержит достаточно текста
          if (paragraph.length > 50 &&
              !paragraph.toLowerCase().includes('введение') &&
              paragraph !== title &&
              !paragraph.startsWith('#') &&
              paragraph !== '#') {
            excerpt = paragraph.length > 200
              ? paragraph.substring(0, 200) + '...'
              : paragraph;
            break;
          }
        }

        // Если не нашли подходящий абзац, создаем описание на основе заголовка
        if (!excerpt) {
          excerpt = `Узнайте больше о ${title.toLowerCase()} и современных технологических решениях в нашей экспертной статье.`;
        }

        // Если заголовок не найден, генерируем его из темы
        if (!title) {
          const topics = ['ИИ и автоматизация', 'Технологии будущего', 'Цифровая трансформация', 'Искусственный интеллект'];
          title = topics[Math.floor(Math.random() * topics.length)];
        }

        // Генерируем SEO мета-данные
        const generateMetaTitle = (title) => {
          return title.length > 60 ? title.substring(0, 57) + '...' : title;
        };

        const generateMetaDescription = (excerpt, title) => {
          const baseDescription = excerpt || `Подробное руководство по ${title.toLowerCase()}. Практические советы, актуальные решения и экспертные рекомендации.`;
          return baseDescription.length > 160 ? baseDescription.substring(0, 157) + '...' : baseDescription;
        };

        // Конвертируем Markdown в HTML для React Quill
        const htmlContent = content.includes('#') || content.includes('**') ?
          content
            // Сначала обрабатываем заголовки (с учетом одиночных # и ## и ###)
            .replace(/^### (.*)$/gm, '<h3>$1</h3>')
            .replace(/^## (.*)$/gm, '<h2>$1</h2>')
            .replace(/^# (.*)$/gm, '<h1>$1</h1>')
            // Обрабатываем случаи одиночного # без пробела (как в проблемном примере)
            .replace(/^#$/gm, '<br>')
            // Обрабатываем жирный и курсивный текст
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            // Разбиваем на абзацы, но не трогаем заголовки
            .split('\n\n')
            .map(paragraph => {
              paragraph = paragraph.trim();
              if (!paragraph) return '';
              // Если это заголовок или уже HTML тег, не заворачиваем в <p>
              if (paragraph.startsWith('<h') || paragraph === '<br>') {
                return paragraph;
              }
              // Заворачиваем обычный текст в абзацы
              return `<p>${paragraph}</p>`;
            })
            .filter(p => p) // Убираем пустые элементы
            .join('')
          : content;

        // Генерируем slug из заголовка
        const slug = generateSlugFromTitle(title);

        // Заполняем форму полученными данными
        setFormData(prev => ({
          ...prev,
          title: title,
          excerpt: excerpt,
          content: htmlContent,
          slug: slug, // Добавляем сгенерированный slug
          category: prev.category || 'ИИ и технологии',
          read_time: prev.read_time || '7 мин',
          author: prev.author || 'ReplyX Team',
          // Добавляем SEO поля
          meta_title: generateMetaTitle(title),
          meta_description: generateMetaDescription(excerpt, title),
          // Обеспечиваем заполнение изображения, если его нет
          image: prev.image || 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=400&fit=crop&crop=entropy&auto=format',
          // Добавляем базовые теги если их нет
          tags: prev.tags.length > 0 ? prev.tags : ['ИИ', 'Технологии']
        }));

        showSuccess('Полная статья успешно сгенерирована!');
      } else {
        throw new Error(data.error || 'Ошибка генерации статьи');
      }
    } catch (error) {
      showError(error.message || 'Ошибка при генерации полной статьи');
    } finally {
      setAiLoading(false);
    }
  };

  const replyxFeatures = [
    'Чат с ИИ',
    'Генерация контента',
    'Анализ текста',
    'Автоматизация ответов',
    'Интеграция с Telegram',
    'Управление токенами',
    'Персонализация ответов',
    'Мультиязычная поддержка'
  ];

  const toggleFeature = (feature) => {
    setSelectedFeatures(prev =>
      prev.includes(feature)
        ? prev.filter(f => f !== feature)
        : [...prev, feature]
    );
  };

  const updateArticleSetting = (key, value) => {
    setArticleSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const applySuggestion = (text, field) => {
    if (field === 'meta') {
      // Парсим meta title, description и keywords
      const lines = text.split('\n');
      let metaTitle = '';
      let metaDescription = '';
      let keywords = '';

      lines.forEach(line => {
        if (line.includes('Заголовок:')) {
          metaTitle = line.split(':', 2)[1]?.trim() || '';
        } else if (line.includes('Описание:')) {
          metaDescription = line.split(':', 2)[1]?.trim() || '';
        } else if (line.includes('Ключевые слова:')) {
          keywords = line.split(':', 2)[1]?.trim() || '';
        }
      });

      setFormData(prev => ({
        ...prev,
        meta_title: metaTitle,
        meta_description: metaDescription,
        keywords: keywords
      }));
    } else {
      setFormData(prev => {
        const newData = {
          ...prev,
          [field]: text
        };

        // Обеспечиваем заполнение обязательных полей при применении AI предложений
        if (field === 'title' && !prev.author) {
          newData.author = 'ReplyX Team';
        }
        if (field === 'content' && !prev.category) {
          newData.category = 'ИИ и технологии';
        }
        if (field === 'content' && !prev.read_time) {
          newData.read_time = '7 мин';
        }
        if (field === 'content' && !prev.image) {
          newData.image = 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=400&fit=crop&crop=entropy&auto=format';
        }

        return newData;
      });
    }

    setAiSuggestions(null);
    setShowAiPanel(false);
    showSuccess('Предложение применено!');
  };

  return (
    <>
      <Head>
        <title>Создание статьи - Админ-панель</title>
        <meta name="robots" content="noindex, nofollow" />
        <link href="https://cdn.quilljs.com/2.0.3/quill.snow.css" rel="stylesheet" />
        <link href="https://cdn.quilljs.com/2.0.3/quill.bubble.css" rel="stylesheet" />
      </Head>

      <AdminDashboard activeSection="blog">
        <div className="bg-white px-4 sm:px-6 xl:px-8 pt-4 sm:pt-6 xl:pt-8 pb-4 sm:pb-6 xl:pb-8">
          {/* Header */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleCancel}
                  className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                >
                  <FiArrowLeft size={20} />
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <FiEdit3 className="text-purple-600" size={20} />
                  </div>
                  <div>
                    <h1 className="text-2xl font-semibold text-gray-900">
                      Создание новой статьи
                    </h1>
                    <p className="text-gray-600">
                      Заполните все поля для создания статьи блога
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  form="blog-form"
                  disabled={isSubmitting}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2 disabled:opacity-50"
                >
                  <FiSave size={16} />
                  {isSubmitting ? 'Создание...' : 'Создать статью'}
                </button>
              </div>
            </div>
          </div>

          {/* Article Generation Settings */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 p-6 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <FiEdit3 className="text-green-600" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Настройки генерации статьи</h2>
                <p className="text-gray-600">Настройте параметры для создания качественного контента</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Article Type */}
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Тип статьи
                </label>
                <select
                  value={articleSettings.type}
                  onChange={(e) => updateArticleSetting('type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="informational">Информационная</option>
                  <option value="tutorial">Руководство/Гайд</option>
                  <option value="analysis">Аналитическая</option>
                  <option value="news">Новости</option>
                  <option value="opinion">Мнение/Экспертиза</option>
                  <option value="case_study">Кейс-стади</option>
                </select>
              </div>

              {/* Writing Style */}
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Стиль написания
                </label>
                <select
                  value={articleSettings.style}
                  onChange={(e) => updateArticleSetting('style', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="professional">Профессиональный</option>
                  <option value="casual">Неформальный</option>
                  <option value="technical">Технический</option>
                  <option value="conversational">Разговорный</option>
                  <option value="academic">Академический</option>
                </select>
              </div>

              {/* Tone */}
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Тон статьи
                </label>
                <select
                  value={articleSettings.tone}
                  onChange={(e) => updateArticleSetting('tone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="expert">Экспертный</option>
                  <option value="friendly">Дружелюбный</option>
                  <option value="authoritative">Авторитетный</option>
                  <option value="educational">Образовательный</option>
                  <option value="inspiring">Вдохновляющий</option>
                </select>
              </div>

              {/* Target Audience */}
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Целевая аудитория
                </label>
                <select
                  value={articleSettings.audience}
                  onChange={(e) => updateArticleSetting('audience', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="business">Бизнес-аудитория</option>
                  <option value="developers">Разработчики</option>
                  <option value="general">Широкая аудитория</option>
                  <option value="professionals">Профессионалы</option>
                  <option value="beginners">Новички</option>
                </select>
              </div>

              {/* Article Length */}
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Объем статьи
                </label>
                <select
                  value={articleSettings.length}
                  onChange={(e) => updateArticleSetting('length', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="short">Короткая (3-5 мин)</option>
                  <option value="medium">Средняя (5-10 мин)</option>
                  <option value="long">Длинная (10+ мин)</option>
                </select>
              </div>

              {/* Focus Area */}
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Основная тема
                </label>
                <select
                  value={articleSettings.focus}
                  onChange={(e) => updateArticleSetting('focus', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="ai_technologies">ИИ и технологии</option>
                  <option value="automation">Автоматизация</option>
                  <option value="digital_transformation">Цифровая трансформация</option>
                  <option value="chatbots">Чат-боты</option>
                  <option value="machine_learning">Машинное обучение</option>
                  <option value="business_intelligence">Бизнес-аналитика</option>
                  <option value="productivity">Продуктивность</option>
                  <option value="customer_service">Клиентский сервис</option>
                </select>
              </div>
            </div>

            {/* Additional Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">SEO оптимизация</span>
                  <button
                    type="button"
                    onClick={() => updateArticleSetting('seo_optimized', !articleSettings.seo_optimized)}
                    className="flex items-center"
                  >
                    {articleSettings.seo_optimized ? (
                      <FiToggleRight className="text-green-600" size={20} />
                    ) : (
                      <FiToggleLeft className="text-gray-400" size={20} />
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Включить примеры</span>
                  <button
                    type="button"
                    onClick={() => updateArticleSetting('include_examples', !articleSettings.include_examples)}
                    className="flex items-center"
                  >
                    {articleSettings.include_examples ? (
                      <FiToggleRight className="text-green-600" size={20} />
                    ) : (
                      <FiToggleLeft className="text-gray-400" size={20} />
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Статистика и данные</span>
                  <button
                    type="button"
                    onClick={() => updateArticleSetting('include_statistics', !articleSettings.include_statistics)}
                    className="flex items-center"
                  >
                    {articleSettings.include_statistics ? (
                      <FiToggleRight className="text-green-600" size={20} />
                    ) : (
                      <FiToggleLeft className="text-gray-400" size={20} />
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Реальные кейсы</span>
                  <button
                    type="button"
                    onClick={() => updateArticleSetting('include_case_studies', !articleSettings.include_case_studies)}
                    className="flex items-center"
                  >
                    {articleSettings.include_case_studies ? (
                      <FiToggleRight className="text-green-600" size={20} />
                    ) : (
                      <FiToggleLeft className="text-gray-400" size={20} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Full Article Generation Section */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-200 p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <FiZap className="text-purple-600" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Полная генерация статьи ИИ</h2>
                <p className="text-gray-600">Создайте уникальную статью на основе примерного текста</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Example Text Input */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Примерный текст статьи *
                  </label>
                  <textarea
                    value={exampleText}
                    onChange={(e) => setExampleText(e.target.value)}
                    rows={8}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Вставьте текст статьи, на основе которой будет создана уникальная версия..."
                  />
                </div>

                {/* Mention Settings */}
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-gray-700">
                      Упоминания проекта ReplyX
                    </label>
                    <button
                      type="button"
                      onClick={() => setIncludeProjectMentions(!includeProjectMentions)}
                      className="flex items-center"
                    >
                      {includeProjectMentions ? (
                        <FiToggleRight className="text-purple-600" size={24} />
                      ) : (
                        <FiToggleLeft className="text-gray-400" size={24} />
                      )}
                    </button>
                  </div>

                  {includeProjectMentions && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">
                          Частота упоминаний
                        </label>
                        <select
                          value={mentionFrequency}
                          onChange={(e) => setMentionFrequency(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                          <option value="low">Низкая (1-2 упоминания)</option>
                          <option value="medium">Средняя (3-4 упоминания)</option>
                          <option value="high">Высокая (5+ упоминаний)</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ReplyX Features Selection */}
              <div className="space-y-4">
                {includeProjectMentions && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Функции ReplyX для упоминания
                    </label>
                    <div className="bg-white rounded-lg p-4 border border-gray-200 max-h-64 overflow-y-auto">
                      <div className="grid grid-cols-1 gap-2">
                        {replyxFeatures.map((feature) => (
                          <label key={feature} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedFeatures.includes(feature)}
                              onChange={() => toggleFeature(feature)}
                              className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                            />
                            <span className="text-sm text-gray-700">{feature}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Generate Button */}
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={generateFullArticle}
                    disabled={aiLoading || !exampleText.trim()}
                    className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {aiLoading ? (
                      <FiLoader className="animate-spin" size={20} />
                    ) : (
                      <FiZap size={20} />
                    )}
                    {aiLoading ? 'Генерирую статью...' : 'Сгенерировать полную статью'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <form id="blog-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Basic Info */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Основная информация</h2>

                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Заголовок статьи *
                        </label>
                        <button
                          type="button"
                          onClick={generateTitle}
                          disabled={aiLoading}
                          className="flex items-center gap-2 px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors duration-200 disabled:opacity-50"
                        >
                          {aiLoading ? <FiLoader className="animate-spin" size={14} /> : <FiZap size={14} />}
                          ИИ заголовок
                        </button>
                      </div>
                      <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Введите заголовок статьи"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Краткое описание *
                        </label>
                        <button
                          type="button"
                          onClick={generateExcerpt}
                          disabled={aiLoading}
                          className="flex items-center gap-2 px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors duration-200 disabled:opacity-50"
                        >
                          {aiLoading ? <FiLoader className="animate-spin" size={14} /> : <FiZap size={14} />}
                          ИИ описание
                        </button>
                      </div>
                      <textarea
                        name="excerpt"
                        value={formData.excerpt}
                        onChange={handleInputChange}
                        required
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Краткое описание статьи для карточек и анонсов"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Содержание статьи *
                        </label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={generateContent}
                            disabled={aiLoading}
                            className="flex items-center gap-2 px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors duration-200 disabled:opacity-50"
                          >
                            {aiLoading ? <FiLoader className="animate-spin" size={14} /> : <FiZap size={14} />}
                            ИИ контент
                          </button>
                          {formData.content && (
                            <button
                              type="button"
                              onClick={() => improveText(formData.content, 'content')}
                              disabled={aiLoading}
                              className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors duration-200 disabled:opacity-50"
                            >
                              {aiLoading ? <FiLoader className="animate-spin" size={14} /> : <FiEdit3 size={14} />}
                              Улучшить
                            </button>
                          )}
                        </div>
                      </div>

                      {/* React Quill Editor */}
                      <div className="border border-gray-300 rounded-lg overflow-hidden bg-white quill-wrapper">
                        <ReactQuill
                          theme="snow"
                          value={formData.content}
                          onChange={(content) => setFormData(prev => ({ ...prev, content }))}
                          modules={quillModules}
                          formats={quillFormats}
                          placeholder="Начните писать статью..."
                          style={{
                            height: '400px'
                          }}
                        />
                      </div>

                      <style jsx global>{`
                        .quill-wrapper .ql-editor {
                          min-height: 350px !important;
                          font-size: 16px;
                          line-height: 1.6;
                          padding: 20px;
                          font-family: inherit;
                        }
                        .quill-wrapper .ql-toolbar {
                          border: none !important;
                          border-bottom: 1px solid #e5e7eb !important;
                          background: #f9fafb;
                          padding: 12px;
                        }
                        .quill-wrapper .ql-container {
                          border: none !important;
                          font-family: inherit;
                        }
                        .quill-wrapper .ql-editor h1,
                        .quill-wrapper .ql-editor h2,
                        .quill-wrapper .ql-editor h3,
                        .quill-wrapper .ql-editor h4 {
                          margin-top: 8px !important;
                          margin-bottom: 4px !important;
                          font-weight: 600;
                        }
                        .quill-wrapper .ql-editor h1 {
                          font-size: 28px;
                          line-height: 1.3;
                        }
                        .quill-wrapper .ql-editor h2 {
                          font-size: 24px;
                          line-height: 1.3;
                        }
                        .quill-wrapper .ql-editor h3 {
                          font-size: 20px;
                          line-height: 1.4;
                        }
                        .quill-wrapper .ql-editor h4 {
                          font-size: 18px;
                          line-height: 1.4;
                        }
                        .quill-wrapper .ql-editor p {
                          margin: 0 !important;
                        }
                        .quill-wrapper .ql-editor ul,
                        .quill-wrapper .ql-editor ol {
                          margin-bottom: 16px !important;
                          padding-left: 24px;
                        }
                        .quill-wrapper .ql-editor li {
                          margin-bottom: 6px !important;
                        }
                        .quill-wrapper .ql-toolbar .ql-formats {
                          margin-right: 12px;
                        }
                        .quill-wrapper .ql-snow .ql-tooltip {
                          border: 1px solid #d1d5db;
                          border-radius: 6px;
                          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                        }
                        .quill-wrapper .ql-snow .ql-picker {
                          color: #374151;
                        }
                        .quill-wrapper .ql-snow .ql-stroke {
                          stroke: #6b7280;
                        }
                        .quill-wrapper .ql-snow .ql-fill {
                          fill: #6b7280;
                        }
                      `}</style>
                      <p className="text-sm text-gray-500 mt-1">
                        Используйте панель инструментов для форматирования текста, добавления заголовков, списков и изображений.
                      </p>
                    </div>
                  </div>
                </div>

                {/* SEO Settings */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">SEO настройки</h2>
                    <button
                      type="button"
                      onClick={generateMeta}
                      disabled={aiLoading}
                      className="flex items-center gap-2 px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors duration-200 disabled:opacity-50"
                    >
                      {aiLoading ? <FiLoader className="animate-spin" size={14} /> : <FiZap size={14} />}
                      ИИ SEO
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        URL (slug)
                      </label>
                      <input
                        type="text"
                        name="slug"
                        value={formData.slug}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="url-статьи"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Автоматически генерируется из заголовка
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Meta Title
                      </label>
                      <input
                        type="text"
                        name="meta_title"
                        value={formData.meta_title}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="SEO заголовок для поисковых систем"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Meta Description
                      </label>
                      <textarea
                        name="meta_description"
                        value={formData.meta_description}
                        onChange={handleInputChange}
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Описание статьи для поисковых систем"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        SEO Keywords
                      </label>
                      <input
                        type="text"
                        name="keywords"
                        value={formData.keywords}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="ключевое слово, другое слово, третье слово"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Ключевые слова через запятую для поисковой оптимизации
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Publication Settings */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Публикация</h2>

                  <div className="space-y-4">
                    {/* Publishing Mode Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">Время публикации</label>
                      <div className="space-y-3">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="publishingMode"
                            value="now"
                            checked={publishingMode === 'now'}
                            onChange={(e) => setPublishingMode(e.target.value)}
                            className="text-purple-600 focus:ring-purple-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">Публиковать сейчас</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="publishingMode"
                            value="scheduled"
                            checked={publishingMode === 'scheduled'}
                            onChange={(e) => setPublishingMode(e.target.value)}
                            className="text-purple-600 focus:ring-purple-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">Указать дату и время</span>
                        </label>
                      </div>
                    </div>

                    {/* Scheduled Publishing */}
                    {publishingMode === 'scheduled' && (
                      <div className="space-y-3 pt-2 border-t border-gray-100">
                        <div className="space-y-2">
                          {/* Показываем текущее MSK время */}
                          <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                            <FiClock className="inline mr-1" size={12} />
                            Текущее время MSK: {(() => {
                              // Показываем текущее локальное время (которое и есть MSK в вашем случае)
                              const now = new Date();
                              return now.toLocaleString('ru-RU', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              });
                            })()}
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Дата <span className="text-blue-500">(MSK)</span>
                              </label>
                              <input
                                type="date"
                                value={scheduledDate}
                                onChange={(e) => setScheduledDate(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Время <span className="text-blue-500">(MSK)</span>
                              </label>
                              <input
                                type="time"
                                value={scheduledTime}
                                onChange={(e) => setScheduledTime(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Initial Views and Likes for Backdate */}
                        {scheduledDate && scheduledTime && (() => {
                          // Проверяем, является ли это публикацией в прошлом (используем локальное время)
                          const [year, month, day] = scheduledDate.split('-').map(Number);
                          const [hours, minutes] = scheduledTime.split(':').map(Number);
                          const scheduledTime_obj = new Date(year, month - 1, day, hours, minutes, 0);
                          const now = new Date();
                          return scheduledTime_obj <= now;
                        })() && (
                          <div className="pt-3 border-t border-gray-100">
                            <label className="block text-xs font-medium text-gray-600 mb-2">
                              Публикация задним числом
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Просмотры</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={formData.initial_views}
                                  onChange={(e) => setFormData(prev => ({ ...prev, initial_views: parseInt(e.target.value) || 0 }))}
                                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                  placeholder="0"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Лайки</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={formData.initial_likes}
                                  onChange={(e) => setFormData(prev => ({ ...prev, initial_likes: parseInt(e.target.value) || 0 }))}
                                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                  placeholder="0"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Future Publishing Note */}
                        {scheduledDate && scheduledTime && (() => {
                          // Проверяем, является ли это публикацией в будущем (используем локальное время)
                          const [year, month, day] = scheduledDate.split('-').map(Number);
                          const [hours, minutes] = scheduledTime.split(':').map(Number);
                          const scheduledTime_obj = new Date(year, month - 1, day, hours, minutes, 0);
                          const now = new Date();
                          return scheduledTime_obj > now;
                        })() && (
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-xs text-blue-700">
                              <FiCalendar className="inline mr-1" size={12} />
                              Статья будет опубликована автоматически {scheduledDate} в {scheduledTime} MSK
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Featured Toggle */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <span className="text-sm font-medium text-gray-700">Рекомендуемая статья</span>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, featured: !prev.featured }))}
                        className="flex items-center"
                      >
                        {formData.featured ? (
                          <FiStar className="text-yellow-500" size={20} />
                        ) : (
                          <FiStar className="text-gray-400" size={20} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Author & Category */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Автор и категория</h2>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Автор *
                      </label>
                      <input
                        type="text"
                        name="author"
                        value={formData.author}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Имя автора"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Категория *
                      </label>
                      <input
                        type="text"
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Категория статьи"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Время чтения *
                      </label>
                      <input
                        type="text"
                        name="read_time"
                        value={formData.read_time}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="5 мин"
                      />
                    </div>
                  </div>
                </div>

                {/* Tags */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Теги</h2>

                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Добавить тег"
                      />
                      <button
                        type="button"
                        onClick={addTag}
                        className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                      >
                        <FiPlus size={16} />
                      </button>
                    </div>

                    {formData.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => removeTag(tag)}
                              className="text-purple-600 hover:text-purple-800"
                            >
                              <FiX size={14} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Featured Image */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Изображение</h2>

                  <div className="space-y-4">
                    {/* File Upload */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Загрузить изображение *
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          id="image-upload"
                        />
                        <label
                          htmlFor="image-upload"
                          className="flex items-center gap-2 px-4 py-3 bg-purple-50 text-purple-700 rounded-lg border border-purple-200 hover:bg-purple-100 transition-colors cursor-pointer"
                        >
                          <FiUpload size={16} />
                          Выбрать файл
                        </label>
                        {imageUploading && (
                          <div className="flex items-center gap-2 text-purple-600">
                            <FiLoader className="animate-spin" size={16} />
                            Загрузка...
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Форматы: JPG, PNG, WebP, GIF. Максимум: 10MB
                      </p>
                    </div>

                    {/* URL Input (hidden, but still required for form) */}
                    <input
                      type="hidden"
                      name="image"
                      value={formData.image}
                      required
                    />

                    {/* Image Preview */}
                    {formData.image && (
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Предпросмотр
                        </label>
                        <div className="relative">
                          <img
                            src={formData.image}
                            alt="Предпросмотр"
                            className="w-full h-40 object-cover rounded-lg border border-gray-200"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, image: '' }))}
                            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                          >
                            <FiX size={16} />
                          </button>
                        </div>
                        {formData.image.startsWith('/api/files/') && (
                          <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                            <FiCheck size={14} />
                            Файл загружен на сервер
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </form>

          {/* AI Suggestions Modal */}
          {showAiPanel && aiSuggestions && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <FiZap className="text-purple-600" size={20} />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">Предложения ИИ</h2>
                      <p className="text-sm text-gray-600">Выберите наиболее подходящий вариант</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAiPanel(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <FiX size={20} />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto max-h-[60vh]">
                  <div className="space-y-4">
                    {/* Main Result */}
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium text-purple-900">Основное предложение</h3>
                        <button
                          onClick={() => {
                            const action = aiSuggestions.result?.includes('Заголовок:') ? 'meta' :
                                         window.lastAiAction || 'content';
                            applySuggestion(aiSuggestions.result, action);
                          }}
                          className="flex items-center gap-2 px-3 py-1 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
                        >
                          <FiCheck size={14} />
                          Применить
                        </button>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-purple-200">
                        <pre className="whitespace-pre-wrap text-sm text-gray-900 font-mono">
                          {aiSuggestions.result}
                        </pre>
                      </div>
                    </div>

                    {/* Additional Suggestions */}
                    {aiSuggestions.suggestions && aiSuggestions.suggestions.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="font-medium text-gray-900">Дополнительные варианты</h3>
                        {aiSuggestions.suggestions.map((suggestion, index) => (
                          <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-700">Вариант {index + 1}</span>
                              <button
                                onClick={() => {
                                  const action = window.lastAiAction || 'title';
                                  applySuggestion(suggestion, action);
                                }}
                                className="flex items-center gap-2 px-3 py-1 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
                              >
                                <FiCheck size={14} />
                                Применить
                              </button>
                            </div>
                            <div className="bg-white rounded-lg p-3 border border-gray-200">
                              <p className="text-sm text-gray-900">{suggestion}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
                  <button
                    onClick={() => setShowAiPanel(false)}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Закрыть
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </AdminDashboard>
    </>
  );
};

export default withAuth(AdminBlogNewPage, { adminOnly: true });