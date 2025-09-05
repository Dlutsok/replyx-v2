import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useNotifications } from '../hooks/useNotifications';

export default function AITokensPage() {
    const router = useRouter();
    const { showSuccess, showError, showWarning, showInfo } = useNotifications();
    const [tokens, setTokens] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingToken, setEditingToken] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        token: '',
        model_access: 'gpt-4o-mini',
        daily_limit: 10000,
        monthly_limit: 300000,
        priority: 1,
        notes: ''
    });

    useEffect(() => {
        checkAuth();
        loadTokens();
    }, []);

    const checkAuth = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
            return;
        }

        try {
            const response = await fetch('/api/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) {
                router.push('/login');
                return;
            }

            const user = await response.json();
            if (user.role !== 'admin') {
                router.push('/dashboard');
                return;
            }
        } catch (error) {
            router.push('/login');
        }
    };

    const loadTokens = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/admin/ai-tokens', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setTokens(data);
            }
        } catch (error) {
            console.error('Ошибка загрузки токенов:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        
        try {
            const url = editingToken 
                ? `/api/admin/ai-tokens/${editingToken.id}`
                : '/api/admin/ai-tokens';
            
            const method = editingToken ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                setShowModal(false);
                setEditingToken(null);
                setFormData({
                    name: '',
                    token: '',
                    model_access: 'gpt-4o-mini',
                    daily_limit: 10000,
                    monthly_limit: 300000,
                    priority: 1,
                    notes: ''
                });
                loadTokens();
            } else {
                showError('Ошибка при сохранении токена', { title: 'Ошибка' });
            }
        } catch (error) {
            console.error('Ошибка:', error);
            showError('Ошибка при сохранении токена', { title: 'Ошибка' });
        }
    };

    const handleEdit = (token) => {
        setEditingToken(token);
        setFormData({
            name: token.name,
            token: token.token ? token.token.substring(0, 10) + '...' : '',
            model_access: token.models.join(','),
            daily_limit: token.daily_limit,
            monthly_limit: token.monthly_limit,
            priority: token.priority,
            notes: token.notes || ''
        });
        setShowModal(true);
    };

    const handleDelete = async (tokenId) => {
        if (!confirm('Вы уверены, что хотите удалить этот токен?')) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/admin/ai-tokens/${tokenId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                loadTokens();
            } else {
                showError('Ошибка при удалении токена', { title: 'Ошибка' });
            }
        } catch (error) {
            console.error('Ошибка:', error);
            showError('Ошибка при удалении токена', { title: 'Ошибка' });
        }
    };

    const handleToggleActive = async (tokenId, isActive) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/admin/ai-tokens/${tokenId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ is_active: !isActive })
            });

            if (response.ok) {
                loadTokens();
            } else {
                showError('Ошибка при изменении статуса токена', { title: 'Ошибка' });
            }
        } catch (error) {
            console.error('Ошибка:', error);
            showError('Ошибка при изменении статуса токена', { title: 'Ошибка' });
        }
    };

    const setupTestTokens = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/admin/ai-tokens/test-setup', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                showSuccess(data.message);
                loadTokens();
            } else {
                showError('Ошибка при создании тестовых токенов', { title: 'Ошибка' });
            }
        } catch (error) {
            console.error('Ошибка:', error);
            showError('Ошибка при создании тестовых токенов', { title: 'Ошибка' });
        }
    };

    const getPriorityColor = (priority) => {
        const colors = {
            1: '#10b981', // green
            2: '#3b82f6', // blue  
            3: '#f59e0b', // amber
            4: '#ef4444', // red
        };
        return colors[priority] || '#6b7280';
    };

    const getUsagePercentage = (current, limit) => {
        return Math.min((current / limit) * 100, 100);
    };

    if (loading) {
        return (
                <div style={{ padding: '40px', textAlign: 'center' }}>
                    <div style={{ color: '#6b7280' }}>Загрузка...</div>
                </div>
        );
    }

    return (
        <>
            <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
                {/* Header */}
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '32px'
                }}>
                <div>
                        <h1 style={{ 
                            fontSize: '28px', 
                            fontWeight: '700', 
                            color: '#111827',
                            margin: '0 0 8px 0'
                        }}>
                            AI Токены
                        </h1>
                        <p style={{ 
                            color: '#6b7280', 
                            margin: 0,
                            fontSize: '16px'
                        }}>
                            Управление OpenAI API токенами
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                    <button 
                        onClick={setupTestTokens}
                            style={{
                                padding: '10px 16px',
                                background: '#f9fafb',
                                border: '1px solid #d1d5db',
                                borderRadius: '0.75rem',
                                color: '#374151',
                                fontSize: '14px',
                                fontWeight: '500',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => e.target.style.background = '#f3f4f6'}
                            onMouseOut={(e) => e.target.style.background = '#f9fafb'}
                        >
                            Тестовые токены
                    </button>
                    <button 
                        onClick={() => setShowModal(true)}
                            style={{
                                padding: '10px 20px',
                                background: '#3b82f6',
                                border: 'none',
                                borderRadius: '0.75rem',
                                color: 'white',
                                fontSize: '14px',
                                fontWeight: '500',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => e.target.style.background = '#2563eb'}
                            onMouseOut={(e) => e.target.style.background = '#3b82f6'}
                        >
                            + Добавить токен
                    </button>
                </div>
            </div>

                {/* Stats Cards */}
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '20px',
                    marginBottom: '32px'
                }}>
                    <div style={{
                        background: 'white',
                        padding: '24px',
                        borderRadius: '0.75rem',
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                    }}>
                        <div style={{ color: '#6b7280', fontSize: '14px', marginBottom: '8px' }}>
                            Всего токенов
                        </div>
                        <div style={{ fontSize: '32px', fontWeight: '700', color: '#111827' }}>
                            {tokens.length}
                        </div>
                    </div>
                    
                    <div style={{
                        background: 'white',
                        padding: '24px',
                        borderRadius: '0.75rem',
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                    }}>
                        <div style={{ color: '#6b7280', fontSize: '14px', marginBottom: '8px' }}>
                            Активных
                        </div>
                        <div style={{ fontSize: '32px', fontWeight: '700', color: '#10b981' }}>
                            {tokens.filter(t => t.is_active).length}
                        </div>
                </div>
                    
                    <div style={{
                        background: 'white',
                        padding: '24px',
                        borderRadius: '0.75rem',
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                    }}>
                        <div style={{ color: '#6b7280', fontSize: '14px', marginBottom: '8px' }}>
                            Суточное использование
                </div>
                        <div style={{ fontSize: '32px', fontWeight: '700', color: '#111827' }}>
                        {tokens.reduce((sum, t) => sum + t.daily_usage, 0).toLocaleString()}
                        </div>
                    </div>
                    
                    <div style={{
                        background: 'white',
                        padding: '24px',
                        borderRadius: '0.75rem',
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                    }}>
                        <div style={{ color: '#6b7280', fontSize: '14px', marginBottom: '8px' }}>
                            Месячное использование
                </div>
                        <div style={{ fontSize: '32px', fontWeight: '700', color: '#111827' }}>
                        {tokens.reduce((sum, t) => sum + t.monthly_usage, 0).toLocaleString()}
                    </div>
                </div>
            </div>

                {/* Tokens Grid */}
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
                    gap: '24px'
                }}>
                        {tokens.map(token => (
                        <div 
                            key={token.id}
                            style={{
                                background: 'white',
                                borderRadius: '0.75rem',
                                border: '1px solid #e5e7eb',
                                padding: '24px',
                                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                        >
                            {/* Header */}
                            <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'flex-start',
                                marginBottom: '16px'
                            }}>
                                <div style={{ flex: 1 }}>
                                    <h3 style={{ 
                                        fontSize: '18px', 
                                        fontWeight: '600', 
                                        color: '#111827',
                                        margin: '0 0 4px 0'
                                    }}>
                                        {token.name}
                                    </h3>
                                    {token.notes && (
                                        <p style={{ 
                                            fontSize: '14px', 
                                            color: '#6b7280',
                                            margin: 0
                                        }}>
                                            {token.notes}
                                        </p>
                                    )}
                                    </div>
                                
                                <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
                                    <button 
                                        onClick={() => handleEdit(token)}
                                        style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '0.75rem',
                                            border: '1px solid #d1d5db',
                                            background: '#f9fafb',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseOver={(e) => e.target.style.background = '#f3f4f6'}
                                        onMouseOut={(e) => e.target.style.background = '#f9fafb'}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                            <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                        </svg>
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(token.id)}
                                        style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '0.75rem',
                                            border: '1px solid #fecaca',
                                            background: '#fef2f2',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseOver={(e) => e.target.style.background = '#fee2e2'}
                                        onMouseOut={(e) => e.target.style.background = '#fef2f2'}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="3,6 5,6 21,6"/>
                                            <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"/>
                                            <line x1="10" y1="11" x2="10" y2="17"/>
                                            <line x1="14" y1="11" x2="14" y2="17"/>
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {/* Status and Priority */}
                            <div style={{ 
                                display: 'flex', 
                                gap: '12px', 
                                marginBottom: '20px'
                            }}>
                                <span 
                                    onClick={() => handleToggleActive(token.id, token.is_active)}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        padding: '4px 12px',
                                        borderRadius: '0.75rem',
                                        fontSize: '12px',
                                        fontWeight: '500',
                                        cursor: 'pointer',
                                        background: token.is_active ? '#dcfce7' : '#fef2f2',
                                        color: token.is_active ? '#166534' : '#991b1b'
                                    }}
                                >
                                    <div style={{
                                        width: '6px',
                                        height: '6px',
                                        borderRadius: '50%',
                                        background: token.is_active ? '#10b981' : '#ef4444',
                                        marginRight: '6px'
                                    }}></div>
                                    {token.is_active ? 'Активен' : 'Неактивен'}
                                </span>
                                
                                <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    padding: '4px 12px',
                                    borderRadius: '0.75rem',
                                    fontSize: '12px',
                                    fontWeight: '500',
                                    background: '#f3f4f6',
                                    color: '#374151'
                                }}>
                                    Приоритет {token.priority}
                                </span>
                            </div>

                            {/* Models */}
                            <div style={{ marginBottom: '20px' }}>
                                <div style={{ 
                                    fontSize: '14px', 
                                    fontWeight: '500', 
                                    color: '#374151',
                                    marginBottom: '8px'
                                }}>
                                    Модели
                                </div>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    {token.models.map(model => (
                                        <span 
                                            key={model}
                                            style={{
                                                background: '#eff6ff',
                                                color: '#1d4ed8',
                                                padding: '4px 8px',
                                                borderRadius: '0.75rem',
                                                fontSize: '12px',
                                                fontWeight: '500'
                                            }}
                                        >
                                            {model}
                                        </span>
                        ))}
                                </div>
                            </div>

                            {/* Usage */}
                            <div>
                                <div style={{ 
                                    fontSize: '14px', 
                                    fontWeight: '500', 
                                    color: '#374151',
                                    marginBottom: '12px'
                                }}>
                                    Использование
                                </div>
                                
                                {/* Daily Usage */}
                                <div style={{ marginBottom: '12px' }}>
                                    <div style={{ 
                                        display: 'flex', 
                                        justifyContent: 'space-between',
                                        marginBottom: '4px'
                                    }}>
                                        <span style={{ fontSize: '12px', color: '#6b7280' }}>
                                            Сутки
                                        </span>
                                        <span style={{ fontSize: '12px', color: '#6b7280' }}>
                                            {token.daily_usage.toLocaleString()} / {token.daily_limit.toLocaleString()}
                                        </span>
                                    </div>
                                    <div style={{
                                        background: '#f1f5f9',
                                        height: '6px',
                                        borderRadius: '0.75rem',
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{
                                            background: getUsagePercentage(token.daily_usage, token.daily_limit) > 80 
                                                ? '#ef4444' 
                                                : getUsagePercentage(token.daily_usage, token.daily_limit) > 60 
                                                ? '#f59e0b' 
                                                : '#10b981',
                                            height: '100%',
                                            width: `${getUsagePercentage(token.daily_usage, token.daily_limit)}%`,
                                            transition: 'width 0.3s'
                                        }}></div>
                                    </div>
                                </div>

                                {/* Monthly Usage */}
                                <div style={{ marginBottom: '12px' }}>
                                    <div style={{ 
                                        display: 'flex', 
                                        justifyContent: 'space-between',
                                        marginBottom: '4px'
                                    }}>
                                        <span style={{ fontSize: '12px', color: '#6b7280' }}>
                                            Месяц
                                        </span>
                                        <span style={{ fontSize: '12px', color: '#6b7280' }}>
                                            {token.monthly_usage.toLocaleString()} / {token.monthly_limit.toLocaleString()}
                                        </span>
                                    </div>
                                    <div style={{
                                        background: '#f1f5f9',
                                        height: '6px',
                                        borderRadius: '0.75rem',
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{
                                            background: getUsagePercentage(token.monthly_usage, token.monthly_limit) > 80 
                                                ? '#ef4444' 
                                                : getUsagePercentage(token.monthly_usage, token.monthly_limit) > 60 
                                                ? '#f59e0b' 
                                                : '#10b981',
                                            height: '100%',
                                            width: `${getUsagePercentage(token.monthly_usage, token.monthly_limit)}%`,
                                            transition: 'width 0.3s'
                                        }}></div>
                                    </div>
                                </div>

                                {/* Errors */}
                                {token.error_count > 0 && (
                                    <div style={{ 
                                        color: '#ef4444', 
                                        fontSize: '12px',
                                        background: '#fef2f2',
                                        padding: '6px 8px',
                                        borderRadius: '0.75rem',
                                        border: '1px solid #fecaca'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                                                <line x1="12" y1="9" x2="12" y2="13"/>
                                                <line x1="12" y1="17" x2="12.01" y2="17"/>
                                            </svg>
                                            Ошибок: {token.error_count}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Empty State */}
                {tokens.length === 0 && (
                    <div style={{
                        background: 'white',
                        borderRadius: '0.75rem',
                        border: '1px solid #e5e7eb',
                        padding: '60px 40px',
                        textAlign: 'center'
                    }}>
                        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                <circle cx="12" cy="16" r="1"/>
                                <path d="m7 11V7a5 5 0 0 1 10 0v4"/>
                            </svg>
                        </div>
                        <h3 style={{ 
                            fontSize: '18px', 
                            fontWeight: '600', 
                            color: '#111827',
                            marginBottom: '8px'
                        }}>
                            Нет AI токенов
                        </h3>
                        <p style={{ color: '#6b7280', marginBottom: '24px' }}>
                            Добавьте первый OpenAI API токен для начала работы
                        </p>
                        <button 
                            onClick={() => setShowModal(true)}
                            style={{
                                padding: '12px 24px',
                                background: '#3b82f6',
                                border: 'none',
                                borderRadius: '0.75rem',
                                color: 'white',
                                fontSize: '14px',
                                fontWeight: '500',
                                cursor: 'pointer'
                            }}
                        >
                            Добавить токен
                        </button>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        background: 'white',
                        borderRadius: '0.75rem',
                        padding: '32px',
                        width: '100%',
                        maxWidth: '500px',
                        margin: '20px',
                        maxHeight: '90vh',
                        overflow: 'auto'
                    }}>
                        <h2 style={{
                            fontSize: '24px',
                            fontWeight: '700',
                            color: '#111827',
                            marginBottom: '24px'
                        }}>
                            {editingToken ? 'Редактировать токен' : 'Добавить токен'}
                        </h2>
                        
                        <form onSubmit={handleSubmit}>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{
                                    display: 'block',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    color: '#374151',
                                    marginBottom: '6px'
                                }}>
                                    Название
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '0.75rem',
                                        fontSize: '14px',
                                        outline: 'none'
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{
                                    display: 'block',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    color: '#374151',
                                    marginBottom: '6px'
                                }}>
                                    AI токен
                                </label>
                                <input
                                    type="text"
                                    value={formData.token}
                                    onChange={(e) => setFormData({...formData, token: e.target.value})}
                                    placeholder="sk-..."
                                    required={!editingToken}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '0.75rem',
                                        fontSize: '14px',
                                        outline: 'none'
                                    }}
                                />
                                {editingToken && (
                                    <div style={{ 
                                        fontSize: '12px', 
                                        color: '#6b7280',
                                        marginTop: '4px'
                                    }}>
                                        Оставьте пустым, чтобы не изменять токен
                                    </div>
                                )}
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{
                                    display: 'block',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    color: '#374151',
                                    marginBottom: '6px'
                                }}>
                                    Доступные модели (через запятую)
                                </label>
                                <input
                                    type="text"
                                    value={formData.model_access}
                                    onChange={(e) => setFormData({...formData, model_access: e.target.value})}
                                    placeholder="gpt-4o-mini"
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '0.75rem',
                                        fontSize: '14px',
                                        outline: 'none'
                                    }}
                                />
                            </div>

                            <div style={{ 
                                display: 'grid', 
                                gridTemplateColumns: '1fr 1fr 1fr',
                                gap: '16px',
                                marginBottom: '20px'
                            }}>
                                <div>
                                    <label style={{
                                        display: 'block',
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        color: '#374151',
                                        marginBottom: '6px'
                                    }}>
                                        Дневной лимит
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.daily_limit}
                                        onChange={(e) => setFormData({...formData, daily_limit: parseInt(e.target.value)})}
                                        min="1"
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '0.75rem',
                                            fontSize: '14px',
                                            outline: 'none'
                                        }}
                                    />
                                </div>

                                <div>
                                    <label style={{
                                        display: 'block',
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        color: '#374151',
                                        marginBottom: '6px'
                                    }}>
                                        Месячный лимит
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.monthly_limit}
                                        onChange={(e) => setFormData({...formData, monthly_limit: parseInt(e.target.value)})}
                                        min="1"
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '0.75rem',
                                            fontSize: '14px',
                                            outline: 'none'
                                        }}
                                    />
                                </div>

                                <div>
                                    <label style={{
                                        display: 'block',
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        color: '#374151',
                                        marginBottom: '6px'
                                    }}>
                                        Приоритет (1-10)
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.priority}
                                        onChange={(e) => setFormData({...formData, priority: parseInt(e.target.value)})}
                                        min="1"
                                        max="10"
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '0.75rem',
                                            fontSize: '14px',
                                            outline: 'none'
                                        }}
                                    />
                                </div>
                            </div>

                            <div style={{ marginBottom: '32px' }}>
                                <label style={{
                                    display: 'block',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    color: '#374151',
                                    marginBottom: '6px'
                                }}>
                                    Заметки
                                </label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                                    rows="3"
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '0.75rem',
                                        fontSize: '14px',
                                        outline: 'none',
                                        resize: 'vertical'
                                    }}
                                />
                            </div>

                            <div style={{ 
                                display: 'flex', 
                                gap: '12px',
                                justifyContent: 'flex-end'
                            }}>
                                <button 
                                    type="button" 
                                    onClick={() => {
                                        setShowModal(false);
                                        setEditingToken(null);
                                    }}
                                    style={{
                                        padding: '10px 20px',
                                        background: '#f9fafb',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '0.75rem',
                                        color: '#374151',
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Отмена
                                </button>
                                <button 
                                    type="submit"
                                    style={{
                                        padding: '10px 20px',
                                        background: '#3b82f6',
                                        border: 'none',
                                        borderRadius: '0.75rem',
                                        color: 'white',
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {editingToken ? 'Сохранить' : 'Добавить'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
} 