'use client';

import { useRouter } from 'next/router';
import { FiZap } from 'react-icons/fi';
import { motion } from 'framer-motion';
import SectionWrapper from '../common/SectionWrapper';
import Button from '../common/Button';
import { DESIGN_TOKENS } from '../../constants/designSystem';

export default function MiniCTASection({
  title = 'Запустите AI‑ассистента за 5 минут',
  subtitle = '7 дней бесплатно, без ограничений',
  primaryText = 'Начать бесплатно',
  secondaryText = 'Смотреть демо'
}) {
  const router = useRouter();

  return (
    <SectionWrapper bg="white" className="pb-20">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="rounded-xl px-4 py-3 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-3 border border-[#6334E5]/20 bg-gradient-to-r from-[#6334E5]/10 via-white to-indigo-50"
      >
        <div className="min-w-0 flex items-start md:items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-white/80 ring-1 ring-[#6334E5]/30 text-[#6334E5] flex items-center justify-center flex-shrink-0">
            <FiZap size={16} />
          </div>
          <div>
            <div className="flex flex-col md:flex-row md:items-center md:gap-3">
              <h3 className={`${DESIGN_TOKENS.typography.h4} leading-tight text-gray-900`}>{title}</h3>
              <span className={`${DESIGN_TOKENS.typography.bodyText} text-gray-600 hidden md:inline`}>— {subtitle}</span>
            </div>
            <p className={`${DESIGN_TOKENS.typography.bodyText} text-gray-600 mt-0.5 md:hidden`}>{subtitle}</p>
          </div>
        </div>

        <div className="flex w-full sm:w-auto md:items-center">
          <button 
            onClick={() => router.push('/register')}
            className="relative overflow-hidden new-button-effect bg-[#6334E5] hover:bg-primary-700 text-white px-6 sm:px-8 xl:px-6 py-3 sm:py-4 xl:py-3 font-semibold rounded-[0.9rem] transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-[#6334E5]/20 h-12 sm:h-14 xl:h-12 w-full sm:w-auto text-base sm:text-lg xl:text-base"
            style={{transform: 'none'}}
          >
            <span className="absolute inset-0 z-0 animate-wave-gradient bg-gradient-to-r from-[#6334E5] via-[#7C3AED] to-[#6334E5]"></span>
            <span className="relative z-10 flex items-center gap-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
              </svg>
              {primaryText}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </span>
          </button>
        </div>
      </motion.div>
    </SectionWrapper>
  );
}


