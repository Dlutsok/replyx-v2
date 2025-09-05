'use client';

import { motion } from 'framer-motion';
import HeroContent from './HeroContent';
import HeroWidget from './HeroWidget';
import { DESIGN_TOKENS } from '../../constants/designSystem';

const HeroSection = () => {
  return (
    <section className="relative h-[680px] md:h-[720px] lg:h-[760px] flex items-center overflow-hidden">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-white to-purple-50/30 pointer-events-none" />
      <div className={`${DESIGN_TOKENS.spacing.maxWidth} ${DESIGN_TOKENS.spacing.containerPadding} w-full relative`} style={{maxWidth: '1200px', margin: '0 auto'}}>
        <div className={`grid grid-cols-1 lg:grid-cols-5 ${DESIGN_TOKENS.spacing.gridGap} lg:gap-10 items-center`}>
          <motion.div {...DESIGN_TOKENS.animation.default} className="lg:col-span-3">
            <HeroContent />
          </motion.div>

          <motion.div
            {...DESIGN_TOKENS.animation.withDelay(0.15)}
            className="hidden md:block order-first lg:order-last lg:col-span-2"
          >
            <HeroWidget />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;