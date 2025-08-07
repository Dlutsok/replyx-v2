import { motion } from 'framer-motion';
import { FiSearch, FiFilter, FiCheckCircle, FiUserCheck } from 'react-icons/fi';
import styles from '../../styles/pages/Dialogs.module.css';
import { TIME_OPTIONS, QUICK_STATUS_OPTIONS } from '../../constants/dialogStatus';

const DialogControls = ({ 
  searchQuery, 
  onSearchChange, 
  onFiltersToggle, 
  statusFilter, 
  onStatusFilterChange,
  timeFilter,
  onTimeFilterChange,
  resultsCount,
  filtersOpen 
}) => {

  return (
    <div className={styles.mainControlPanel}>
      <div className={styles.leftControls}>
        {/* Search Bar */}
        <div className={styles.searchContainer}>
          <FiSearch className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Поиск по имени, email, теме..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        
        {/* Advanced Filters Toggle */}
        <button 
          className={`${styles.filtersToggleBtn} ${filtersOpen ? styles.active : ''}`}
          onClick={onFiltersToggle}
        >
          <FiFilter />
          Фильтры
        </button>
      </div>
      
      <div className={styles.rightControls}>
        {/* Time Filter */}
        <div className={styles.timeFilterDropdown}>
          <select 
            className={styles.timeSelect}
            value={timeFilter}
            onChange={(e) => onTimeFilterChange(e.target.value)}
          >
            {TIME_OPTIONS.map(option => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        
        {/* Quick Status Filters */}
        <div className={styles.quickStatusFilters}>
          {QUICK_STATUS_OPTIONS.map(option => {
            const Icon = option.key === 'active' ? FiCheckCircle : FiUserCheck;
            return (
              <motion.button
                key={option.key}
                className={`${styles.quickFilterBtn} ${statusFilter === option.key ? styles.active : ''}`}
                onClick={() => onStatusFilterChange(statusFilter === option.key ? 'all' : option.key)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title={option.label}
              >
                <Icon />
              </motion.button>
            );
          })}
        </div>
        
        {/* Results Count */}
        <div className={styles.resultsCount}>
          {resultsCount} диалогов
        </div>
      </div>
    </div>
  );
};

export default DialogControls;