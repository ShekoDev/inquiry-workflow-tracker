import React, { useState, useEffect } from 'react';
import { Send, X, Users } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { useAuth } from '@/contexts/AuthContext';
import { createBroadcast } from '@/services/notifications';
import { listUsers } from '@/services/users';
import type { AppUser } from '@/types';

interface BroadcastMessageProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const BroadcastMessage: React.FC<BroadcastMessageProps> = ({ isOpen, onClose, onSuccess }) => {
  const { lang } = useI18n();
  const { user, can } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [sendToAll, setSendToAll] = useState(true);
  const [titleAr, setTitleAr] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [bodyAr, setBodyAr] = useState('');
  const [bodyEn, setBodyEn] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  const loadUsers = async () => {
    try {
      const allUsers = await listUsers();
      setUsers(allUsers);
    } catch (e) {
      console.error('Failed to load users:', e);
      setError(lang === 'ar' ? 'فشل تحميل المستخدمين' : 'Failed to load users');
    }
  };

  const toggleUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!titleAr.trim() || !titleEn.trim()) {
      setError(lang === 'ar' ? 'يرجى إدخال العنوان بكلا اللغتين' : 'Please enter title in both languages');
      return;
    }

    const recipientIds = sendToAll ? users.map(u => u.uid) : Array.from(selectedUsers);

    if (recipientIds.length === 0) {
      setError(lang === 'ar' ? 'اختر المستخدمين على الأقل' : 'Please select at least one user');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await createBroadcast(
        { ar: titleAr, en: titleEn },
        { ar: bodyAr, en: bodyEn },
        recipientIds,
        user ? { uid: user.uid, name: (lang === 'ar' ? user.nameAr : user.nameEn) || user.email || '' } : undefined
      );

      // Reset form
      setTitleAr('');
      setTitleEn('');
      setBodyAr('');
      setBodyEn('');
      setSendToAll(true);
      setSelectedUsers(new Set());

      onSuccess?.();
      onClose();
    } catch (e) {
      console.error('Failed to send broadcast:', e);
      setError(lang === 'ar' ? 'فشل إرسال الرسالة' : 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  // Check if user has broadcast permission (super admin always allowed)
  if (!can('admin.broadcast_message')) {
    return null;
  }

  if (!isOpen) return null;

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black bg-opacity-50" onClick={onClose} />
      )}
      <div
        className={`fixed inset-y-0 z-50 w-full max-w-2xl bg-white shadow-lg overflow-y-auto transform transition-transform ${
          isOpen ? 'translate-x-0' : lang === 'ar' ? 'translate-x-full' : '-translate-x-full'
        } ${lang === 'ar' ? 'right-0' : 'left-0'}`}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Send size={28} />
              {lang === 'ar' ? 'إرسال رسالة جماعية' : 'Broadcast Message'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-3xl"
            >
              <X size={32} />
            </button>
          </div>

          <form onSubmit={handleSend} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Title Section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">
                {lang === 'ar' ? 'العنوان' : 'Title'}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder={lang === 'ar' ? 'العنوان بالعربية' : 'Title in English'}
                  value={lang === 'ar' ? titleAr : titleEn}
                  onChange={e => (lang === 'ar' ? setTitleAr(e.target.value) : setTitleEn(e.target.value))}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  dir={lang === 'ar' ? 'rtl' : 'ltr'}
                />
                <input
                  type="text"
                  placeholder={lang === 'ar' ? 'العنوان بالإنجليزية' : 'Title in Arabic'}
                  value={lang === 'ar' ? titleEn : titleAr}
                  onChange={e => (lang === 'ar' ? setTitleEn(e.target.value) : setTitleAr(e.target.value))}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  dir={lang === 'ar' ? 'ltr' : 'rtl'}
                />
              </div>
            </div>

            {/* Body Section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">
                {lang === 'ar' ? 'المحتوى' : 'Content'}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <textarea
                  placeholder={lang === 'ar' ? 'المحتوى بالعربية' : 'Content in English'}
                  value={lang === 'ar' ? bodyAr : bodyEn}
                  onChange={e => (lang === 'ar' ? setBodyAr(e.target.value) : setBodyEn(e.target.value))}
                  rows={5}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  dir={lang === 'ar' ? 'rtl' : 'ltr'}
                />
                <textarea
                  placeholder={lang === 'ar' ? 'المحتوى بالإنجليزية' : 'Content in Arabic'}
                  value={lang === 'ar' ? bodyEn : bodyAr}
                  onChange={e => (lang === 'ar' ? setBodyEn(e.target.value) : setBodyAr(e.target.value))}
                  rows={5}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  dir={lang === 'ar' ? 'ltr' : 'rtl'}
                />
              </div>
            </div>

            {/* Recipients Section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Users size={20} />
                {lang === 'ar' ? 'المستقبلون' : 'Recipients'}
              </h3>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={sendToAll}
                    onChange={() => setSendToAll(true)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">
                    {lang === 'ar' ? 'جميع المستخدمين' : 'All users'}
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={!sendToAll}
                    onChange={() => setSendToAll(false)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">
                    {lang === 'ar' ? 'مستخدمون محددون' : 'Selected users'}
                  </span>
                </label>
              </div>

              {!sendToAll && (
                <div className="border border-gray-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                  {users.map(u => (
                    <label key={u.uid} className="flex items-center gap-3 py-2 cursor-pointer hover:bg-gray-50 px-2 rounded">
                      <input
                        type="checkbox"
                        checked={selectedUsers.has(u.uid)}
                        onChange={() => toggleUser(u.uid)}
                        className="w-4 h-4"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-sm text-gray-900">
                          {lang === 'ar' ? u.nameAr : u.nameEn}
                        </p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {!sendToAll && selectedUsers.size > 0 && (
                <p className="text-sm text-gray-600">
                  {lang === 'ar' ? 'يتم الإرسال إلى' : 'Sending to'} <span className="font-semibold">{selectedUsers.size}</span> {lang === 'ar' ? 'مستخدم' : 'users'}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-6 border-t">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition flex items-center justify-center gap-2"
              >
                {loading ? '⏳' : <Send size={18} />}
                {loading ? (lang === 'ar' ? 'جاري الإرسال...' : 'Sending...') : (lang === 'ar' ? 'إرسال' : 'Send')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};
