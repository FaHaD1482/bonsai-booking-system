import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  type?: 'alert' | 'confirm' | 'success' | 'error';
  onOk: () => void;
  onCancel?: () => void;
  showCancel?: boolean;
  okText?: string;
  cancelText?: string;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  title,
  message,
  type = 'alert',
  onOk,
  onCancel,
  showCancel = false,
  okText = 'OK',
  cancelText = 'Cancel',
}) => {
  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return 'border-emerald-500 bg-emerald-50';
      case 'error':
        return 'border-red-500 bg-red-50';
      case 'confirm':
        return 'border-blue-500 bg-blue-50';
      default:
        return 'border-gray-300 bg-white';
    }
  };

  const getTypeColor = () => {
    switch (type) {
      case 'success':
        return 'text-emerald-700';
      case 'error':
        return 'text-red-700';
      case 'confirm':
        return 'text-blue-700';
      default:
        return 'text-gray-700';
    }
  };

  const getButtonColor = () => {
    switch (type) {
      case 'success':
        return 'bg-emerald-600 hover:bg-emerald-700';
      case 'error':
        return 'bg-red-600 hover:bg-red-700';
      case 'confirm':
        return 'bg-blue-600 hover:bg-blue-700';
      default:
        return 'bg-emerald-600 hover:bg-emerald-700';
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onCancel || onOk}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div
          className={`bg-white rounded-lg shadow-2xl border-l-4 max-w-md w-full ${getTypeStyles()}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className={`text-lg font-bold ${getTypeColor()}`}>{title}</h2>
            <button
              onClick={onCancel || onOk}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className={`p-6 ${getTypeColor()}`}>
            {message.split('\n').map((line, idx) => (
              <p key={idx} className="mb-2 last:mb-0">
                {line}
              </p>
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
            {showCancel && (
              <button
                onClick={onCancel}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium rounded-lg transition"
              >
                {cancelText}
              </button>
            )}
            <button
              onClick={onOk}
              className={`px-6 py-2 ${getButtonColor()} text-white font-medium rounded-lg transition`}
            >
              {okText}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Modal;
