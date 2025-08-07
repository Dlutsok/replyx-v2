import { useState } from 'react';

export function useModalState() {
  const [modals, setModals] = useState({
    showBotModal: false,
    showIntegrationsModal: false,
    showWebsiteSetupWizard: false,
    showWidgetSettings: false,
    showDeleteAssistantModal: false,
    showDeleteBotModal: false,
    showQuickWizard: false
  });

  const [modalData, setModalData] = useState({
    editingBot: null,
    assistantToDelete: null,
    botToDelete: null,
    isNewAssistantWidget: false
  });

  const openModal = (modalName, data = {}) => {
    setModals(prev => ({ ...prev, [modalName]: true }));
    if (Object.keys(data).length > 0) {
      setModalData(prev => ({ ...prev, ...data }));
    }
  };

  const closeModal = (modalName) => {
    setModals(prev => ({ ...prev, [modalName]: false }));
    // Очищаем данные модала при закрытии
    if (modalName === 'showDeleteAssistantModal') {
      setModalData(prev => ({ ...prev, assistantToDelete: null }));
    } else if (modalName === 'showDeleteBotModal') {
      setModalData(prev => ({ ...prev, botToDelete: null }));
    } else if (modalName === 'showBotModal') {
      setModalData(prev => ({ ...prev, editingBot: null }));
    } else if (modalName === 'showWidgetSettings') {
      setModalData(prev => ({ ...prev, isNewAssistantWidget: false }));
    }
  };

  const closeAllModals = () => {
    setModals({
      showBotModal: false,
      showIntegrationsModal: false,
      showWebsiteSetupWizard: false,
      showWidgetSettings: false,
      showDeleteAssistantModal: false,
      showDeleteBotModal: false,
      showQuickWizard: false
    });
    setModalData({
      editingBot: null,
      assistantToDelete: null,
      botToDelete: null,
      isNewAssistantWidget: false
    });
  };

  return {
    modals,
    modalData,
    openModal,
    closeModal,
    closeAllModals
  };
}