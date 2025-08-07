'use client';

import { motion } from 'framer-motion';

const ComparisonColumn = ({ title, items, isPositive = false, delay = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ 
        duration: 0.6, 
        delay: delay,
        ease: "easeOut" 
      }}
      whileHover={{ scale: 1.02 }}
      className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm hover:shadow-md transition-all duration-300"
    >
      {/* Заголовок колонки */}
      <div className="mb-8">
        <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
          {title}
        </h3>
        <div className={`w-12 h-1 rounded-full ${
          isPositive ? 'bg-green-500' : 'bg-red-500'
        }`}></div>
      </div>

      {/* Табличное сравнение */}
      <div className="space-y-6">
        {items.map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ 
              duration: 0.4, 
              delay: delay + 0.1 * (index + 1)
            }}
            className="flex items-start space-x-4"
          >
            {/* Минималистичная иконка */}
            <div className="flex-shrink-0 w-6 h-6 mt-1">
              <item.icon className={`w-6 h-6 ${
                isPositive ? 'text-purple-600' : 'text-gray-500'
              }`} />
            </div>

            {/* Контент */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-lg font-semibold text-gray-900">
                  {item.label}
                </h4>
              </div>
              <p className={`text-base font-semibold ${
                isPositive ? 'text-green-600' : 'text-red-600'
              }`}>
                {item.value}
              </p>
              {item.description && (
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  {item.description}
                </p>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default ComparisonColumn;