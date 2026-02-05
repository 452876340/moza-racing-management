import React, { createContext, useContext, useState, useCallback } from 'react';
import Toast, { ToastType } from '../components/ui/Toast';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import InputModal from '../components/ui/InputModal';

interface UIContextType {
  showToast: (message: string, type?: ToastType) => void;
  showConfirm: (options: ConfirmOptions) => void;
  showInput: (options: InputOptions) => void;
}

interface ConfirmOptions {
  title: string;
  message: string;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

interface InputOptions {
  title: string;
  defaultValue?: string;
  placeholder?: string;
  onConfirm: (value: string) => void;
  confirmText?: string;
  cancelText?: string;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Toast State
  const [toasts, setToasts] = useState<{ id: string; message: string; type: ToastType }[]>([]);

  // Confirm Dialog State
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    options: ConfirmOptions | null;
  }>({
    isOpen: false,
    options: null,
  });

  // Input Modal State
  const [inputState, setInputState] = useState<{
    isOpen: boolean;
    options: InputOptions | null;
  }>({
    isOpen: false,
    options: null,
  });

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showConfirm = useCallback((options: ConfirmOptions) => {
    setConfirmState({
      isOpen: true,
      options,
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (confirmState.options?.onConfirm) {
      confirmState.options.onConfirm();
    }
    setConfirmState({ isOpen: false, options: null });
  }, [confirmState.options]);

  const handleCancelConfirm = useCallback(() => {
    setConfirmState({ isOpen: false, options: null });
  }, []);

  const showInput = useCallback((options: InputOptions) => {
    setInputState({
      isOpen: true,
      options,
    });
  }, []);

  const handleInputConfirm = useCallback((value: string) => {
    if (inputState.options?.onConfirm) {
      inputState.options.onConfirm(value);
    }
    setInputState({ isOpen: false, options: null });
  }, [inputState.options]);

  const handleInputClose = useCallback(() => {
    setInputState({ isOpen: false, options: null });
  }, []);

  return (
    <UIContext.Provider value={{ showToast, showConfirm, showInput }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast
              message={toast.message}
              type={toast.type}
              onClose={() => removeToast(toast.id)}
            />
          </div>
        ))}
      </div>

      {/* Confirm Dialog */}
      {confirmState.options && (
        <ConfirmDialog
          isOpen={confirmState.isOpen}
          title={confirmState.options.title}
          message={confirmState.options.message}
          onConfirm={handleConfirm}
          onCancel={handleCancelConfirm}
          confirmText={confirmState.options.confirmText}
          cancelText={confirmState.options.cancelText}
          isDestructive={confirmState.options.isDestructive}
        />
      )}

      {/* Input Modal */}
      {inputState.options && (
        <InputModal
          isOpen={inputState.isOpen}
          title={inputState.options.title}
          defaultValue={inputState.options.defaultValue}
          placeholder={inputState.options.placeholder}
          onConfirm={handleInputConfirm}
          onClose={handleInputClose}
          confirmText={inputState.options.confirmText}
          cancelText={inputState.options.cancelText}
        />
      )}
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};
