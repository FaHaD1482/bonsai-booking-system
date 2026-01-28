import React, { createContext, useState, ReactNode } from 'react';
import Modal from '../components/Modal';

interface ModalState {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'alert' | 'confirm' | 'success' | 'error';
  showCancel: boolean;
  okText: string;
  cancelText: string;
  onOk?: () => void;
  onCancel?: () => void;
}

interface ModalContextType {
  modal: ModalState;
  showAlert: (title: string, message: string, type?: 'alert' | 'success' | 'error', onOk?: () => void) => void;
  showConfirm: (title: string, message: string, onOk: () => void, onCancel?: () => void) => void;
  closeModal: () => void;
  handleOk: () => void;
  handleCancel: () => void;
}

export const ModalContext = createContext<ModalContextType | undefined>(undefined);

interface ModalProviderProps {
  children: ReactNode;
}

export const ModalProvider: React.FC<ModalProviderProps> = ({ children }) => {
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    title: '',
    message: '',
    type: 'alert',
    showCancel: false,
    okText: 'OK',
    cancelText: 'Cancel',
  });

  const showAlert = (
    title: string,
    message: string,
    type: 'alert' | 'success' | 'error' = 'alert',
    onOk?: () => void
  ) => {
    setModal({
      isOpen: true,
      title,
      message,
      type,
      showCancel: false,
      okText: 'OK',
      cancelText: 'Cancel',
      onOk,
    });
  };

  const showConfirm = (
    title: string,
    message: string,
    onOk: () => void,
    onCancel?: () => void
  ) => {
    setModal({
      isOpen: true,
      title,
      message,
      type: 'confirm',
      showCancel: true,
      okText: 'OK',
      cancelText: 'Cancel',
      onOk,
      onCancel,
    });
  };

  const closeModal = () => {
    setModal({ ...modal, isOpen: false });
  };

  const handleOk = () => {
    modal.onOk?.();
    closeModal();
  };

  const handleCancel = () => {
    modal.onCancel?.();
    closeModal();
  };

  return (
    <ModalContext.Provider value={{ modal, showAlert, showConfirm, closeModal, handleOk, handleCancel }}>
      {children}
      <Modal
        isOpen={modal.isOpen}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        onOk={handleOk}
        onCancel={handleCancel}
        showCancel={modal.showCancel}
        okText={modal.okText}
        cancelText={modal.cancelText}
      />
    </ModalContext.Provider>
  );
};
