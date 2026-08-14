"use client";

import React, { useState, useEffect, useRef } from "react";
import { Bell, Info, AlertTriangle, CheckCircle, XCircle, Settings, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface NotificationData {
  _id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "error" | "system";
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setNotifications(json.data);
          setUnreadCount(json.data.filter((n: NotificationData) => !n.isRead).length);
        }
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  };

  // Initial fetch and event listener
  useEffect(() => {
    fetchNotifications();
    
    // Polling every 60 seconds (lightweight)
    const interval = setInterval(fetchNotifications, 60000);
    
    const handleUpdate = () => fetchNotifications();
    window.addEventListener("notifications-updated", handleUpdate);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener("notifications-updated", handleUpdate);
    };
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotificationClick = async (notif: NotificationData) => {
    // Mark as read if unread
    if (!notif.isRead) {
      try {
        await fetch(`/api/notifications/${notif._id}/read`, { method: "POST" });
        // Update local state
        setNotifications((prev) => 
          prev.map((n) => n._id === notif._id ? { ...n, isRead: true } : n)
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
        window.dispatchEvent(new Event("notifications-updated"));
      } catch (error) {
        console.error("Failed to mark notification as read", error);
      }
    }

    if (notif.link) {
      router.push(notif.link);
      setIsOpen(false);
    }
  };

  const toggleExpand = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setExpandedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "warning": return <AlertTriangle size={18} className="text-amber-500" />;
      case "success": return <CheckCircle size={18} className="text-emerald-500" />;
      case "error": return <XCircle size={18} className="text-red-500" />;
      case "system": return <Settings size={18} className="text-primary" />;
      default: return <Info size={18} className="text-blue-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000); // in seconds
    
    if (diff < 60) return "Baru saja";
    if (diff < 3600) return `${Math.floor(diff / 60)} menit yang lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} jam yang lalu`;
    return date.toLocaleDateString("id-ID", { day: 'numeric', month: 'short' });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications(); // Refresh when opening
        }}
        className="relative p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-background animate-pulse" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 max-h-[28rem] flex flex-col bg-card border border-border shadow-2xl rounded-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
          <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
            <h3 className="font-black uppercase tracking-widest text-sm text-foreground">Notifikasi</h3>
            {unreadCount > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary uppercase tracking-widest">
                {unreadCount} Baru
              </span>
            )}
          </div>
          
          <div className="overflow-y-auto flex-1 overscroll-contain">
            {notifications.length > 0 ? (
              <div className="divide-y divide-border/50">
                {notifications.slice(0, 5).map((notif) => (
                  <div 
                    key={notif._id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-4 flex gap-3 hover:bg-muted/50 transition-colors cursor-pointer ${
                      !notif.isRead ? 'bg-primary/5 border-l-2 border-l-primary' : 'bg-transparent border-l-2 border-l-transparent'
                    }`}
                  >
                    <div className="shrink-0 mt-0.5">
                      {getIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-sm mb-1 line-clamp-1 ${!notif.isRead ? 'font-bold text-foreground' : 'font-medium text-muted-foreground'}`}>
                        {notif.title}
                      </h4>
                      <p className={`text-xs text-muted-foreground leading-relaxed ${expandedIds.has(notif._id) ? '' : 'line-clamp-2'}`}>
                        {notif.message}
                      </p>
                      {notif.message.length > 80 && (
                        <button 
                          onClick={(e) => toggleExpand(e, notif._id)}
                          className="text-[10px] text-primary hover:underline font-bold mt-1"
                        >
                          {expandedIds.has(notif._id) ? "Sembunyikan" : "Baca Selengkapnya"}
                        </button>
                      )}
                      <div className="mt-2 flex items-center justify-between text-[10px] uppercase tracking-wider font-bold text-muted-foreground/60">
                        <span>{formatDate(notif.createdAt)}</span>
                        {notif.link && (
                          <span className="text-primary flex items-center gap-1">
                            Lihat Detail <ExternalLink size={10} />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {notifications.length > 5 && (
                  <div className="p-3 bg-muted/20 text-center border-t border-border/50">
                    <span className="text-xs text-muted-foreground font-medium">
                      + {notifications.length - 5} notifikasi lainnya
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center flex flex-col items-center justify-center text-muted-foreground">
                <Bell size={32} className="mb-3 opacity-20" />
                <p className="text-sm font-medium">Belum ada notifikasi.</p>
                <p className="text-xs mt-1">Anda sudah membaca semuanya!</p>
              </div>
            )}
          </div>
          
          <div className="p-3 border-t border-border bg-muted/10">
            <Link 
              href="/dashboard/notifications" 
              onClick={() => setIsOpen(false)}
              className="block w-full py-2 text-center text-xs font-bold uppercase tracking-widest text-primary hover:text-primary/80 hover:bg-primary/10 rounded-lg transition-colors"
            >
              Lihat Semua Notifikasi
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
