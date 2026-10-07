import { useState } from 'react';
import { MessageSquarePlus, ArrowLeftRight, MessageSquare } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/i18n/I18nProvider';
import { useToast } from '@/contexts/ToastContext';
import type { Inquiry, Remark, StatusHistory } from '@/types';
import { addRemark } from '@/services/inquiries';
import { Card, Textarea, Spinner } from '@/components/ui';
import { fmtDateTime } from '@/utils/format';
import { STATUSES } from '@/constants/workflow';

export default function HistoryTab({ inq, history, remarks }: { inq: Inquiry; history: StatusHistory[]; remarks: Remark[] }) {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const { toast } = useToast();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const items = [
    ...history.map(h => ({ id: 'h' + h.id, at: h.at, kind: 'status' as const, h })),
    ...remarks.map(r => ({ id: 'r' + r.id, at: r.at, kind: 'remark' as const, r }))
  ].sort((a, b) => (b.at?.toMillis?.() || 0) - (a.at?.toMillis?.() || 0));

  const save = async () => {
    if (!text.trim() || !user) return; setBusy(true);
    try { await addRemark(inq, text.trim(), user); setText(''); toast(t('common.saved')); }
    catch (e: any) { toast(e?.message || t('common.error'), 'error'); } finally { setBusy(false); }
  };

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <Card title={t('inquiry.history')} className="lg:col-span-2">
        <ol className="relative border-s border-border ms-2 space-y-4">
          {items.map(it => (
            <li key={it.id} className="ms-4">
              <span className="absolute -start-1.5 mt-1.5 h-3 w-3 rounded-full" style={{ background: it.kind === 'status' && it.h.to in STATUSES ? STATUSES[it.h.to as keyof typeof STATUSES].color : '#94A3B8' }} />
              <div className="text-[11px] text-muted">{fmtDateTime(it.at, lang)} — {it.kind === 'status' ? it.h.byName : it.r.byName}</div>
              {it.kind === 'status' ? (
                <div className="text-sm flex items-center gap-2 flex-wrap"><ArrowLeftRight size={13} className="text-muted" />
                  {it.h.from && it.h.from !== it.h.to && <><span>{t(`status.${it.h.from}`)}</span><span>←</span></>}
                  <b>{it.h.to in STATUSES ? t(`status.${it.h.to}`) : it.h.to}</b>
                  {it.h.note && <span className="text-muted">— {it.h.note}</span>}
                </div>
              ) : (
                <div className="text-sm flex items-start gap-2"><MessageSquare size={13} className="text-muted mt-1" /><span className="whitespace-pre-wrap">{it.r.text}</span></div>
              )}
            </li>
          ))}
        </ol>
      </Card>
      <Card title={t('inquiry.addRemark')}>
        <Textarea value={text} onChange={e => setText(e.target.value)} />
        <button className="btn-primary mt-2 w-full" onClick={save} disabled={busy || !text.trim()}>{busy ? <Spinner className="text-white" /> : <><MessageSquarePlus size={16} />{t('common.add')}</>}</button>
      </Card>
    </div>
  );
}
