"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

export type NotificationType = "success" | "error" | "info";

interface Notification {
  id: string;
  type: NotificationType;
  message: string;
}

interface NotificationContextType {
  showNotification: (type: NotificationType, message: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within a NotificationProvider");
  }
  return context;
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = useCallback((type: NotificationType, message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications((prev) => [...prev, { id, type, message }]);

    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 4000);
  }, []);

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {notifications.map((notif) => (
          <div
            key={notif.id}
            className={`flex items-center gap-3 min-w-[300px] p-4 rounded-xl border shadow-xl animate-in slide-in-from-bottom-5 fade-in duration-300
              ${notif.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : ''}
              ${notif.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-500' : ''}
              ${notif.type === 'info' ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' : ''}
            `}
          >
            <div className="shrink-0">
              {notif.type === 'success' && <CheckCircle2 size={20} />}
              {notif.type === 'error' && <XCircle size={20} />}
              {notif.type === 'info' && <Info size={20} />}
            </div>
            
            <p className="flex-1 text-sm font-bold">{notif.message}</p>
            
            <button 
              onClick={() => removeNotification(notif.id)}
              className="shrink-0 opacity-50 hover:opacity-100 transition-opacity"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}
