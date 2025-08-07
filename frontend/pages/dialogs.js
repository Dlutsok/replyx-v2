import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FiRefreshCw } from 'react-icons/fi';

// Layout and UI Components
// DashboardLayout уже подключается на уровне приложения
import DialogModal from '../components/dialogs/DialogModal';

// Dialog Components
import DialogStats from '../components/dialogs/DialogStats';
import DialogControls from '../components/dialogs/DialogControls';
import ChatWidgetGrid from '../components/dialogs/ChatWidgetGrid';
import FiltersPanel from '../components/dialogs/FiltersPanel';

// Hooks
import { useDialogSync } from '../hooks/useDialogSync';
import { useDialogsFilterSort } from '../hooks/useDialogsFilterSort';
import { useDialogMemoization } from '../hooks/useDialogMemoization';

// Constants
import { STATUS_ALL, TIME_ALL, VIEW_TABLE } from '../constants/dialogStatus';

// Styles
import styles from '../styles/pages/Dialogs.module.css';

export default function Dialogs() {
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
  const [viewMode, setViewMode] = useState(VIEW_TABLE);

  // Data sync hook
  const {
    dialogs,
    bots,
    channels,
    loading,
    error,
    wsConnected,
    lastUpdate,
    loadData,
    takeoverDialog,
    releaseDialog
  } = useDialogSync({ enabled: true, interval: 30000 });

  // Memoization hook for performance
  const {
    getAssistantName,
    getAssistantPlatform,
    getDialogCountForBot,
    dialogStatusCounts
  } = useDialogMemoization(dialogs, bots);

  // Filter and sort hook
  const { filteredAndSortedDialogs, stats } = useDialogsFilterSort({
    dialogs,
    bots,
    searchQuery,
    selectedChannel,
    selectedBot,
    timeFilter,
    statusFilter,
    sortBy,
    sortOrder
  });

  // Event handlers
  const handleStatClick = useCallback((statType) => {
    if (statType === 'all') {
      setStatusFilter(STATUS_ALL);
    } else {
      setStatusFilter(statType);
    }
  }, []);

  const handleFiltersToggle = useCallback(() => {
    setFiltersOpen(!filtersOpen);
  }, [filtersOpen]);

  const openDialogModal = useCallback((dialog) => {
    setSelectedDialog(dialog);
    setModalOpen(true);
  }, []);

  const handleTakeover = useCallback(async (dialog) => {
    try {
      await takeoverDialog(dialog.id);
    } catch (err) {
      console.error('Error taking over dialog:', err);
    }
  }, [takeoverDialog]);

  const handleRelease = useCallback(async (dialog) => {
    try {
      await releaseDialog(dialog.id);
    } catch (err) {
      console.error('Error releasing dialog:', err);
    }
  }, [releaseDialog]);

  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter(STATUS_ALL);
    setTimeFilter(TIME_ALL);
    setSelectedChannel(null);
    setSelectedBot(null);
    setFiltersOpen(false);
  }, []);

  return (
    <>
      {/* Loading state */}
      {loading && (
        <div className={styles.loadingContainer}>
          <motion.div 
            className={styles.loadingSpinner}
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <FiRefreshCw />
          </motion.div>
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
          {/* Stats Panel */}
          <DialogStats 
            stats={stats}
            onStatClick={handleStatClick}
          />

          {/* Control Panel */}
          <DialogControls 
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onFiltersToggle={handleFiltersToggle}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            timeFilter={timeFilter}
            onTimeFilterChange={setTimeFilter}
            resultsCount={filteredAndSortedDialogs.length}
            filtersOpen={filtersOpen}
          />

          {/* Filters Panel */}
          <FiltersPanel 
            isOpen={filtersOpen}
            onClose={() => setFiltersOpen(false)}
            channels={channels}
            selectedChannel={selectedChannel}
            onChannelChange={(channel) => {
              setSelectedChannel(channel);
              if (channel) setSelectedBot(null);
            }}
            bots={bots}
            selectedBot={selectedBot}
            onBotChange={(bot) => {
              setSelectedBot(bot);
              if (bot) setSelectedChannel(null);
            }}
            dialogs={dialogs}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            onClearFilters={handleClearFilters}
          />

          {/* Dialogs Content */}
          <motion.div 
            className={styles.contentContainer}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <ChatWidgetGrid
              dialogs={filteredAndSortedDialogs}
              bots={bots}
              onDialogOpen={openDialogModal}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />
          </motion.div>
        </>
      )}

      {/* Dialog Modal */}
      <DialogModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        dialogId={selectedDialog?.id}
        initialDialog={selectedDialog}
      />
    </>
  );
}