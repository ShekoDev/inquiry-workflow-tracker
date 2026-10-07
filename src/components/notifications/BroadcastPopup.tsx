import { useEffect, useState } from 'react';
import { Megaphone, CheckCircle2 } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { useAuth } from '@/contexts/AuthContext';
import { getPendingBroadcasts, markAsRead } from '@/services/notifications';
import type { AppNotification } from '@/types';
import { fmtDateTime } from '@/utils/format';

/**
 * Shown automatically after login: any broadcast message targeted at the current
 * user that they have not yet acknowledged pops up on screen. Pressing
 * "استلام / Received" records the receipt (readBy.<uid> = now) so the admin can
 * see exactly who received the message and when.
 */
export function BroadcastPopup() {
  const { user } = useAuth();
  const { lang } = useI18n();
  const [queue, setQueue] = useState<AppNotification[]>([]);
  const [acking, setAcking] = useState(false);

  useEffect(() => {
    if (!user) { setQueue([]); return; }
    let cancelled = false;
    getPendingBroadcasts(user.uid).then(list => { if (!cancelled) setQueue(list); });
    return () => { cancelled = true; };
  }, [user?.uid]);

  if (!user || queue.length === 0) return null;

  const current = queue[0];
  const title = lang === 'ar' ? current.titleAr : current.titleEn;
  const body = lang === 'ar' ? current.bodyAr : current.bodyEn;

  const acknowledge = async () => {
    setAcking(true);
    try {
      await markAsRead(current.id, user.uid);
      setQueue(q => q.slice(1));
    } finally {
      setAcking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative card w-full max-w-md overflow-hidden">
        <div className="bg-primary text-white px-4 py-3 flex items-center gap-2">
          <Megaphone size={18} />
          <span className="font-semibold text-sm">
            {lang === 'ar' ? 'رسالة من إدارة النظام' : 'Message from administration'}
          </span>
          {queue.length > 1 && (
            <span className="ms-auto text-[11px] bg-white/20 rounded-full px-2 py-0.5">
              {queue.length} {lang === 'ar' ? 'رسائل' : 'messages'}
            </span>
          )}
        </div>
        <div className="p-4 space-y-2">
          <h3 className="font-bold text-base">{title}</h3>
          {body && <p className="text-sm text-muted whitespace-pre-wrap">{body}</p>}
          <div className="text-[11px] text-muted">
            {current.createdAt ? fmtDateTime(current.createdAt, lang) : ''}
            {current.sentByName ? ` — ${current.sentByName}` : ''}
          </div>
        </div>
        <div className="px-4 pb-4">
          <button className="btn-primary w-full" onClick={acknowledge} disabled={acking}>
            <CheckCircle2 size={16} />
            {acking
              ? (lang === 'ar' ? 'جاري التسجيل...' : 'Recording...')
              : (lang === 'ar' ? 'استلام' : 'Received')}
          </button>
        </div>
      </div>
    </div>
  );
}
