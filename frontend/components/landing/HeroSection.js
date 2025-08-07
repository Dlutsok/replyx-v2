'use client';

import { motion } from 'framer-motion';
import HeroContent from './HeroContent';
import HeroImage from './HeroImage';
import { DESIGN_TOKENS } from '../../constants/designSystem';

const HeroSection = () => {
  return (
    <section className="min-h-screen bg-white flex items-center py-12">
      <div className={`${DESIGN_TOKENS.spacing.maxWidth} ${DESIGN_TOKENS.spacing.containerPadding} w-full`}>
        <div className={`grid grid-cols-1 lg:grid-cols-2 ${DESIGN_TOKENS.spacing.gridGap} lg:gap-8 items-center`}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <HeroContent />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
            className="order-first lg:order-last"
          >
            <HeroImage />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;