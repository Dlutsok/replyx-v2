import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiSearch, FiFilter, FiCheckCircle, FiUserCheck, FiHeadphones, FiUser } from 'react-icons/fi';
import { Tooltip } from 'react-tooltip';
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
  filtersOpen
}) => {

  return (
    <>
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
          aria-label={filtersOpen ? 'Закрыть расширенные фильтры' : 'Открыть расширенные фильтры'}
          aria-expanded={filtersOpen}
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
        
        {/* Контейнер для кнопок фильтра с простыми title tooltip'ами */}
        <div className={styles.quickStatusFilters}>
          {QUICK_STATUS_OPTIONS.map((option, index) => {
            // Маппинг иконок по ключам статусов
            const iconMap = {
              'active': FiCheckCircle,
              'taken_over': FiUserCheck,
              'handoff_requested': FiHeadphones,
              'handoff_active': FiUser
            };

            const Icon = iconMap[option.key] || FiCheckCircle;

            // Описания для tooltip'ов
            const tooltipDescriptions = {
              'active': 'Показать активные диалоги с авто-ответом',
              'taken_over': 'Показать диалоги, перехваченные операторами',
              'handoff_requested': 'Показать диалоги, требующие вмешательства оператора',
              'handoff_active': 'Показать диалоги, обрабатываемые операторами'
            };

            return (
              <motion.button
                key={option.key}
                className={`${styles.quickFilterBtn} ${statusFilter === option.key ? styles.active : ''}`}
                onClick={() => onStatusFilterChange(statusFilter === option.key ? 'all' : option.key)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                data-tooltip-id={`filter-tooltip-${option.key}`}
                data-tooltip-content={tooltipDescriptions[option.key] || option.label}
                aria-label={option.label}
                aria-pressed={statusFilter === option.key}
              >
                <Icon />
              </motion.button>
            );
          })}
        </div>

      </div>
      </div>

      {/* Tooltip'ы для кнопок фильтров */}
      {QUICK_STATUS_OPTIONS.map((option) => (
        <Tooltip
          key={`tooltip-${option.key}`}
          id={`filter-tooltip-${option.key}`}
          place="top"
          style={{
            backgroundColor: '#1f2937',
            color: 'white',
            fontSize: '12px',
            borderRadius: '6px',
            padding: '8px 12px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 10000
          }}
        />
      ))}
    </>
  );
};

export default DialogControls;