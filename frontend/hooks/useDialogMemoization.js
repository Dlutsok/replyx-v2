import { useMemo } from 'react';

/**
 * Хук для мемоизации карт и оптимизации производительности
 */
export const useDialogMemoization = (dialogs = [], bots = []) => {
  
  // Мемоизированная карта assistant_id -> bot name
  const assistantIdToNameMap = useMemo(() => {
    const map = new Map();
    bots.forEach(bot => {
      map.set(bot.assistant_id, bot.assistant_name);
    });
    return map;
  }, [bots]);

  // Мемоизированная карта assistant_id -> platform
  const assistantIdToPlatformMap = useMemo(() => {
    const map = new Map();
    bots.forEach(bot => {
      map.set(bot.assistant_id, bot.platform);
    });
    return map;
  }, [bots]);

  // Мемоизированная карта bot_id -> assistant_id
  const botIdToAssistantIdMap = useMemo(() => {
    const map = new Map();
    bots.forEach(bot => {
      map.set(bot.id, bot.assistant_id);
    });
    return map;
  }, [bots]);

  // Мемоизированный подсчет диалогов по ботам
  const dialogCountPerBotId = useMemo(() => {
    const counts = new Map();
    
    // Инициализируем нулями
    bots.forEach(bot => {
      counts.set(bot.id, 0);
    });
    
    // Подсчитываем реальные значения
    dialogs.forEach(dialog => {
      if (dialog.assistant_id) {
        const bot = bots.find(b => b.assistant_id === dialog.assistant_id);
        if (bot) {
          counts.set(bot.id, (counts.get(bot.id) || 0) + 1);
        }
      }
    });
    
    return counts;
  }, [dialogs, bots]);

  // Мемоизированный подсчет диалогов по assistant_id
  const dialogCountPerAssistantId = useMemo(() => {
    const counts = new Map();
    
    dialogs.forEach(dialog => {
      if (dialog.assistant_id) {
        counts.set(dialog.assistant_id, (counts.get(dialog.assistant_id) || 0) + 1);
      }
    });
    
    return counts;
  }, [dialogs]);

  // Мемоизированная карта статусов диалогов
  const dialogStatusCounts = useMemo(() => {
    const counts = {
      total: dialogs.length,
      active: 0,
      takenOver: 0,
      inactive: 0
    };

    dialogs.forEach(dialog => {
      if (dialog.is_taken_over === 1) {
        counts.takenOver++;
      } else if (dialog.auto_response) {
        counts.active++;
      } else {
        counts.inactive++;
      }
    });

    return counts;
  }, [dialogs]);

  // Мемоизированная карта типов каналов
  const channelTypeCounts = useMemo(() => {
    const counts = new Map();
    
    dialogs.forEach(dialog => {
      let channelType = 'unknown';
      if (dialog.telegram_username || dialog.telegram_chat_id || dialog.first_name || dialog.last_name) {
        channelType = 'telegram';
      } else if (dialog.guest_id) {
        channelType = 'website';
      }
      
      counts.set(channelType, (counts.get(channelType) || 0) + 1);
    });
    
    return counts;
  }, [dialogs]);

  // Быстрые функции-геттеры использующие мемоизированные карты
  const getAssistantName = (assistantId) => {
    return assistantIdToNameMap.get(assistantId) || 'Неизвестный ассистент';
  };

  const getAssistantPlatform = (assistantId) => {
    return assistantIdToPlatformMap.get(assistantId) || 'unknown';
  };

  const getDialogCountForBot = (botId) => {
    return dialogCountPerBotId.get(botId) || 0;
  };

  const getDialogCountForAssistant = (assistantId) => {
    return dialogCountPerAssistantId.get(assistantId) || 0;
  };

  const getChannelTypeCount = (channelType) => {
    return channelTypeCounts.get(channelType) || 0;
  };

  return {
    // Maps
    assistantIdToNameMap,
    assistantIdToPlatformMap,
    botIdToAssistantIdMap,
    dialogCountPerBotId,
    dialogCountPerAssistantId,
    
    // Counts
    dialogStatusCounts,
    channelTypeCounts,
    
    // Getter functions
    getAssistantName,
    getAssistantPlatform,
    getDialogCountForBot,
    getDialogCountForAssistant,
    getChannelTypeCount
  };
};