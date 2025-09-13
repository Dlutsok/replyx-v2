import { useState } from 'react';
import { motion } from 'framer-motion';
import { LoadingIndicator } from '@/components/common/LoadingComponents';
import { 
  FiSave, FiSettings, FiToggleLeft, FiToggleRight
} from 'react-icons/fi';

export default function SettingsTab({ 
  assistant,
  assistantSettings, 
  onSettingsChange, 
  onSaveSettings, 
  saving 
}) {
  const [dirty, setDirty] = useState(false);

  const handleChange = (field, value) => {
    onSettingsChange(field, value);
    setDirty(true);
  };

  const handleSave = async () => {
    await onSaveSettings();
    setDirty(false);
  };

  const aiModels = [
    { value: 'gpt-4o', label: 'GPT-4o (рекомендуется)', description: 'Самая современная модель OpenAI' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini', description: 'Быстрая и экономичная версия' },
    { value: 'gpt-4', label: 'GPT-4', description: 'Предыдущая версия, стабильная' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        {dirty && (
          <div className="text-sm text-amber-600 bg-amber-50 px-4 py-2 rounded-2xl border border-solid border-amber-200/60">
            Есть несохранённые изменения
          </div>
        )}
      </div>

      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-solid border-gray-200/60 space-y-6">
        {/* Основные настройки */}
        <div>
          <h4 className="text-md font-semibold text-gray-900 mb-4">Основные настройки</h4>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Название ассистента
              </label>
              <input
                type="text"
                value={assistantSettings.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Введите название..."
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-solid border-gray-200/60 rounded-2xl focus:ring-2 focus:ring-[#6334E5] focus:border-[#6334E5] transition-all duration-150 bg-white text-sm sm:text-base"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Описание
              </label>
              <textarea
                value={assistantSettings.description || ''}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Описание ассистента..."
                rows={3}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-solid border-gray-200/60 rounded-2xl focus:ring-2 focus:ring-[#6334E5] focus:border-[#6334E5] transition-all duration-150 bg-white resize-none text-sm sm:text-base"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Модель AI
              </label>
              <select
                value={assistantSettings.ai_model || 'gpt-4o-mini'}
                onChange={(e) => handleChange('ai_model', e.target.value)}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-solid border-gray-200/60 rounded-2xl focus:ring-2 focus:ring-[#6334E5] focus:border-[#6334E5] transition-all duration-150 bg-white text-sm sm:text-base"
              >
                {aiModels.map(model => (
                  <option key={model.value} value={model.value}>
                    {model.label}
                  </option>
                ))}
              </select>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                {aiModels.find(m => m.value === (assistantSettings.ai_model || 'gpt-4o-mini'))?.description}
              </p>
            </div>

            <div>
              <label className="flex items-center gap-3">
                <div
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    assistantSettings.is_active ? 'bg-[#6334E5]' : 'bg-gray-200'
                  }`}
                  onClick={() => handleChange('is_active', !assistantSettings.is_active)}
                >
                  <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                    assistantSettings.is_active ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </div>
                <span className="text-sm font-medium text-gray-600">
                  Активировать ассистента
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Системный промпт */}
        <div>
          <h4 className="text-md font-semibold text-gray-900 mb-4">Поведение ассистента</h4>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              Инструкция ассистенту (системное сообщение)
            </label>
            <textarea
              value={assistantSettings.system_prompt || ''}
              onChange={(e) => handleChange('system_prompt', e.target.value)}
              placeholder="Вы полезный AI-ассистент, который помогает пользователям с их вопросами..."
              rows={6}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-solid border-gray-200/60 rounded-2xl focus:ring-2 focus:ring-[#6334E5] focus:border-[#6334E5] transition-all duration-150 bg-white font-mono text-xs sm:text-sm resize-none"
            />
            <p className="text-xs sm:text-sm text-gray-500 mt-2">
              Это сообщение определяет, как ассистент будет себя вести и отвечать на вопросы.
              Будьте конкретными в инструкциях.
            </p>
          </div>
        </div>

        {/* Дополнительные настройки */}
        <div>
          <h4 className="text-md font-semibold text-gray-900 mb-4">Дополнительные настройки</h4>

          <div className="space-y-4">
            <div className="p-3 sm:p-4 rounded-2xl bg-gray-50/50 border border-solid border-gray-200/40 hover:bg-gray-50 hover:border-gray-200/60 transition-all duration-150">
              <label className="flex items-center justify-between">
                <div className="flex-1 mr-3">
                  <span className="text-sm font-medium text-gray-700">Интеграция с сайтом</span>
                  <p className="text-xs sm:text-sm text-gray-500">Разрешить использование в веб-виджете</p>
                </div>
                <div
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    assistantSettings.website_integration_enabled ? 'bg-[#6334E5]' : 'bg-gray-200'
                  }`}
                  onClick={() => handleChange('website_integration_enabled', !assistantSettings.website_integration_enabled)}
                >
                  <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                    assistantSettings.website_integration_enabled ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </div>
              </label>
            </div>

            <div className="p-3 sm:p-4 rounded-2xl bg-gray-50/50 border border-solid border-gray-200/40 hover:bg-gray-50 hover:border-gray-200/60 transition-all duration-150">
              <label className="flex items-center justify-between">
                <div className="flex-1 mr-3">
                  <span className="text-sm font-medium text-gray-700">Логирование диалогов</span>
                  <p className="text-xs sm:text-sm text-gray-500">Сохранять историю разговоров для аналитики</p>
                </div>
                <div
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    assistantSettings.enable_logging !== false ? 'bg-[#6334E5]' : 'bg-gray-200'
                  }`}
                  onClick={() => handleChange('enable_logging', !(assistantSettings.enable_logging !== false))}
                >
                  <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                    assistantSettings.enable_logging !== false ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Информация */}
        <div className="bg-gray-50/50 p-3 sm:p-4 rounded-2xl border border-solid border-gray-200/60">
          <h5 className="text-sm font-semibold text-gray-700 mb-2">Информация</h5>
          <div className="text-xs sm:text-sm text-gray-600 space-y-1">
            <p><strong>Создан:</strong> {assistant?.created_at ? new Date(assistant.created_at).toLocaleString('ru-RU') : 'Неизвестно'}</p>
            <p><strong>Обновлен:</strong> {assistant?.updated_at ? new Date(assistant.updated_at).toLocaleString('ru-RU') : 'Неизвестно'}</p>
            <p className="break-all"><strong>ID:</strong> {assistant?.id || 'Неизвестно'}</p>
          </div>
        </div>

        {/* Кнопка сохранения */}
        <div className="pt-4 border-t border-solid border-gray-200/60">
          <motion.button
            whileHover={{ scale: dirty && !saving ? 1.02 : 1 }}
            whileTap={{ scale: dirty && !saving ? 0.98 : 1 }}
            className={`w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 rounded-2xl font-medium flex items-center justify-center gap-2 transition-all duration-150 text-sm sm:text-base ${
              saving || !dirty
                ? 'bg-gray-50 text-gray-500 cursor-not-allowed border border-solid border-gray-200/60'
                : 'bg-[#6334E5] text-white hover:bg-[#5028c2] border border-solid border-[#6334E5]'
            }`}
            onClick={handleSave}
            disabled={saving || !dirty}
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Сохранение...
              </>
            ) : (
              <>
                <FiSave size={16} />
                {dirty ? 'Сохранить настройки' : 'Нет изменений'}
              </>
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
}