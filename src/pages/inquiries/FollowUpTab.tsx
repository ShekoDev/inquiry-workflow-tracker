import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import type { FollowUp, Inquiry } from '@/types';
import { addFollowUp } from '@/services/inquiries';
import { Card, Modal, Field, Input, Textarea, Select, Spinner, Empty } from '@/components/ui';
import { fmtDateTime, fmtDate } from '@/utils/format';

const CHANNELS = ['call', 'whatsapp', 'email', 'visit', 'other'] as const;

export default function FollowUpTab({ inq, followups }: { inq: Inquiry; followups: FollowUp[] }) {
  const { user, can } = useAuth();
  const { t, lang } = useI18n();
  const { settings } = useTheme();
  const { toast } = useToast();
  const [f, setF] = useState<{ channel: string; note: string; result: string; nextAt: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const canAdd = can('follow_ups.create') && ['SENT_TO_CLIENT', 'FOLLOW_UP', 'CLIENT_REVISION'].includes(inq.status);

  const save = async () => {
    if (!f || !user || !f.note.trim()) return; setBusy(true);
    try { await addFollowUp(inq, { channel: f.channel, note: f.note, result: f.result, nextAt: f.nextAt ? new Date(f.nextAt) : undefined }, followups.length + 1, user, settings); toast(t('common.saved')); setF(null); }
    catch (e: any) { toast(e?.message || t('common.error'), 'error'); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted">{inq.nextFollowUpAt && <>{t('inquiry.nextFollowUp')}: <b>{fmtDate(inq.nextFollowUpAt, lang)}</b></>}</div>
        {canAdd && <button className="btn-primary" onClick={() => setF({ channel: 'call', note: '', result: '', nextAt: '' })}><Plus size={16} />{t('followup.add')}</button>}
      </div>
      {followups.length === 0 && <Empty text={t('followup.none')} />}
      {followups.map(fu => (
        <Card key={fu.id} title={`${t('followup.seq')}${fu.seq} — ${t(`channel.${fu.channel}`)}`} actions={<span className="text-xs text-muted">{fmtDateTime(fu.at, lang)} — {fu.byName}</span>}>
          <div className="text-sm whitespace-pre-wrap">{fu.note}</div>
          {fu.result && <div className="text-sm mt-1"><span className="text-muted">{t('followup.result')}:</span> {fu.result}</div>}
          {fu.nextAt && <div className="text-xs text-muted mt-1">{t('followup.nextAt')}: {fmtDate(fu.nextAt, lang)}</div>}
        </Card>
      ))}
      <Modal open={!!f} onClose={() => setF(null)} size="sm" title={t('followup.add')}
        footer={<><button className="btn-secondary" onClick={() => setF(null)}>{t('common.cancel')}</button><button className="btn-primary" onClick={save} disabled={busy || !f?.note.trim()}>{busy ? <Spinner className="text-white" /> : t('common.save')}</button></>}>
        {f && <div className="space-y-3">
          <Field label={t('followup.channel')}><Select options={CHANNELS.map(c => ({ value: c, label: t(`channel.${c}`) }))} value={f.channel} onChange={e => setF({ ...f, channel: e.target.value })} /></Field>
          <Field label={t('followup.note')} required><Textarea value={f.note} onChange={e => setF({ ...f, note: e.target.value })} /></Field>
          <Field label={t('followup.result')}><Input value={f.result} onChange={e => setF({ ...f, result: e.target.value })} /></Field>
          <Field label={t('followup.nextAt')}><Input type="date" value={f.nextAt} onChange={e => setF({ ...f, nextAt: e.target.value })} /></Field>
        </div>}
      </Modal>
    </div>
  );
}
