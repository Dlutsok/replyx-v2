import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiRefreshCw, FiMessageSquare, FiStar, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

// Layout and UI Components
// DashboardLayout уже подключается на уровне приложения
import DialogModal from '../components/dialogs/DialogModal';

// Dialog Components
import DialogControls from '../components/dialogs/DialogControls';
import ChatWidgetGrid from '../components/dialogs/ChatWidgetGrid';
import FiltersPanel from '../components/dialogs/FiltersPanel';
import HandoffQueue from '../components/dashboard/HandoffQueue';

// Hooks
import { useDialogSync } from '../hooks/useDialogSync';
import { useDialogMemoization } from '../hooks/useDialogMemoization';

// Constants
import { STATUS_ALL, TIME_ALL, STATUS_HANDOFF_REQUESTED, STATUS_HANDOFF_ACTIVE } from '../constants/dialogStatus';

// Styles
import styles from '../styles/pages/Dialogs.module.css';
import dashStyles from '../styles/pages/Dashboard.module.css';

export default function Dialogs() {
  // Принудительная перезагрузка стилей при маунте компонента
  useEffect(() => {
    // Принудительная перерисовка для загрузки CSS модулей
    const forceRerender = () => {
      if (typeof window !== 'undefined' && document.body) {
        document.body.style.display = 'none';
        document.body.offsetHeight; // Force reflow
        document.body.style.display = '';
      }
    };
    
    // Небольшая задержка для завершения загрузки стилей
    const timeout = setTimeout(forceRerender, 10);
    return () => clearTimeout(timeout);
  }, []);

  // UI State
  const [selectedDialog, setSelectedDialog] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState(TIME_ALL);
  const [statusFilter, setStatusFilter] = useState(STATUS_ALL);
  const [sortBy, setSortBy] = useState('time');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [selectedBot, setSelectedBot] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Создаем объект фильтров
  const filters = useMemo(() => ({
    search: searchQuery || '',
    status: statusFilter || 'all',
    channel: selectedChannel || null,
    assistant_id: selectedBot || null,
    time_filter: timeFilter || 'all'
  }), [searchQuery, statusFilter, selectedChannel, selectedBot, timeFilter]);
  

  // Data sync hook
  const {
    dialogs,
    allDialogs, // Все диалоги без фильтров (для HandoffQueue)
    handoffDialogs, // Диалоги в очереди handoff (независимо от фильтров)
    bots,
    channels,
    loading,
    error,
    wsConnected,
    lastUpdate,
    loadData,
    loadMoreDialogs,
    loadMoreLoading,
    goToPage,
    resetPagination,
    takeoverDialog,
    releaseDialog,
    cancelHandoff,
    currentPage,
    totalDialogs,
    pageSize,
    totalPages,
    hasNextPage,
    hasPrevPage
  } = useDialogSync({ enabled: true, interval: 300000, filters }); // Увеличен интервал до 5 минут

  // Memoization hook for performance
  const {
    getAssistantName,
    getAssistantPlatform,
    getDialogCountForBot,
    dialogStatusCounts
  } = useDialogMemoization(dialogs, bots);

  // Диалоги уже отфильтрованы и отсортированы на сервере, используем их как есть
  const filteredAndSortedDialogs = dialogs;

  // Event handlers
  // Статистический блок удалён

  const handleFiltersToggle = useCallback(() => {
    setFiltersOpen(!filtersOpen);
  }, [filtersOpen]);

  const openDialogModal = useCallback((dialog) => {
    setSelectedDialog(dialog);
    setModalOpen(true);
  }, []);

  const handleTakeover = useCallback(async (dialogOrId) => {
    try {
      const dialogId = typeof dialogOrId === 'object' ? dialogOrId.id : dialogOrId;
      await takeoverDialog(dialogId);
      
      // Автоматически открываем диалог после успешного takeover
      const dialog = dialogs.find(d => d.id === dialogId);
      if (dialog) {
        openDialogModal(dialog);
      }
    } catch (err) {
      // Error handling without console log
    }
  }, [takeoverDialog, dialogs, openDialogModal]);

  const handleRelease = useCallback(async (dialog) => {
    try {
      await releaseDialog(dialog.id);
    } catch (err) {
      // Error handling without console log
    }
  }, [releaseDialog]);

  const handleCancel = useCallback(async (dialogId) => {
    try {
      await cancelHandoff(dialogId);
    } catch (err) {
      // Error handling without console log
    }
  }, [cancelHandoff]);

  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter(STATUS_ALL);
    setTimeFilter(TIME_ALL);
    setSelectedChannel(null);
    setSelectedBot(null);
    setFiltersOpen(false);
  }, []);

  return (
    <div className="bg-white px-4 sm:px-6 xl:px-8 pt-4 sm:pt-6 xl:pt-8 pb-4 sm:pb-6 xl:pb-8 rounded-2xl min-h-[90vh] flex flex-col">
      {/* Заголовок раздела - унифицированный стиль dashboard */}
      <div className={dashStyles.welcomeSection}>
        <div className={dashStyles.welcomeContent}>
          <div className={dashStyles.avatarSection}>
            <div className={dashStyles.avatar}>
              <FiMessageSquare size={28} />
            </div>
            <div className={dashStyles.userInfo}>
              <h1 className={dashStyles.welcomeTitle}>Диалоги</h1>
              <p className={dashStyles.welcomeSubtitle}>
                Управление диалогами и чатами
              </p>
            </div>
          </div>
          
          <div className={dashStyles.badge}>
            <FiStar size={16} />
            <span>{totalDialogs > 0 ? totalDialogs : filteredAndSortedDialogs.length} диалогов</span>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}>
            <FiRefreshCw />
          </div>
          <p>Загрузка диалогов...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className={styles.error}>
          <p>{error}</p>
          <button onClick={loadData} className={styles.retryBtn}>
            Повторить
          </button>
        </div>
      )}

      {/* Main content */}
      {!loading && !error && (
        <>
          {/* Handoff Queue - показываем если есть диалоги, ожидающие оператора */}
          {handoffDialogs.length > 0 ? (
              <div style={{ marginBottom: '24px' }}>
                <HandoffQueue
                  dialogs={handoffDialogs}
                  onTakeDialog={handleTakeover}
                  onCancel={handleCancel}
                  isLoading={loading}
                />
              </div>
            ) : null}

          <DialogControls 
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onFiltersToggle={handleFiltersToggle}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            timeFilter={timeFilter}
            onTimeFilterChange={setTimeFilter}

            filtersOpen={filtersOpen}
          />

          <FiltersPanel 
            isOpen={filtersOpen}
            onClose={() => setFiltersOpen(false)}
            channels={channels}
            selectedChannel={selectedChannel}
            onChannelChange={(channelType) => {
              setSelectedChannel(channelType);
              if (channelType) setSelectedBot(null);
            }}
            bots={bots}
            selectedBot={selectedBot}
            onBotChange={(assistantId) => {
              setSelectedBot(assistantId);
              if (assistantId) setSelectedChannel(null);
            }}
            dialogs={dialogs}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            onClearFilters={handleClearFilters}
          />

          <div className={styles.contentContainer}>
            <ChatWidgetGrid
              dialogs={filteredAndSortedDialogs}
              bots={bots}
              onDialogOpen={openDialogModal}
            />
            
            {/* Load More button */}
            {hasNextPage && (
              <div className={styles.loadMoreContainer}>
                <div className={styles.loadMoreInfo}>
                  Показано {dialogs.length} из {totalDialogs} диалогов
                </div>
                
                <button
                  className={`${styles.loadMoreBtn} ${loadMoreLoading ? styles.loading : ''}`}
                  onClick={loadMoreDialogs}
                  disabled={loadMoreLoading}
                >
                  {loadMoreLoading ? (
                    <>
                      <div className={styles.loadingSpinner}>
                        <FiRefreshCw />
                      </div>
                      Загрузка...
                    </>
                  ) : (
                    <>
                      <FiChevronRight />
                      Загрузить ещё диалоги
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </>
      )}

      <DialogModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        dialogId={selectedDialog?.id}
        initialDialog={selectedDialog}
      />
    </div>
  );
}