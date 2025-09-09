import { useRouter } from 'next/router';
import {
  FiCpu,
  FiPlus
} from 'react-icons/fi';
import styles from '../../styles/pages/AISettings.module.css';




const AssistantCard = ({ assistant, onSelect, onEdit, onDelete }) => {
  const router = useRouter();
  
  const handleCardClick = () => {
    router.push(`/assistant/${assistant.id}`);
  };

  return (
    <div
      onClick={handleCardClick}
      className="bg-white rounded-xl border border-gray-200/50 p-3 sm:p-4 cursor-pointer hover:border-gray-300/70 transition-all duration-150 active:scale-95"
    >
    {/* Заголовок с иконкой и меню */}
    <div className="flex items-start justify-between mb-2 sm:mb-3">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        <div className="w-6 h-6 sm:w-7 sm:h-7 bg-[#6334E5]/20 rounded-lg flex items-center justify-center flex-shrink-0">
          <FiCpu className="text-[#6334E5]" size={14} />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm sm:text-base font-semibold text-gray-900 leading-tight truncate">
            {assistant.name}
          </h4>
          <p className="text-xs text-gray-500 mt-0.5 hidden sm:block">
            AI-ассистент
          </p>
        </div>
      </div>

    </div>

    {/* Статус */}
    <div className="mb-2 sm:mb-3">
      <span className={`inline-flex items-center px-1.5 sm:px-2 py-1 rounded-full text-xs font-medium ${
        assistant.is_active
          ? 'bg-green-100 text-green-600'
          : 'bg-gray-100 text-gray-600'
      }`}>
        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
          assistant.is_active ? 'bg-green-500' : 'bg-gray-400'
        }`} />
        {assistant.is_active ? 'Активен' : 'Неактивен'}
      </span>
    </div>

    {/* Техническая информация */}
    <div className="text-xs text-gray-400">
      <span className="hidden sm:inline">Модель: </span>
      <span className="text-gray-500">OpenAI</span>
    </div>
    </div>
  );
};

const CreateAssistantCard = ({ onCreate, creating, onQuickCreate }) => (
  <div
    onClick={onQuickCreate}
    className="bg-white rounded-xl border border-dashed border-gray-200/50 p-3 sm:p-4 cursor-pointer hover:border-gray-300/70 hover:bg-gray-50 transition-all duration-150 flex flex-col items-center justify-center text-center min-h-[100px] sm:min-h-[120px] active:scale-95"
  >
    {/* Иконка */}
    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gray-100 rounded-lg flex items-center justify-center mb-2 sm:mb-3">
      <FiPlus className="text-gray-500" size={16} />
    </div>

    {/* Заголовок */}
    <h4 className="text-sm sm:text-base font-semibold text-gray-900 leading-tight mb-1">
      {creating ? 'Создание…' : 'Новый ассистент'}
    </h4>

    {/* Описание */}
    <p className="text-xs text-gray-500 mb-2 sm:mb-3 hidden sm:block">
      Нажмите, чтобы добавить
    </p>

    {/* Индикатор загрузки */}
    {creating && (
      <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
        <div className="w-3 h-3 border border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
        <span className="hidden sm:inline">Создание...</span>
        <span className="sm:hidden">...</span>
      </div>
    )}
  </div>
);


export default function AssistantsList({ 
  assistants, 
  onSelectAssistant, 
  onEditAssistant, 
  onDeleteAssistant,
  onCreateAssistant,
  onQuickCreateAssistant,
  creating,
  totalDialogs
}) {
  // Toolbar with search/new button removed to avoid duplicate functionality

  return (
    <div>
      {/* Заголовок секции */}
      <div className="mb-4 sm:mb-6">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">
          Ваши ассистенты
        </h2>
        <p className="text-xs sm:text-sm text-gray-500">
          Всего: {assistants.length}
        </p>
      </div>

      {/* Сетка ассистентов */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        <CreateAssistantCard
          onCreate={onCreateAssistant}
          creating={creating}
          onQuickCreate={onQuickCreateAssistant}
        />

        {assistants.map(assistant => (
          <AssistantCard
            key={assistant.id}
            assistant={assistant}
            onSelect={onSelectAssistant}
            onEdit={onEditAssistant}
            onDelete={onDeleteAssistant}
          />
        ))}
      </div>
    </div>
  );
}