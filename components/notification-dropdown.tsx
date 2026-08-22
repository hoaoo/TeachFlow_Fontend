'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  CheckCheck,
  BookOpen,
  GraduationCap,
  ClipboardCheck,
  School,
  Sparkles,
  Info,
  X,
  Loader2,
  Trash2,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import {
  getNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  type AppNotification,
  type NotificationType,
} from '@/services/notification-service';
import { toast } from 'sonner';

interface NotificationDropdownProps {
  onNavigate?: (viewName: string) => void;
}

export function NotificationDropdown({ onNavigate }: NotificationDropdownProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterUnreadOnly, setFilterUnreadOnly] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Poll unread count every 30 seconds only if user is authenticated
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      setNotifications([]);
      return;
    }
    let mounted = true;
    const checkCount = async () => {
      try {
        const cnt = await getUnreadCount();
        if (mounted) setUnreadCount(cnt);
      } catch {
        // silent fallback
      }
    };

    checkCount();
    const interval = setInterval(checkCount, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [user]);

  // Fetch notifications when opened or filter changed
  const fetchList = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await getNotifications({
        isRead: filterUnreadOnly ? false : undefined,
        pageSize: 20,
      });
      setNotifications(res.items || []);
      setUnreadCount(res.unreadCount || 0);
    } catch (err: any) {
      toast.error('Không thể tải thông báo: ' + (err.message || 'Thử lại sau'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchList();
    }
  }, [isOpen, filterUnreadOnly]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // silent
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success('Đã đánh dấu tất cả là đã đọc');
    } catch (err: any) {
      toast.error('Lỗi: ' + (err.message || 'Không thể cập nhật'));
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      toast.success('Đã xóa thông báo');
    } catch {
      toast.error('Không thể xóa thông báo');
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'ASSIGNMENT':
        return <div className="grid size-8 place-items-center rounded-lg bg-teal-50 text-teal-600"><BookOpen className="size-4" /></div>;
      case 'ENROLLMENT':
        return <div className="grid size-8 place-items-center rounded-lg bg-blue-50 text-blue-600"><GraduationCap className="size-4" /></div>;
      case 'ASSESSMENT':
        return <div className="grid size-8 place-items-center rounded-lg bg-purple-50 text-purple-600"><ClipboardCheck className="size-4" /></div>;
      case 'HOMEROOM':
        return <div className="grid size-8 place-items-center rounded-lg bg-rose-50 text-rose-600"><School className="size-4" /></div>;
      case 'TASK':
        return <div className="grid size-8 place-items-center rounded-lg bg-amber-50 text-amber-600"><Sparkles className="size-4" /></div>;
      default:
        return <div className="grid size-8 place-items-center rounded-lg bg-slate-100 text-slate-600"><Info className="size-4" /></div>;
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays === 1) return 'Hôm qua';
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Thông báo"
        className="relative grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
      >
        <Bell className="size-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-rose-500 font-mono text-[10px] font-bold text-white shadow-sm ring-2 ring-white animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-12 z-50 flex w-80 sm:w-96 flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 bg-slate-50/70">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-900">Thông báo</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-bold text-teal-700">
                  {unreadCount} mới
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-700 hover:text-teal-800"
              >
                <CheckCheck className="size-3.5" /> Đọc tất cả
              </button>
            )}
          </div>

          {/* Filter tabs */}
          <div className="flex border-b border-slate-100 bg-white px-2 pt-1 text-xs">
            <button
              onClick={() => setFilterUnreadOnly(false)}
              className={`border-b-2 px-3 py-2 font-medium transition ${
                !filterUnreadOnly
                  ? 'border-teal-600 font-semibold text-teal-700'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setFilterUnreadOnly(true)}
              className={`border-b-2 px-3 py-2 font-medium transition ${
                filterUnreadOnly
                  ? 'border-teal-600 font-semibold text-teal-700'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              Chưa đọc ({unreadCount})
            </button>
          </div>

          {/* List Content */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Loader2 className="size-6 animate-spin text-teal-600" />
                <p className="mt-2 text-xs">Đang tải thông báo...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Bell className="mx-auto size-8 text-slate-300" />
                <p className="mt-2 text-xs font-medium text-slate-500">
                  {filterUnreadOnly ? 'Không có thông báo chưa đọc' : 'Bạn chưa có thông báo nào'}
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    if (!item.isRead) handleMarkAsRead(item.id);
                    if (item.link && onNavigate) onNavigate(item.link);
                  }}
                  className={`group relative flex items-start gap-3 p-3.5 transition cursor-pointer ${
                    !item.isRead ? 'bg-teal-50/30 hover:bg-teal-50/60' : 'hover:bg-slate-50/80'
                  }`}
                >
                  {getNotificationIcon(item.type)}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className={`text-xs truncate ${!item.isRead ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>
                        {item.title}
                      </p>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </div>

                    <p className="mt-0.5 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {item.message}
                    </p>

                    {!item.isRead && (
                      <div className="mt-1.5 flex items-center gap-2">
                        <button
                          onClick={(e) => handleMarkAsRead(item.id, e)}
                          className="text-[10px] font-medium text-teal-700 hover:underline"
                        >
                          Đã đọc
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={(e) => handleDelete(item.id, e)}
                    title="Xóa"
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 p-1 transition"
                  >
                    <Trash2 className="size-3.5" />
                  </button>

                  {!item.isRead && (
                    <span className="size-2 rounded-full bg-teal-600 self-center" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
