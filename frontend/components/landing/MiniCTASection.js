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
          <Button className="w-full sm:w-auto" variant="primary" onClick={() => router.push('/register')}>
            {primaryText}
          </Button>
        </div>
      </motion.div>
    </SectionWrapper>
  );
}


