import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks';
import AdminDashboard from '@/components/layout/AdminDashboard';
import {
  FiMessageSquare, FiUsers, FiCalendar, FiTrendingUp,
  FiEye, FiChevronDown, FiChevronRight, FiClock, FiHash,
  FiExternalLink, FiRefreshCw, FiX, FiUser, FiCpu, FiActivity
} from 'react-icons/fi';
import Head from 'next/head';

const AdminChats = () => {
  const { user, loading } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDialogs, setUserDialogs] = useState([]);
  const [expandedUsers, setExpandedUsers] = useState(new Set());
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingDialogs, setLoadingDialogs] = useState(false);

  // Modal states for dialog messages
  const [selectedDialogId, setSelectedDialogId] = useState(null);
  const [dialogMessages, setDialogMessages] = useState([]);
  const [dialogInfo, setDialogInfo] = useState(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showMessagesModal, setShowMessagesModal] = useState(false);

  // Pagination states
  const [usersPage, setUsersPage] = useState(1);
  const [usersPagination, setUsersPagination] = useState({});
  const [dialogsPage, setDialogsPage] = useState(1);
  const [dialogsPagination, setDialogsPagination] = useState({});

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchAnalytics();
      fetchUsers();
    }
  }, [user]);

  const fetchAnalytics = async () => {
    try {
      setLoadingAnalytics(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/chats/overview', {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const fetchUsers = async (page = 1) => {
    try {
      setLoadingUsers(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/chats/users?page=${page}&limit=20&sort_by=last_activity&order=desc`, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
        setUsersPagination(data.pagination);
        setUsersPage(page);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchUserDialogs = async (userId, page = 1) => {
    try {
      setLoadingDialogs(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/chats/user/${userId}/dialogs?page=${page}&limit=10`, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUserDialogs(data.dialogs);
        setDialogsPagination(data.pagination);
        setDialogsPage(page);
        setSelectedUser(data.user_info);
      }
    } catch (error) {
      console.error('Error fetching user dialogs:', error);
    } finally {
      setLoadingDialogs(false);
    }
  };

  const fetchDialogMessages = async (dialogId) => {
    try {
      setLoadingMessages(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/chats/dialog/${dialogId}/messages`, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDialogMessages(data.messages);
        setDialogInfo(data.dialog_info);
        setSelectedDialogId(dialogId);
        setShowMessagesModal(true);
      } else {
        console.error('Failed to fetch dialog messages');
      }
    } catch (error) {
      console.error('Error fetching dialog messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const closeMessagesModal = () => {
    setShowMessagesModal(false);
    setSelectedDialogId(null);
    setDialogMessages([]);
    setDialogInfo(null);
  };

  const toggleUserExpanded = (userId) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
      if (selectedUser?.user_id === userId) {
        setSelectedUser(null);
        setUserDialogs([]);
      }
    } else {
      newExpanded.add(userId);
      fetchUserDialogs(userId);
    }
    setExpandedUsers(newExpanded);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('ru-RU');
  };

  const formatDuration = (minutes) => {
    if (!minutes) return '—';
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return hours > 0 ? `${hours}ч ${mins}м` : `${mins}м`;
  };

  if (loading) {
    return <div>Загрузка...</div>;
  }

  if (!user || user.role !== 'admin') {
    return <div>Доступ запрещен</div>;
  }

  return (
    <>
      <Head>
        <title>Аналитика чатов - Admin Panel</title>
      </Head>

      <AdminDashboard activeSection="chats">
        <div className="admin-chats-container">
          {/* Header */}
          <div className="page-header">
            <div className="header-content">
              <div className="header-info">
                <FiMessageSquare size={24} />
                <div>
                  <h1>Аналитика чатов</h1>
                  <p>Статистика по диалогам и пользователям</p>
                </div>
              </div>
              <button
                className="refresh-btn"
                onClick={() => {
                  fetchAnalytics();
                  fetchUsers(usersPage);
                }}
              >
                <FiRefreshCw size={16} />
                Обновить
              </button>
            </div>
          </div>

          {/* Real-time Activity */}
          {analytics && (
            <div className="realtime-activity">
              <div className="realtime-header">
                <h2>Активность в реальном времени</h2>
              </div>
              <div className="realtime-stats">
                <div className="realtime-card">
                  <div className="realtime-icon">
                    <FiActivity />
                  </div>
                  <div className="realtime-content">
                    <div className="realtime-value">{analytics.messages_last_hour}</div>
                    <div className="realtime-label">Сообщений за час</div>
                  </div>
                </div>

                <div className="realtime-card">
                  <div className="realtime-icon">
                    <FiClock />
                  </div>
                  <div className="realtime-content">
                    <div className="realtime-value">
                      {analytics.last_message_time ?
                        formatDate(analytics.last_message_time) :
                        'Нет сообщений'
                      }
                    </div>
                    <div className="realtime-label">Последнее сообщение</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Analytics Overview */}
          {analytics && (
            <div className="analytics-overview">
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon">
                    <FiMessageSquare />
                  </div>
                  <div className="stat-content">
                    <div className="stat-value">{analytics.total_dialogs}</div>
                    <div className="stat-label">Всего диалогов</div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon">
                    <FiHash />
                  </div>
                  <div className="stat-content">
                    <div className="stat-value">{analytics.total_messages}</div>
                    <div className="stat-label">Всего сообщений</div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon">
                    <FiUsers />
                  </div>
                  <div className="stat-content">
                    <div className="stat-value">{analytics.total_users_with_chats}</div>
                    <div className="stat-label">Пользователи с чатами</div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon">
                    <FiTrendingUp />
                  </div>
                  <div className="stat-content">
                    <div className="stat-value">{analytics.avg_messages_per_dialog}</div>
                    <div className="stat-label">Среднее сообщений на диалог</div>
                  </div>
                </div>
              </div>

              <div className="analytics-details">
                <div className="activity-stats">
                  <h3>Активность пользователей</h3>
                  <div className="activity-grid">
                    <div className="activity-item">
                      <span>Сегодня</span>
                      <strong>{analytics.active_users_today}</strong>
                    </div>
                    <div className="activity-item">
                      <span>За неделю</span>
                      <strong>{analytics.active_users_week}</strong>
                    </div>
                  </div>
                </div>

                <div className="channels-stats">
                  <h3>Топ каналов</h3>
                  <div className="channels-list">
                    {analytics.top_channels.map((channel, index) => (
                      <div key={index} className="channel-item">
                        <span className="channel-name">{channel.channel}</span>
                        <span className="channel-count">{channel.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Users List */}
          <div className="users-section">
            <div className="section-header">
              <h2>Пользователи с чатами</h2>
              {usersPagination.total && (
                <span className="results-count">
                  {usersPagination.total} пользователей
                </span>
              )}
            </div>

            {loadingUsers ? (
              <div className="loading">Загрузка пользователей...</div>
            ) : (
              <div className="users-list">
                {users.map(user => (
                  <div key={user.user_id} className="user-item">
                    <div
                      className="user-header"
                      onClick={() => toggleUserExpanded(user.user_id)}
                    >
                      <div className="user-info">
                        <div className="user-toggle">
                          {expandedUsers.has(user.user_id) ?
                            <FiChevronDown size={16} /> :
                            <FiChevronRight size={16} />
                          }
                        </div>
                        <div className="user-details">
                          <div className="user-name">
                            {user.full_name || user.email}
                          </div>
                          <div className="user-email">{user.email}</div>
                        </div>
                      </div>

                      <div className="user-stats">
                        <div className="stat-item">
                          <FiMessageSquare size={14} />
                          <span>{user.total_dialogs} диалогов</span>
                        </div>
                        <div className="stat-item">
                          <FiHash size={14} />
                          <span>{user.total_messages} сообщений</span>
                        </div>
                        <div className="stat-item">
                          <FiClock size={14} />
                          <span>{user.last_activity ? formatDate(user.last_activity) : '—'}</span>
                        </div>
                      </div>
                    </div>

                    {/* User Dialogs */}
                    {expandedUsers.has(user.user_id) && (
                      <div className="user-dialogs">
                        {loadingDialogs ? (
                          <div className="loading">Загрузка диалогов...</div>
                        ) : userDialogs.length > 0 ? (
                          <div className="dialogs-list">
                            {userDialogs.map(dialog => (
                              <div key={dialog.dialog_id} className="dialog-item">
                                <div
                                  className="dialog-header clickable"
                                  onClick={() => fetchDialogMessages(dialog.dialog_id)}
                                  title="Нажмите для просмотра переписки"
                                >
                                  <div className="dialog-info">
                                    <span className="dialog-id">#{dialog.dialog_id}</span>
                                    <span className={`dialog-channel ${dialog.channel}`}>
                                      {dialog.channel}
                                    </span>
                                    <span className="dialog-status">{dialog.status}</span>
                                    <FiEye className="view-icon" size={14} />
                                  </div>
                                  <div className="dialog-time">
                                    {formatDate(dialog.started_at)}
                                  </div>
                                </div>

                                <div className="dialog-details">
                                  <div className="dialog-stats">
                                    <span>{dialog.message_count} сообщений</span>
                                    {dialog.duration_minutes && (
                                      <span>• {formatDuration(dialog.duration_minutes)}</span>
                                    )}
                                    {dialog.assistant_name && (
                                      <span>• {dialog.assistant_name}</span>
                                    )}
                                  </div>

                                  {dialog.first_message_preview && (
                                    <div className="message-preview">
                                      {dialog.first_message_preview}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}

                            {/* Dialogs Pagination */}
                            {dialogsPagination.pages > 1 && (
                              <div className="pagination">
                                <button
                                  disabled={dialogsPage <= 1}
                                  onClick={() => fetchUserDialogs(selectedUser.user_id, dialogsPage - 1)}
                                >
                                  Предыдущая
                                </button>
                                <span>
                                  Страница {dialogsPage} из {dialogsPagination.pages}
                                </span>
                                <button
                                  disabled={dialogsPage >= dialogsPagination.pages}
                                  onClick={() => fetchUserDialogs(selectedUser.user_id, dialogsPage + 1)}
                                >
                                  Следующая
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="no-dialogs">У пользователя нет диалогов</div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Users Pagination */}
            {usersPagination.pages > 1 && (
              <div className="pagination">
                <button
                  disabled={usersPage <= 1}
                  onClick={() => fetchUsers(usersPage - 1)}
                >
                  Предыдущая
                </button>
                <span>
                  Страница {usersPage} из {usersPagination.pages}
                </span>
                <button
                  disabled={usersPage >= usersPagination.pages}
                  onClick={() => fetchUsers(usersPage + 1)}
                >
                  Следующая
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Modal for Dialog Messages */}
        {showMessagesModal && (
          <div className="modal-overlay" onClick={closeMessagesModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-title">
                  <FiMessageSquare size={20} />
                  <span>Переписка диалога #{selectedDialogId}</span>
                </div>
                <button className="modal-close" onClick={closeMessagesModal}>
                  <FiX size={20} />
                </button>
              </div>

              {dialogInfo && (
                <div className="dialog-info-bar">
                  <div className="info-item">
                    <span className={`channel-badge ${dialogInfo.channel}`}>
                      {dialogInfo.channel}
                    </span>
                  </div>
                  <div className="info-item">
                    <FiClock size={14} />
                    <span>{formatDate(dialogInfo.started_at)}</span>
                  </div>
                  <div className="info-item">
                    <FiHash size={14} />
                    <span>{dialogInfo.message_count} сообщений</span>
                  </div>
                  {dialogInfo.assistant_name && (
                    <div className="info-item">
                      <FiCpu size={14} />
                      <span>{dialogInfo.assistant_name}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="modal-body">
                {loadingMessages ? (
                  <div className="loading">Загрузка сообщений...</div>
                ) : dialogMessages.length > 0 ? (
                  <div className="messages-list">
                    {dialogMessages.map(message => (
                      <div
                        key={message.id}
                        className={`message-item ${message.sender}`}
                      >
                        <div className="message-header">
                          <div className="message-sender">
                            {message.sender === 'user' ? (
                              <>
                                <FiUser size={14} />
                                <span>Пользователь</span>
                              </>
                            ) : message.sender === 'assistant' ? (
                              <>
                                <FiCpu size={14} />
                                <span>Ассистент</span>
                              </>
                            ) : (
                              <>
                                <FiUsers size={14} />
                                <span>{message.sender}</span>
                              </>
                            )}
                          </div>
                          <div className="message-time">
                            {formatDate(message.timestamp)}
                          </div>
                        </div>
                        <div className="message-text">
                          {message.text}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-messages">
                    Сообщений в диалоге нет
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <style jsx>{`
          .admin-chats-container {
            padding: 2rem;
            max-width: 1400px;
            margin: 0 auto;
          }

          .page-header {
            margin-bottom: 2rem;
          }

          .header-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .header-info {
            display: flex;
            align-items: center;
            gap: 1rem;
          }

          .header-info h1 {
            margin: 0;
            font-size: 1.8rem;
            font-weight: 600;
          }

          .header-info p {
            margin: 0;
            color: #666;
            font-size: 0.9rem;
          }

          .refresh-btn {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.75rem 1rem;
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .refresh-btn:hover {
            background: #e9ecef;
          }

          .realtime-activity {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 12px;
            padding: 2rem;
            margin-bottom: 2rem;
            box-shadow: 0 4px 16px rgba(102, 126, 234, 0.2);
            color: white;
          }

          .realtime-header h2 {
            margin: 0 0 1.5rem 0;
            font-size: 1.4rem;
            font-weight: 600;
            color: white;
          }

          .realtime-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 1.5rem;
          }

          .realtime-card {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 1.5rem;
            background: rgba(255, 255, 255, 0.15);
            border-radius: 10px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
          }

          .realtime-icon {
            width: 48px;
            height: 48px;
            border-radius: 8px;
            background: rgba(255, 255, 255, 0.2);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
          }

          .realtime-value {
            font-size: 1.6rem;
            font-weight: 700;
            color: white;
            margin-bottom: 0.25rem;
          }

          .realtime-label {
            font-size: 0.875rem;
            color: rgba(255, 255, 255, 0.9);
          }

          .analytics-overview {
            background: white;
            border-radius: 12px;
            padding: 2rem;
            margin-bottom: 2rem;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }

          .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
          }

          .stat-card {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 1.5rem;
            background: #f8f9fa;
            border-radius: 8px;
          }

          .stat-icon {
            width: 48px;
            height: 48px;
            border-radius: 8px;
            background: #6366f1;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .stat-value {
            font-size: 1.8rem;
            font-weight: 700;
            color: #1f2937;
          }

          .stat-label {
            font-size: 0.875rem;
            color: #6b7280;
          }

          .analytics-details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 2rem;
          }

          .activity-stats h3,
          .channels-stats h3 {
            margin: 0 0 1rem 0;
            font-size: 1.1rem;
            font-weight: 600;
          }

          .activity-grid {
            display: flex;
            gap: 1rem;
          }

          .activity-item {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
            padding: 1rem;
            background: #f8f9fa;
            border-radius: 8px;
            flex: 1;
          }

          .activity-item span {
            font-size: 0.875rem;
            color: #6b7280;
          }

          .activity-item strong {
            font-size: 1.5rem;
            font-weight: 700;
            color: #1f2937;
          }

          .channels-list {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
          }

          .channel-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.75rem;
            background: #f8f9fa;
            border-radius: 6px;
          }

          .channel-name {
            font-weight: 500;
          }

          .channel-count {
            font-weight: 700;
            color: #6366f1;
          }

          .users-section {
            background: white;
            border-radius: 12px;
            padding: 2rem;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }

          .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
          }

          .section-header h2 {
            margin: 0;
            font-size: 1.3rem;
            font-weight: 600;
          }

          .results-count {
            font-size: 0.875rem;
            color: #6b7280;
          }

          .users-list {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
          }

          .user-item {
            border: 1px solid #e9ecef;
            border-radius: 8px;
            overflow: hidden;
          }

          .user-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1rem;
            cursor: pointer;
            transition: background-color 0.2s ease;
          }

          .user-header:hover {
            background: #f8f9fa;
          }

          .user-info {
            display: flex;
            align-items: center;
            gap: 0.75rem;
          }

          .user-toggle {
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .user-name {
            font-weight: 600;
            margin-bottom: 0.25rem;
          }

          .user-email {
            font-size: 0.875rem;
            color: #6b7280;
          }

          .user-stats {
            display: flex;
            gap: 1.5rem;
          }

          .stat-item {
            display: flex;
            align-items: center;
            gap: 0.25rem;
            font-size: 0.875rem;
            color: #6b7280;
          }

          .user-dialogs {
            border-top: 1px solid #e9ecef;
            background: #f8f9fa;
            padding: 1rem;
          }

          .dialogs-list {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
          }

          .dialog-item {
            background: white;
            border-radius: 6px;
            padding: 1rem;
            border: 1px solid #e9ecef;
          }

          .dialog-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.5rem;
          }

          .dialog-header.clickable {
            cursor: pointer;
            transition: background-color 0.2s ease;
            padding: 0.5rem;
            margin: -0.5rem;
            border-radius: 6px;
          }

          .dialog-header.clickable:hover {
            background-color: #f8f9fa;
          }

          .view-icon {
            margin-left: 0.5rem;
            opacity: 0.6;
            transition: opacity 0.2s ease;
          }

          .dialog-header.clickable:hover .view-icon {
            opacity: 1;
          }

          .dialog-info {
            display: flex;
            align-items: center;
            gap: 0.75rem;
          }

          .dialog-id {
            font-weight: 600;
            color: #1f2937;
          }

          .dialog-channel {
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 500;
          }

          .dialog-channel.website {
            background: #dbeafe;
            color: #1e40af;
          }

          .dialog-channel.telegram {
            background: #dcfce7;
            color: #166534;
          }

          .dialog-status {
            font-size: 0.75rem;
            color: #6b7280;
            text-transform: uppercase;
          }

          .dialog-time {
            font-size: 0.875rem;
            color: #6b7280;
          }

          .dialog-stats {
            font-size: 0.875rem;
            color: #6b7280;
            margin-bottom: 0.5rem;
          }

          .message-preview {
            font-size: 0.875rem;
            color: #4b5563;
            font-style: italic;
            line-height: 1.4;
          }

          .pagination {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 1rem;
            margin-top: 1.5rem;
            padding-top: 1.5rem;
            border-top: 1px solid #e9ecef;
          }

          .pagination button {
            padding: 0.5rem 1rem;
            border: 1px solid #e9ecef;
            border-radius: 6px;
            background: white;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .pagination button:hover:not(:disabled) {
            background: #f8f9fa;
          }

          .pagination button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .loading,
          .no-dialogs {
            text-align: center;
            padding: 2rem;
            color: #6b7280;
          }

          @media (max-width: 768px) {
            .admin-chats-container {
              padding: 1rem;
            }

            .header-content {
              flex-direction: column;
              gap: 1rem;
              align-items: flex-start;
            }

            .realtime-stats {
              grid-template-columns: 1fr;
            }

            .realtime-card {
              padding: 1rem;
            }

            .realtime-value {
              font-size: 1.4rem;
            }

            .stats-grid {
              grid-template-columns: 1fr;
            }

            .analytics-details {
              grid-template-columns: 1fr;
            }

            .user-stats {
              flex-direction: column;
              gap: 0.5rem;
            }

            .dialog-header {
              flex-direction: column;
              align-items: flex-start;
              gap: 0.5rem;
            }
          }

          /* Modal Styles */
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: 2rem;
          }

          .modal-content {
            background: white;
            border-radius: 12px;
            max-width: 800px;
            width: 100%;
            max-height: 80vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          }

          .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1.5rem;
            border-bottom: 1px solid #e9ecef;
          }

          .modal-title {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            font-size: 1.25rem;
            font-weight: 600;
            color: #1f2937;
          }

          .modal-close {
            background: none;
            border: none;
            padding: 0.5rem;
            border-radius: 6px;
            cursor: pointer;
            transition: background-color 0.2s ease;
            color: #6b7280;
          }

          .modal-close:hover {
            background: #f3f4f6;
            color: #374151;
          }

          .dialog-info-bar {
            display: flex;
            gap: 1rem;
            padding: 1rem 1.5rem;
            background: #f8f9fa;
            border-bottom: 1px solid #e9ecef;
            flex-wrap: wrap;
          }

          .info-item {
            display: flex;
            align-items: center;
            gap: 0.25rem;
            font-size: 0.875rem;
            color: #6b7280;
          }

          .channel-badge {
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 500;
          }

          .channel-badge.website {
            background: #dbeafe;
            color: #1e40af;
          }

          .channel-badge.telegram {
            background: #dcfce7;
            color: #166534;
          }

          .modal-body {
            flex: 1;
            overflow-y: auto;
            padding: 1.5rem;
          }

          .messages-list {
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }

          .message-item {
            border-radius: 8px;
            padding: 1rem;
            border: 1px solid #e5e7eb;
          }

          .message-item.user {
            background: #f0f9ff;
            border-color: #bae6fd;
            margin-left: 2rem;
          }

          .message-item.assistant {
            background: #f3f4f6;
            border-color: #d1d5db;
            margin-right: 2rem;
          }

          .message-item.manager {
            background: #fef3c7;
            border-color: #fcd34d;
            margin-right: 2rem;
          }

          .message-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.5rem;
          }

          .message-sender {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.875rem;
            font-weight: 600;
          }

          .message-item.user .message-sender {
            color: #1e40af;
          }

          .message-item.assistant .message-sender {
            color: #6b7280;
          }

          .message-item.manager .message-sender {
            color: #d97706;
          }

          .message-time {
            font-size: 0.75rem;
            color: #9ca3af;
          }

          .message-text {
            line-height: 1.5;
            color: #374151;
            white-space: pre-wrap;
            word-break: break-word;
          }

          .no-messages {
            text-align: center;
            padding: 3rem;
            color: #6b7280;
            font-style: italic;
          }

          @media (max-width: 768px) {
            .modal-overlay {
              padding: 1rem;
            }

            .modal-content {
              max-height: 90vh;
            }

            .modal-header {
              padding: 1rem;
            }

            .modal-body {
              padding: 1rem;
            }

            .dialog-info-bar {
              padding: 1rem;
            }

            .message-item.user,
            .message-item.assistant,
            .message-item.manager {
              margin-left: 0;
              margin-right: 0;
            }
          }
        `}</style>
      </AdminDashboard>
    </>
  );
};

export default AdminChats;