"use client";

import React, { useState, useEffect } from "react";
import { 
  Bell, 
  Info, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Settings, 
  ExternalLink,
  CheckCheck
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";

interface NotificationData {
  _id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "error" | "system";
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationsClient() {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setNotifications(json.data);
        }
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleNotificationClick = async (notif: NotificationData) => {
    if (!notif.isRead) {
      // Optimistic update
      setNotifications(prev => prev.map(n => 
        n._id === notif._id ? { ...n, isRead: true } : n
      ));

      try {
        await fetch(`/api/notifications/${notif._id}/read`, { method: "POST" });
      } catch (error) {
        console.error("Failed to mark as read:", error);
      }
    }
  };

  const markAllAsRead = async () => {
    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));

    try {
      await fetch("/api/notifications/read-all", { method: "POST" });
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const toggleExpand = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newSet = new Set(expandedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedIds(newSet);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "info": return <Info className="text-blue-500 w-6 h-6" />;
      case "warning": return <AlertTriangle className="text-yellow-500 w-6 h-6" />;
      case "success": return <CheckCircle className="text-green-500 w-6 h-6" />;
      case "error": return <XCircle className="text-red-500 w-6 h-6" />;
      case "system": return <Settings className="text-slate-500 w-6 h-6" />;
      default: return <Bell className="text-slate-500 w-6 h-6" />;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: id });
    } catch (e) {
      return "Beberapa waktu lalu";
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-lg">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Semua Notifikasi</h1>
          <p className="text-muted-foreground mt-1">
            Anda memiliki {unreadCount} pesan yang belum dibaca.
          </p>
        </div>
        
        {unreadCount > 0 && (
          <button 
            onClick={markAllAsRead}
            className="flex items-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary px-4 py-2 rounded-xl font-bold transition-colors"
          >
            <CheckCheck size={18} />
            Tandai Semua Dibaca
          </button>
        )}
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-lg overflow-hidden">
        {notifications.length > 0 ? (
          <div className="divide-y divide-border/50">
            {notifications.map((notif) => (
              <div 
                key={notif._id}
                onClick={() => handleNotificationClick(notif)}
                className={`p-5 flex gap-4 hover:bg-muted/50 transition-colors cursor-pointer ${
                  !notif.isRead ? 'bg-primary/5 border-l-4 border-l-primary' : 'bg-transparent border-l-4 border-l-transparent'
                }`}
              >
                <div className="shrink-0 mt-1">
                  {getIcon(notif.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <h4 className={`text-base line-clamp-1 ${!notif.isRead ? 'font-bold text-foreground' : 'font-medium text-muted-foreground'}`}>
                      {notif.title}
                    </h4>
                    <span className="text-xs uppercase tracking-wider font-bold text-muted-foreground shrink-0">
                      {formatDate(notif.createdAt)}
                    </span>
                  </div>
                  
                  <p className={`text-sm text-muted-foreground leading-relaxed ${expandedIds.has(notif._id) ? '' : 'line-clamp-2'}`}>
                    {notif.message}
                  </p>
                  
                  {notif.message.length > 120 && (
                    <button 
                      onClick={(e) => toggleExpand(e, notif._id)}
                      className="text-xs text-primary hover:underline font-bold mt-2"
                    >
                      {expandedIds.has(notif._id) ? "Sembunyikan" : "Baca Selengkapnya"}
                    </button>
                  )}
                  
                  {notif.link && (
                    <div className="mt-3">
                      <Link href={notif.link} className="inline-flex items-center gap-1.5 text-xs bg-muted hover:bg-muted/80 text-foreground px-3 py-1.5 rounded-lg font-medium transition-colors">
                        Lihat Detail <ExternalLink size={12} />
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-16 text-center flex flex-col items-center justify-center text-muted-foreground">
            <Bell size={48} className="mb-4 opacity-20" />
            <p className="text-xl font-medium text-foreground mb-2">Belum ada notifikasi.</p>
            <p className="text-sm">Anda belum menerima pemberitahuan apa pun sejauh ini.</p>
          </div>
        )}
      </div>
    </div>
  );
}
