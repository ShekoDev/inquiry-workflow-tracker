import React, { useState, useEffect } from 'react';
import { Bell, Trash2, Check, BarChart3 } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { useAuth } from '@/contexts/AuthContext';
import type { AppNotification } from '@/types';
import { getUserNotifications, deleteNotification, markAsRead, categorizeNotifications } from '@/services/notifications';
import { BroadcastAnalytics } from './BroadcastAnalytics';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const categoryColors = {
  today: { bg: 'bg-blue-50', border: 'border-l-4 border-l-blue-500', label: 'اليوم' },
  week: { bg: 'bg-yellow-50', border: 'border-l-4 border-l-yellow-500', label: 'الاسبوع' },
  older: { bg: 'bg-gray-50', border: 'border-l-4 border-l-gray-500', label: 'أقدم' }
};

const levelColors = {
  info: 'bg-blue-100 text-blue-800',
  warning: 'bg-yellow-100 text-yellow-800',
  danger: 'bg-red-100 text-red-800',
  success: 'bg-green-100 text-green-800'
};

export const NotificationPanel: React.FC<NotificationPanelProps> = ({ isOpen, onClose }) => {
  const { lang } = useI18n();
  const { user, can } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyticsFor, setAnalyticsFor] = useState<AppNotification | null>(null);
  const [categorized, setCategorized] = useState<Record<'today' | 'week' | 'older', AppNotification[]>>({
    today: [],
    week: [],
    older: []
  });

  useEffect(() => {
    if (isOpen && user) {
      loadNotifications();
    }
  }, [isOpen, user]);

  const loadNotifications = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const notifs = await getUserNotifications(user.uid);
      setNotifications(notifs);
      setCategorized(categorizeNotifications(notifs));
    } catch (e) {
      console.error('Failed to load notifications:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (notificationId: string) => {
    if (!user) return;
    try {
      await deleteNotification(notificationId, user.uid);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setCategorized(prev => ({
        today: prev.today.filter(n => n.id !== notificationId),
        week: prev.week.filter(n => n.id !== notificationId),
        older: prev.older.filter(n => n.id !== notificationId)
      }));
    } catch (e) {
      console.error('Failed to delete notification:', e);
    }
  };

  const handleRead = async (notif: AppNotification) => {
    if (!user) return;
    try {
      await markAsRead(notif.id, user.uid, notif.type !== 'broadcast');
      const stamp = { seconds: Date.now() / 1000 } as any;
      setNotifications(prev =>
        prev.map(n => (n.id === notif.id ? { ...n, read: true, readBy: { ...n.readBy, [user.uid]: stamp } } : n))
      );
      setCategorized(prev => {
        const upd = (arr: AppNotification[]) => arr.map(n => (n.id === notif.id ? { ...n, read: true, readBy: { ...n.readBy, [user.uid]: stamp } } : n));
        return { today: upd(prev.today), week: upd(prev.week), older: upd(prev.older) };
      });
    } catch (e) {
      console.error('Failed to mark notification as read:', e);
    }
  };

  const renderNotification = (notif: AppNotification, cat: 'today' | 'week' | 'older') => {
    const title = lang === 'ar' ? notif.titleAr : notif.titleEn;
    const body = lang === 'ar' ? notif.bodyAr : notif.bodyEn;
    const isRead = notif.type === 'broadcast' ? !!notif.readBy?.[user?.uid || ''] : (notif.read || !!notif.readBy?.[user?.uid || '']);
    const isUrgent = notif.level === 'danger' || notif.level === 'warning';

    return (
      <div
        key={notif.id}
        className={`p-4 rounded-lg mb-3 ${isUrgent ? 'bg-red-50 border-l-4 border-l-red-500' : `${categoryColors[cat].bg} ${categoryColors[cat].border}`} ${!isRead ? 'opacity-100' : 'opacity-75'}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-gray-900">{title}</h4>
              <span className={`text-xs px-2 py-1 rounded ${levelColors[notif.level]}`}>
                {notif.level}
              </span>
              {notif.type === 'broadcast' && (
                <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-800">
                  {lang === 'ar' ? 'رسالة جماعية' : 'Broadcast'}
                </span>
              )}
            </div>
            {body && <p className="text-sm text-gray-600 mt-1">{body}</p>}
            <span className="text-xs text-gray-400 mt-2 block">
              {notif.createdAt.toDate().toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US')}
            </span>
          </div>
          <div className="flex gap-2">
            {notif.type === 'broadcast' && can('admin.broadcast_message') && (
              <button
                onClick={() => setAnalyticsFor(notif)}
                className="p-1 text-purple-600 hover:bg-purple-100 rounded"
                title={lang === 'ar' ? 'من استلم الرسالة؟' : 'Delivery analytics'}
              >
                <BarChart3 size={16} />
              </button>
            )}
            {!isRead && (
              <button
                onClick={() => handleRead(notif)}
                className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                title={lang === 'ar' ? 'علّم كمقروء' : 'Mark as read'}
              >
                <Check size={16} />
              </button>
            )}
            <button
              onClick={() => handleDelete(notif.id)}
              className="p-1 text-red-600 hover:bg-red-100 rounded"
              title={lang === 'ar' ? 'احذف' : 'Delete'}
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const categoryOrder: Array<'today' | 'week' | 'older'> = ['today', 'week', 'older'];
  const categoryLabels = {
    today: lang === 'ar' ? 'اليوم' : 'Today',
    week: lang === 'ar' ? 'الأسبوع' : 'This Week',
    older: lang === 'ar' ? 'أقدم' : 'Older'
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black bg-opacity-50" onClick={onClose} />
      <div
        className={`fixed top-0 bottom-0 w-96 max-w-full bg-white shadow-lg z-50 overflow-y-auto ${lang === 'ar' ? 'left-0' : 'right-0'}`}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Bell size={24} />
              {lang === 'ar' ? 'الاشعارات' : 'Notifications'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin">⏳</div>
              <p className="text-gray-500 mt-2">{lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">
                {lang === 'ar' ? 'لا توجد إشعارات' : 'No notifications'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {categoryOrder.map(cat => (
                <div key={cat}>
                  {categorized[cat].length > 0 && (
                    <>
                      <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                        {categoryLabels[cat]}
                      </h3>
                      <div className="space-y-2">
                        {categorized[cat].map(notif => renderNotification(notif, cat))}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delivery analytics for a broadcast (admins) */}
      {analyticsFor && (
        <BroadcastAnalytics
          isOpen={true}
          broadcastId={analyticsFor.id}
          broadcast={analyticsFor}
          onClose={() => setAnalyticsFor(null)}
        />
      )}
    </>
  );
};
