import { useMemo } from 'react';
import { getChannelType } from '../utils/dialogHelpers';
import { 
  STATUS_ACTIVE, 
  STATUS_TAKEN_OVER, 
  STATUS_ALL,
  STATUS_HANDOFF_REQUESTED,
  STATUS_HANDOFF_ACTIVE,
  TIME_ALL,
  TIME_TODAY,
  TIME_YESTERDAY,
  TIME_WEEK,
  TIME_MONTH
} from '../constants/dialogStatus';

/**
 * Хук для фильтрации и сортировки диалогов
 */
export const useDialogsFilterSort = ({
  dialogs = [],
  bots = [],
  searchQuery = '',
  selectedChannel = null,
  selectedBot = null,
  timeFilter = TIME_ALL,
  statusFilter = STATUS_ALL,
  sortBy = 'time',
  sortOrder = 'desc'
}) => {

  // Фильтрация по времени
  const filterByTime = (dialogs, timeFilter) => {
    if (timeFilter === TIME_ALL) return dialogs;
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    return dialogs.filter(dialog => {
      const messageDate = new Date(dialog.last_message_at);
      
      switch(timeFilter) {
        case TIME_TODAY:
          return messageDate >= today;
        case TIME_YESTERDAY:
          return messageDate >= yesterday && messageDate < today;
        case TIME_WEEK:
          return messageDate >= weekAgo;
        case TIME_MONTH:
          return messageDate >= monthAgo;
        default:
          return true;
      }
    });
  };

  // Фильтрация по статусу
  const filterByStatus = (dialogs, statusFilter) => {
    if (statusFilter === STATUS_ALL) return dialogs;
    
    return dialogs.filter(dialog => {
      switch(statusFilter) {
        case STATUS_ACTIVE:
          return dialog.is_taken_over !== 1 && dialog.auto_response;
        case STATUS_TAKEN_OVER:
          return dialog.is_taken_over === 1;
        case STATUS_HANDOFF_REQUESTED:
          return dialog.handoff_status === 'requested';
        case STATUS_HANDOFF_ACTIVE:
          return dialog.handoff_status === 'active';
        default:
          return true;
      }
    });
  };

  // Сортировка диалогов
  const sortDialogs = (dialogs, sortBy, sortOrder) => {
    return [...dialogs].sort((a, b) => {
      let comparison = 0;
      
      switch(sortBy) {
        case 'time':
          comparison = new Date(b.last_message_at) - new Date(a.last_message_at);
          break;
        case 'name':
          const nameA = a.name || a.telegram_username || a.user_id || '';
          const nameB = b.name || b.telegram_username || b.user_id || '';
          comparison = nameA.localeCompare(nameB);
          break;
        case 'status':
          const statusA = a.is_taken_over === 1 ? 1 : (a.auto_response ? 2 : 0);
          const statusB = b.is_taken_over === 1 ? 1 : (b.auto_response ? 2 : 0);
          comparison = statusB - statusA;
          break;
        default:
          return 0;
      }
      
      return sortOrder === 'desc' ? comparison : -comparison;
    });
  };

  // Основная логика фильтрации и сортировки
  const filteredAndSortedDialogs = useMemo(() => {
    let filtered = Array.isArray(dialogs) ? dialogs : [];
    
    // Поиск
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter(d => {
        const name = String(d.name || d.telegram_username || d.user_id || '').toLowerCase();
        const email = String(d.email || '').toLowerCase();
        const topic = String(d.topic || '').toLowerCase();
        const comment = String(d.comment || '').toLowerCase();
        
        return name.includes(searchLower) || 
               email.includes(searchLower) || 
               topic.includes(searchLower) || 
               comment.includes(searchLower);
      });
    }
    
    // Фильтр по каналу
    if (selectedChannel) {
      filtered = filtered.filter(d => getChannelType(d) === selectedChannel);
    }
    
    // Фильтр по боту
    if (selectedBot) {
      filtered = filtered.filter(d => d.assistant_id === selectedBot);
    }
    
    // Фильтр по времени
    filtered = filterByTime(filtered, timeFilter);
    
    // Фильтр по статусу
    filtered = filterByStatus(filtered, statusFilter);
    
    // Сортировка
    filtered = sortDialogs(filtered, sortBy, sortOrder);
    
    return filtered;
  }, [dialogs, searchQuery, selectedChannel, selectedBot, timeFilter, statusFilter, sortBy, sortOrder, bots]);

  // Статистика диалогов
  const stats = useMemo(() => {
    const totalDialogs = dialogs.length;
    const activeDialogs = dialogs.filter(d => d.is_taken_over !== 1 && d.auto_response).length;
    const takenOverDialogs = dialogs.filter(d => d.is_taken_over === 1).length;
    
    // Подсчет среднего времени ответа (заглушка)
    const avgResponse = '2.5 мин';
    
    return {
      totalDialogs,
      activeDialogs,
      takenOverDialogs,
      avgResponse
    };
  }, [dialogs]);

  return {
    filteredAndSortedDialogs,
    stats,
    filterByTime,
    filterByStatus,
    sortDialogs
  };
};