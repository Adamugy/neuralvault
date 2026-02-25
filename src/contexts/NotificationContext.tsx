import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';

type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface Notification {
  id: string;
  message: string;
  type: NotificationType;
}

interface ModalOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  placeholder?: string;
  showInput?: boolean;
  resolve: (value: any) => void;
}

interface NotificationContextType {
  showToast: (message: string, type?: NotificationType) => void;
  confirm: (message: string, title?: string) => Promise<boolean>;
  prompt: (message: string, placeholder?: string, title?: string) => Promise<string | null>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [modal, setModal] = useState<ModalOptions | null>(null);
  const [inputValue, setInputValue] = useState('');

  const showToast = useCallback((message: string, type: NotificationType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  }, []);

  const confirm = useCallback((message: string, title: string = 'Confirm Action') => {
    return new Promise<boolean>((resolve) => {
      setModal({
        title,
        message,
        confirmLabel: 'Confirm',
        cancelLabel: 'Cancel',
        showInput: false,
        resolve
      });
    });
  }, []);

  const prompt = useCallback((message: string, placeholder: string = 'Enter value...', title: string = 'Input Required') => {
    setInputValue('');
    return new Promise<string | null>((resolve) => {
      setModal({
        title,
        message,
        placeholder,
        confirmLabel: 'Submit',
        cancelLabel: 'Cancel',
        showInput: true,
        resolve
      });
    });
  }, []);

  const handleModalAction = (success: boolean) => {
    if (!modal) return;
    if (modal.showInput) {
      modal.resolve(success ? inputValue : null);
    } else {
      modal.resolve(success);
    }
    setModal(null);
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ showToast, confirm, prompt }}>
      {children}
      
      {/* Toasts Stack */}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none sm:max-w-md w-full px-4 sm:px-0">
        <AnimatePresence>
          {notifications.map((n) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className={`pointer-events-auto flex items-center gap-3 p-4 rounded-2xl glass-panel border shadow-2xl backdrop-blur-xl ${
                n.type === 'success' ? 'border-emerald-500/30 bg-emerald-500/10' :
                n.type === 'error' ? 'border-red-500/30 bg-red-500/10' :
                n.type === 'warning' ? 'border-yellow-500/30 bg-yellow-500/10' :
                'border-blue-500/30 bg-blue-500/10'
              }`}
            >
              <div className={`flex-shrink-0 ${
                n.type === 'success' ? 'text-emerald-500' :
                n.type === 'error' ? 'text-red-500' :
                n.type === 'warning' ? 'text-yellow-500' :
                'text-blue-500'
              }`}>
                {n.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
                {n.type === 'error' && <AlertCircle className="w-5 h-5" />}
                {n.type === 'warning' && <AlertTriangle className="w-5 h-5" />}
                {n.type === 'info' && <Info className="w-5 h-5" />}
              </div>
              
              <p className="text-sm font-medium text-white flex-1 leading-snug">
                {n.message}
              </p>

              <button
                onClick={() => removeNotification(n.id)}
                className="text-slate-500 hover:text-white transition-colors p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Modal Dialog */}
      <AnimatePresence>
        {modal && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => handleModalAction(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm glass-panel border border-white/10 rounded-3xl p-6 shadow-2xl backdrop-blur-2xl bg-slate-900/50"
            >
              {modal.title && (
                <h3 className="text-xl font-bold text-white mb-2">{modal.title}</h3>
              )}
              <p className="text-slate-300 text-sm mb-6 leading-relaxed">
                {modal.message}
              </p>

              {modal.showInput && (
                <div className="mb-6">
                  <input
                    type="text"
                    autoFocus
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={modal.placeholder}
                    onKeyDown={(e) => e.key === 'Enter' && handleModalAction(true)}
                    className="w-full bg-slate-950/50 border border-white/10 text-white px-4 py-3 rounded-xl focus:border-[var(--neon-primary)] focus:ring-1 focus:ring-[var(--neon-primary)]/20 outline-none transition-all"
                  />
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => handleModalAction(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-slate-400 font-bold text-sm hover:bg-white/5 hover:text-white transition-all"
                >
                  {modal.cancelLabel}
                </button>
                <button
                  onClick={() => handleModalAction(true)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--neon-primary)] text-white font-bold text-sm hover:bg-[var(--neon-primary)]/80 shadow-[0_0_15px_-5px_var(--neon-primary)] transition-all"
                >
                  {modal.confirmLabel}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </NotificationContext.Provider>
  );
};
