import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { withAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import AdminDashboard from '@/components/layout/AdminDashboard';
import { formatNumber } from '../utils/formatters';
import {
  FiEdit3, FiSearch, FiFilter, FiCalendar, FiEye,
  FiEdit, FiTrash2, FiPlus, FiUser, FiTag, FiImage,
  FiCheckCircle, FiXCircle, FiStar
} from 'react-icons/fi';
import styles from '../styles/pages/AdminBlog.module.css';

const AdminBlogPage = () => {
  const { showSuccess, showError, showWarning } = useNotifications();
  const [posts, setPosts] = useState([]);
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [featuredFilter, setFeaturedFilter] = useState('all');
  const [stats, setStats] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchPosts();
    fetchStats();
  }, []);

  useEffect(() => {
    filterPosts();
  }, [posts, searchTerm, statusFilter, categoryFilter, featuredFilter]);

  const fetchPosts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/blog/posts', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPosts(data);
      } else {
        throw new Error('Ошибка загрузки статей');
      }
    } catch (error) {
      showError(error.message || 'Ошибка загрузки статей');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/blog/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Ошибка загрузки статистики блога:', error);
    }
  };

  const filterPosts = () => {
    let filtered = posts;

    if (searchTerm) {
      filtered = filtered.filter(post =>
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(post => {
        if (statusFilter === 'published') return post.is_published;
        if (statusFilter === 'draft') return !post.is_published;
        return true;
      });
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(post => post.category === categoryFilter);
    }

    if (featuredFilter !== 'all') {
      filtered = filtered.filter(post => {
        if (featuredFilter === 'featured') return post.featured;
        if (featuredFilter === 'regular') return !post.featured;
        return true;
      });
    }

    setFilteredPosts(filtered);
  };

  const deletePost = async (postId) => {
    if (!confirm('Вы уверены, что хотите удалить эту статью?')) {
      return;
    }

    setIsDeleting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/blog/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        showSuccess('Статья успешно удалена');
        fetchPosts();
        fetchStats();
      } else {
        throw new Error('Ошибка удаления статьи');
      }
    } catch (error) {
      showError(error.message || 'Ошибка удаления статьи');
    } finally {
      setIsDeleting(false);
    }
  };

  const getUniqueCategories = () => {
    const categories = posts.map(post => post.category);
    return [...new Set(categories)];
  };

  const formatDate = (dateString) => {
    // БД хранит время в UTC, конвертируем в MSK (UTC+3)
    const utcDate = new Date(dateString);
    const mskDate = new Date(utcDate.getTime() + (3 * 60 * 60 * 1000));
    return mskDate.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) + ' MSK';
  };

  const formatScheduledDate = (dateString) => {
    // Запланированное время тоже хранится в UTC, конвертируем в MSK
    const utcDate = new Date(dateString);
    const mskDate = new Date(utcDate.getTime() + (3 * 60 * 60 * 1000));
    return mskDate.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) + ' MSK';
  };

  const formatNumber = (num) => {
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num?.toString() || '0';
  };

  return (
    <>
      <Head>
        <title>Управление блогом - Админ-панель</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <AdminDashboard activeSection="blog">
        <div className="bg-white px-4 sm:px-6 xl:px-8 pt-4 sm:pt-6 xl:pt-8 pb-4 sm:pb-6 xl:pb-8">
          {/* Header */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <div className="flex flex-col lg:flex-row items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <FiEdit3 className="text-purple-600" size={20} />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900 mb-2">
                    Управление блогом
                  </h1>
                  <p className="text-gray-600">
                    Создавайте, редактируйте и управляйте статьями блога
                  </p>
                </div>
              </div>
              <Link href="/admin-blog-new">
                <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2">
                  <FiPlus size={16} />
                  Создать статью
                </button>
              </Link>
            </div>
          </div>

          {/* Statistics */}
          {stats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FiEdit3 className="text-blue-600" size={16} />
                  </div>
                  <span className="text-sm font-medium text-gray-500">Всего статей</span>
                </div>
                <div className="text-2xl font-semibold text-gray-900">{stats.total_posts}</div>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <FiCheckCircle className="text-green-600" size={16} />
                  </div>
                  <span className="text-sm font-medium text-gray-500">Опубликовано</span>
                </div>
                <div className="text-2xl font-semibold text-gray-900">{stats.published_posts}</div>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <FiEdit className="text-yellow-600" size={16} />
                  </div>
                  <span className="text-sm font-medium text-gray-500">Черновиков</span>
                </div>
                <div className="text-2xl font-semibold text-gray-900">{stats.draft_posts}</div>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <FiStar className="text-purple-600" size={16} />
                  </div>
                  <span className="text-sm font-medium text-gray-500">Рекомендуемых</span>
                </div>
                <div className="text-2xl font-semibold text-gray-900">{stats.featured_posts}</div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Поиск по названию, автору..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">Все статьи</option>
                <option value="published">Опубликованные</option>
                <option value="draft">Черновики</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">Все категории</option>
                {getUniqueCategories().map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>

              <select
                value={featuredFilter}
                onChange={(e) => setFeaturedFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">Все типы</option>
                <option value="featured">Рекомендуемые</option>
                <option value="regular">Обычные</option>
              </select>
            </div>
          </div>

          {/* Blog Posts Cards */}
          <div className="space-y-4">
            {isLoading ? (
              <div className="bg-white rounded-xl border border-gray-200 flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-gray-300 border-t-purple-600 rounded-full animate-spin"></div>
                <span className="ml-3 text-gray-600">Загрузка статей...</span>
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 text-center py-12">
                <FiEdit3 className="mx-auto text-gray-400 mb-4" size={48} />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Статьи не найдены</h3>
                <p className="text-gray-600 mb-6">
                  {posts.length === 0
                    ? 'Создайте первую статью для блога'
                    : 'Попробуйте изменить фильтры поиска'
                  }
                </p>
                {posts.length === 0 && (
                  <Link href="/admin-blog-new">
                    <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2 mx-auto">
                      <FiPlus size={16} />
                      Создать первую статью
                    </button>
                  </Link>
                )}
              </div>
            ) : (
              filteredPosts.map((post) => (
                <div key={post.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow">
                  {/* Основная информация */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-20 h-14 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                      {post.image ? (
                        <img
                          src={post.image}
                          alt={post.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FiImage className="text-gray-400" size={20} />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-base font-semibold text-gray-900 line-clamp-2">
                              {post.title}
                            </h3>
                            {post.featured && (
                              <FiStar className="text-yellow-500 flex-shrink-0" size={16} />
                            )}
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                            {post.excerpt}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Link href={`/blog/${post.slug || post.id}`}>
                            <button className="text-gray-600 hover:text-purple-600 p-2 rounded-lg transition-colors duration-200" title="Просмотр">
                              <FiEye size={18} />
                            </button>
                          </Link>
                          <Link href={`/admin-blog-edit?id=${post.id}`}>
                            <button className="text-gray-600 hover:text-blue-600 p-2 rounded-lg transition-colors duration-200" title="Редактировать">
                              <FiEdit size={18} />
                            </button>
                          </Link>
                          <button
                            onClick={() => deletePost(post.id)}
                            disabled={isDeleting}
                            className="text-gray-600 hover:text-red-600 p-2 rounded-lg transition-colors duration-200 disabled:opacity-50"
                            title="Удалить"
                          >
                            <FiTrash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Метаинформация в одну строку */}
                  <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-2">
                        <FiUser className="text-gray-400" size={14} />
                        <span className="text-gray-700">{post.author}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {post.is_published ? (
                          <>
                            <FiCheckCircle className="text-green-500" size={14} />
                            <span className="text-green-700">Опубликовано</span>
                          </>
                        ) : (
                          <>
                            <FiEdit className="text-yellow-500" size={14} />
                            <span className="text-yellow-700">Черновик</span>
                          </>
                        )}
                      </div>

                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {post.category}
                      </span>

                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <FiEye className="text-gray-400" size={12} />
                          <span className="text-gray-600">{formatNumber(post.views)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-red-500">♥</span>
                          <span className="text-gray-600">{formatNumber(post.likes)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-sm text-gray-500">
                      <div>{formatDate(post.date)}</div>
                      {post.updated_at !== post.created_at && (
                        <div className="text-xs">Изм: {formatDate(post.updated_at)}</div>
                      )}
                      {post.scheduled_for && !post.is_published && (
                        <div className="text-xs text-blue-600 mt-1">
                          📅 Запланировано: {formatScheduledDate(post.scheduled_for)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Теги */}
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex items-center gap-2 mt-3 pt-2 border-t border-gray-50">
                      <FiTag className="text-gray-400" size={12} />
                      <div className="flex flex-wrap gap-1">
                        {post.tags.slice(0, 3).map((tag, index) => (
                          <span key={index} className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                            {tag}
                          </span>
                        ))}
                        {post.tags.length > 3 && (
                          <span className="text-xs text-gray-400">+{post.tags.length - 3}</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 ml-auto">{post.read_time}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </AdminDashboard>
    </>
  );
};

export default withAuth(AdminBlogPage, { adminOnly: true });