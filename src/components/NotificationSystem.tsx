import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  Sparkles,
  X
} from 'lucide-react';
import { Notification, NotificationType } from '../types';
import { cn } from '../lib/utils';

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => string;
  removeNotification: (id: string) => void;
  updateNotification: (id: string, updates: Partial<Omit<Notification, 'id'>>) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications(prev => [...prev, { ...notification, id }]);

    let duration = notification.duration;

    if (notification.type === 'error') {
      duration = 0; // Infinite until manually dismissed
    } else if (notification.type === 'loading' || notification.type === 'generating') {
      duration = 60000; // Dead Man's Switch: 60s absolute TTL
    } else if (duration === undefined) {
      // Smart duration based on length
      duration = Math.min(Math.max(3000, (notification.message?.length || 0) * 50), 10000);
    }

    if (duration !== 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }

    return id;
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const updateNotification = useCallback((id: string, updates: Partial<Omit<Notification, 'id'>>) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));

    let duration = updates.duration;
    
    if (updates.type === 'error') {
      duration = 0;
    } else if (updates.type === 'loading' || updates.type === 'generating') {
      duration = 60000;
    } else if (duration === undefined && updates.message) {
      duration = Math.min(Math.max(3000, updates.message.length * 50), 10000);
    }

    if (duration !== undefined && duration !== 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }
  }, [removeNotification]);

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification, updateNotification }}>
      {children}
      <NotificationContainer notifications={notifications} removeNotification={removeNotification} />
    </NotificationContext.Provider>
  );
};

const NotificationContainer: React.FC<{ 
  notifications: Notification[], 
  removeNotification: (id: string) => void 
}> = ({ notifications, removeNotification }) => {
  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] flex flex-col items-center gap-3 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {notifications.map((notification) => (
          <NotificationItem 
            key={notification.id} 
            notification={notification} 
            onClose={() => removeNotification(notification.id)} 
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

const NotificationItem: React.FC<{ 
  notification: Notification, 
  onClose: () => void 
}> = ({ notification, onClose }) => {
  const getIcon = () => {
    switch (notification.type) {
      case 'success': return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-rose-400" />;
      case 'loading': return <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />;
      case 'generating': return <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />;
      default: return <Info className="w-4 h-4 text-blue-400" />;
    }
  };

  const getStyles = () => {
    switch (notification.type) {
      case 'success': return "bg-emerald-500/10 border-emerald-500/20 text-emerald-200";
      case 'error': return "bg-rose-500/10 border-rose-500/20 text-rose-200";
      case 'loading': 
      case 'generating': return "bg-indigo-500/10 border-indigo-500/20 text-indigo-200";
      default: return "bg-zinc-900/80 border-zinc-800 text-zinc-200";
    }
  };

  return (
    <motion.div
      key={notification.id}
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
      className={cn(
        "pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-2xl border backdrop-blur-md shadow-2xl min-w-[200px] max-w-md w-full",
        getStyles()
      )}
    >
      <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>
      <div className="flex-1 text-[11px] font-bold uppercase tracking-widest break-words whitespace-pre-wrap max-h-[40vh] overflow-y-auto">
        {notification.message}
        {notification.type === 'generating' && notification.charCount !== undefined && (
          <span className="ml-2 opacity-60 block mt-1">(Current: {notification.charCount.toLocaleString()} chars)</span>
        )}
      </div>
      <button 
        onClick={onClose}
        className="flex-shrink-0 p-1 hover:bg-white/10 rounded-full transition-colors mt-0.5"
      >
        <X className="w-3 h-3 opacity-50 hover:opacity-100" />
      </button>
    </motion.div>
  );
};
