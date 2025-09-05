'use client';

import { motion } from 'framer-motion';
import { DESIGN_TOKENS, combineClasses } from '../../constants/designSystem';

const SectionWrapper = ({ 
  children, 
  bg = 'sectionBg', 
  className = '',
  animationDelay = 0,
  ...props 
}) => {
  // Получаем цвет фона из токенов
  const backgroundClass = bg === 'white' ? 'bg-white' : DESIGN_TOKENS.colors[bg] || DESIGN_TOKENS.colors.sectionBg;

  return (
    <motion.section
      className={combineClasses(
        DESIGN_TOKENS.spacing.sectionPadding,
        backgroundClass,
        className
      )}
      {...DESIGN_TOKENS.animation.default}
      transition={{ 
        ...DESIGN_TOKENS.animation.default.transition, 
        delay: animationDelay 
      }}
      {...props}
    >
      <div 
        className={combineClasses(
          DESIGN_TOKENS.spacing.maxWidth,
          DESIGN_TOKENS.spacing.containerPadding
        )}
        style={{maxWidth: '1200px', margin: '0 auto'}}
      >
        {children}
      </div>
    </motion.section>
  );
};

// Компонент заголовка секции
const SectionHeader = ({ 
  title, 
  subtitle, 
  className = '',
  animationDelay = 0 
}) => {
  return (
    <motion.div
      className={combineClasses(
        'text-left', 
        DESIGN_TOKENS.spacing.sectionMb, 
        className
      )}
      {...DESIGN_TOKENS.animation.default}
      transition={{ 
        ...DESIGN_TOKENS.animation.default.transition, 
        delay: animationDelay 
      }}
    >
      <h2 className={DESIGN_TOKENS.typography.h2}>
        {title}
      </h2>
      {subtitle && (
        <p className={combineClasses(
          DESIGN_TOKENS.typography.sectionSubtitle, 
          'mt-4'
        )}>
          {subtitle}
        </p>
      )}
    </motion.div>
  );
};

SectionWrapper.Header = SectionHeader;

export default SectionWrapper;