import React, { useState, useEffect } from 'react';
import { X, Eye, EyeOff, Trash2 } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { getBroadcastAnalytics } from '@/services/notifications';
import { listUsers } from '@/services/users';
import type { AppUser, AppNotification } from '@/types';

interface BroadcastAnalyticsProps {
  isOpen: boolean;
  broadcastId?: string;
  broadcast?: AppNotification;
  onClose: () => void;
}

export const BroadcastAnalytics: React.FC<BroadcastAnalyticsProps> = ({
  isOpen,
  broadcastId,
  broadcast,
  onClose
}) => {
  const { lang } = useI18n();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [filterBy, setFilterBy] = useState<'all' | 'read' | 'unread' | 'deleted'>('all');

  useEffect(() => {
    if (isOpen && broadcastId) {
      loadAnalytics();
    }
  }, [isOpen, broadcastId]);

  const loadAnalytics = async () => {
    if (!broadcastId) return;
    setLoading(true);
    try {
      const allUsers = await listUsers();
      const analyticsData = await getBroadcastAnalytics(broadcastId, allUsers);
      setUsers(allUsers);
      setAnalytics(analyticsData);
    } catch (e) {
      console.error('Failed to load analytics:', e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const title = broadcast ? (lang === 'ar' ? broadcast.titleAr : broadcast.titleEn) : '';
  const body = broadcast ? (lang === 'ar' ? broadcast.bodyAr : broadcast.bodyEn) : '';

  let filteredDetails = analytics?.details || [];
  if (filterBy === 'read') {
    filteredDetails = filteredDetails.filter((d: any) => d.read);
  } else if (filterBy === 'unread') {
    filteredDetails = filteredDetails.filter((d: any) => !d.read);
  } else if (filterBy === 'deleted') {
    filteredDetails = filteredDetails.filter((d: any) => d.deleted);
  }

  const getStatusBadge = (detail: any) => {
    if (detail.deleted) {
      return (
        <span className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-red-100 text-red-700">
          <Trash2 size={12} />
          {lang === 'ar' ? 'محذوف' : 'Deleted'}
        </span>
      );
    }
    if (detail.read) {
      return (
        <span className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-green-100 text-green-700">
          <Eye size={12} />
          {lang === 'ar' ? 'مقروء' : 'Read'}
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-700">
        <EyeOff size={12} />
        {lang === 'ar' ? 'لم يُقرأ' : 'Unread'}
      </span>
    );
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black bg-opacity-50" onClick={onClose} />
      <div className="fixed inset-y-0 z-50 w-full max-w-4xl bg-white shadow-lg overflow-y-auto transform transition-transform translate-x-0 left-0">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">
              {lang === 'ar' ? 'تحليل الرسالة الجماعية' : 'Broadcast Analytics'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-3xl"
            >
              <X size={32} />
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin">⏳</div>
              <p className="text-gray-500 mt-2">
                {lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Message Preview */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-lg text-blue-900 mb-2">{title}</h3>
                <p className="text-blue-800 text-sm mb-3 whitespace-pre-wrap">{body}</p>
                <p className="text-xs text-blue-600">
                  {lang === 'ar' ? 'أرسلت في: ' : 'Sent at: '}
                  {broadcast?.createdAt.toDate().toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US')}
                </p>
              </div>

              {/* Stats Summary */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-3xl font-bold text-blue-600">{analytics?.totalRecipients || 0}</div>
                  <div className="text-sm text-gray-600">
                    {lang === 'ar' ? 'إجمالي المستقبلين' : 'Total Recipients'}
                  </div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-3xl font-bold text-green-600">{analytics?.read || 0}</div>
                  <div className="text-sm text-gray-600">
                    {lang === 'ar' ? 'قراؤا الرسالة' : 'Read'}
                  </div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <div className="text-3xl font-bold text-yellow-600">{analytics?.unread || 0}</div>
                  <div className="text-sm text-gray-600">
                    {lang === 'ar' ? 'لم يقرؤا' : 'Unread'}
                  </div>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <div className="text-3xl font-bold text-red-600">{analytics?.deleted || 0}</div>
                  <div className="text-sm text-gray-600">
                    {lang === 'ar' ? 'محذوف' : 'Deleted'}
                  </div>
                </div>
              </div>

              {/* Filter Buttons */}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setFilterBy('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    filterBy === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {lang === 'ar' ? 'الكل' : 'All'} ({analytics?.totalRecipients || 0})
                </button>
                <button
                  onClick={() => setFilterBy('read')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    filterBy === 'read'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {lang === 'ar' ? 'مقروء' : 'Read'} ({analytics?.read || 0})
                </button>
                <button
                  onClick={() => setFilterBy('unread')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    filterBy === 'unread'
                      ? 'bg-yellow-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {lang === 'ar' ? 'لم يقرأ' : 'Unread'} ({analytics?.unread || 0})
                </button>
                <button
                  onClick={() => setFilterBy('deleted')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    filterBy === 'deleted'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {lang === 'ar' ? 'محذوف' : 'Deleted'} ({analytics?.deleted || 0})
                </button>
              </div>

              {/* Recipients List */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">
                        {lang === 'ar' ? 'الاسم' : 'Name'}
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">
                        {lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">
                        {lang === 'ar' ? 'الحالة' : 'Status'}
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">
                        {lang === 'ar' ? 'الوقت' : 'Time'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDetails.map((detail: any) => (
                      <tr key={detail.userId} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{lang === 'ar' ? (detail.userNameAr || detail.userName) : detail.userName}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{detail.email}</td>
                        <td className="px-4 py-3">{getStatusBadge(detail)}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {detail.readAt
                            ? detail.readAt.toDate().toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US')
                            : detail.deletedAt
                            ? detail.deletedAt.toDate().toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US')
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredDetails.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">
                    {lang === 'ar' ? 'لا توجد نتائج' : 'No results'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
