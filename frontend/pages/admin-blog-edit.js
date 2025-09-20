import { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { withAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import AdminDashboard from '@/components/layout/AdminDashboard';
import {
  FiEdit3, FiSave, FiArrowLeft, FiImage, FiTag,
  FiUser, FiCalendar, FiEye, FiToggleLeft, FiToggleRight,
  FiStar, FiUpload, FiX, FiPlus, FiTrash2, FiLoader
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

const AdminBlogEditPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { showSuccess, showError } = useNotifications();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [imagePreview, setImagePreview] = useState('');
  const [newTag, setNewTag] = useState('');

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
    keywords: ''
  });

  // Конфигурация ReactQuill
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

  useEffect(() => {
    if (id) {
      fetchPost();
    }
  }, [id]);

  const fetchPost = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/blog/posts/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const post = await response.json();
        setFormData({
          title: post.title || '',
          excerpt: post.excerpt || '',
          content: post.content || '',
          author: post.author || '',
          read_time: post.read_time || '',
          category: post.category || '',
          tags: post.tags || [],
          image: post.image || '',
          featured: post.featured || false,
          is_published: post.is_published || false,
          slug: post.slug || '',
          meta_title: post.meta_title || '',
          meta_description: post.meta_description || '',
          keywords: post.keywords || ''
        });
        setImagePreview(post.image || '');
      } else {
        throw new Error('Статья не найдена');
      }
    } catch (error) {
      showError(error.message || 'Ошибка загрузки статьи');
      router.push('/admin-blog');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Auto-update slug from title if slug is empty or matches old title pattern
    if (name === 'title' && value) {
      const newSlug = generateSlugFromTitle(value);

      // Only auto-update slug if it's empty or looks auto-generated
      if (!formData.slug || formData.slug.includes('-')) {
        setFormData(prev => ({ ...prev, slug: newSlug }));
      }
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
        setFormData(prev => ({ ...prev, image: reader.result }));
      };
      reader.readAsDataURL(file);
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
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/blog/posts/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        showSuccess('Статья успешно обновлена!');
        router.push('/admin-blog');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Ошибка обновления статьи');
      }
    } catch (error) {
      showError(error.message || 'Ошибка обновления статьи');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Вы уверены, что хотите удалить эту статью? Это действие нельзя отменить.')) {
      return;
    }

    setIsDeleting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/blog/posts/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        showSuccess('Статья успешно удалена');
        router.push('/admin-blog');
      } else {
        throw new Error('Ошибка удаления статьи');
      }
    } catch (error) {
      showError(error.message || 'Ошибка удаления статьи');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancel = () => {
    if (confirm('Вы уверены, что хотите отменить редактирование? Все несохраненные изменения будут потеряны.')) {
      router.push('/admin-blog');
    }
  };

  if (isLoading) {
    return (
      <AdminDashboard activeSection="blog">
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-purple-600 rounded-full animate-spin mr-3"></div>
          <span className="text-gray-600">Загрузка статьи...</span>
        </div>
      </AdminDashboard>
    );
  }

  return (
    <>
      <Head>
        <title>Редактирование статьи - Админ-панель</title>
        <meta name="robots" content="noindex, nofollow" />
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
                      Редактирование статьи
                    </h1>
                    <p className="text-gray-600">
                      {formData.title || 'Загрузка...'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 text-red-700 border border-red-300 rounded-lg hover:bg-red-50 transition-colors duration-200 flex items-center gap-2 disabled:opacity-50"
                >
                  <FiTrash2 size={16} />
                  {isDeleting ? 'Удаление...' : 'Удалить'}
                </button>
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
                  {isSubmitting ? 'Сохранение...' : 'Сохранить'}
                </button>
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Заголовок статьи *
                      </label>
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Краткое описание *
                      </label>
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Содержание статьи *
                      </label>

                      {/* React Quill Editor */}
                      <div className="border border-gray-300 rounded-lg overflow-hidden bg-white quill-wrapper">
                        <ReactQuill
                          theme="snow"
                          value={formData.content}
                          onChange={(content) => setFormData(prev => ({ ...prev, content }))}
                          modules={quillModules}
                          formats={quillFormats}
                          placeholder="Редактируйте содержание статьи..."
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
                        .quill-wrapper .ql-editor strong {
                          font-weight: 600;
                        }
                        .quill-wrapper .ql-editor h1,
                        .quill-wrapper .ql-editor h2,
                        .quill-wrapper .ql-editor h3,
                        .quill-wrapper .ql-editor h4 {
                          font-weight: 600;
                          margin-top: 8px !important;
                          margin-bottom: 4px !important;
                          line-height: 1.3;
                        }
                        .quill-wrapper .ql-editor h1 {
                          font-size: 2em;
                        }
                        .quill-wrapper .ql-editor h2 {
                          font-size: 1.5em;
                        }
                        .quill-wrapper .ql-editor h3 {
                          font-size: 1.17em;
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
                        .quill-wrapper .ql-editor blockquote {
                          border-left: 4px solid #e5e7eb;
                          margin: 1em 0;
                          padding-left: 1em;
                          font-style: italic;
                          color: #6b7280;
                        }
                      `}</style>
                    </div>
                  </div>
                </div>

                {/* SEO Settings */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">SEO настройки</h2>

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
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Опубликована</span>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, is_published: !prev.is_published }))}
                        className="flex items-center"
                      >
                        {formData.is_published ? (
                          <FiToggleRight className="text-purple-600" size={24} />
                        ) : (
                          <FiToggleLeft className="text-gray-400" size={24} />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        URL изображения *
                      </label>
                      <input
                        type="url"
                        name="image"
                        value={formData.image}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="https://example.com/image.jpg"
                      />
                    </div>

                    {formData.image && (
                      <div className="mt-4">
                        <img
                          src={formData.image}
                          alt="Предпросмотр"
                          className="w-full h-40 object-cover rounded-lg border border-gray-200"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </AdminDashboard>
    </>
  );
};

export default withAuth(AdminBlogEditPage, { adminOnly: true });