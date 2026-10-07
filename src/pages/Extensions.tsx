import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { orderBy } from 'firebase/firestore';
import { CheckCircle2, XCircle, CalendarClock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/i18n/I18nProvider';
import { useToast } from '@/contexts/ToastContext';
import { useCollection } from '@/hooks/useCollection';
import type { ExtensionRequest } from '@/types';
import { decideExtension } from '@/services/extensions';
import { PageHeader, DataTable, Modal, Field, Textarea, Input, Tabs, type Column } from '@/components/ui';
import { fmtDateTime, fmtDuration, toInputDateTime } from '@/utils/format';

export default function Extensions() {
  const { user, can } = useAuth();
  const { t, lang } = useI18n();
  const { toast } = useToast();
  const nav = useNavigate();
  const { data: all, loading } = useCollection<ExtensionRequest>('extension_requests', [orderBy('requestedAt', 'desc')]);
  const approver = can('extensions.approve') || can('extensions.reject');
  const [tab, setTab] = useState(approver ? 'pending' : 'mine');
  const [dec, setDec] = useState<{ r: ExtensionRequest; decision: 'APPROVED' | 'REJECTED'; note: string; deadline: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const rows = useMemo(() => tab === 'pending' ? all.filter(r => r.status === 'PENDING') : tab === 'mine' ? all.filter(r => r.requestedBy === user?.uid) : all, [all, tab, user?.uid]);

  const decide = async () => {
    if (!dec || !user) return; setBusy(true);
    try { await decideExtension(dec.r, dec.decision, dec.note, user, dec.decision === 'APPROVED' && dec.deadline ? new Date(dec.deadline) : undefined); toast(t('extension.decided')); setDec(null); }
    catch (e: any) { toast(e?.message || t('common.error'), 'error'); } finally { setBusy(false); }
  };

  const statusColor = { PENDING: 'bg-warning/15 text-warning', APPROVED: 'bg-success/15 text-success', REJECTED: 'bg-danger/15 text-danger' };
  const cols: Column<ExtensionRequest>[] = [
    { key: 'inq', header: t('inquiry.no'), render: r => <button className="font-mono text-primary underline" onClick={e => { e.stopPropagation(); nav(`/inquiries/${r.inquiryId}`); }}>{r.inquiryNo}</button> },
    { key: 'cur', header: t('inquiry.currentDeadline'), render: r => fmtDateTime(r.currentDeadline, lang) },
    { key: 'req', header: t('inquiry.newDeadline'), render: r => <div>{fmtDateTime(r.approvedDeadline || r.requestedDeadline, lang)}<div className="text-[11px] text-muted">+{fmtDuration(((r.requestedDeadline?.toMillis?.() || 0) - (r.currentDeadline?.toMillis?.() || 0)) / 60000, lang)}</div></div> },
    { key: 'reason', header: t('common.reason'), render: r => <span className="line-clamp-2 max-w-[260px]">{r.reason}</span> },
    { key: 'by', header: t('extension.requestedBy'), render: r => <div className="text-xs">{r.requestedByName}<br />{fmtDateTime(r.requestedAt, lang)}</div> },
    { key: 'status', header: t('common.status'), render: r => <div><span className={`badge ${statusColor[r.status]}`}>{t(`extension.status.${r.status}`)}</span>{r.decisionNote && <div className="text-[11px] text-muted mt-1">{r.decidedByName}: {r.decisionNote}</div>}</div> },
    { key: 'act', header: t('common.actions'), render: r => r.status === 'PENDING' && approver ? <div className="flex gap-1">
      <button className="btn-success btn-sm" onClick={() => setDec({ r, decision: 'APPROVED', note: '', deadline: toInputDateTime(r.requestedDeadline) })}><CheckCircle2 size={13} />{t('extension.approve')}</button>
      <button className="btn-danger btn-sm" onClick={() => setDec({ r, decision: 'REJECTED', note: '', deadline: '' })}><XCircle size={13} />{t('extension.reject')}</button>
    </div> : null }
  ];

  return (
    <div>
      <PageHeader title={t('extension.title')} />
      <Tabs active={tab} onChange={setTab} tabs={[
        ...(approver ? [{ key: 'pending', label: t('extension.pending'), count: all.filter(r => r.status === 'PENDING').length }] : []),
        { key: 'mine', label: t('extension.mine'), count: all.filter(r => r.requestedBy === user?.uid).length },
        ...(can('inquiries.view.all') ? [{ key: 'all', label: t('common.all'), count: all.length }] : [])
      ]} />
      <div className="card mt-4"><DataTable columns={cols} rows={rows} loading={loading} empty={t('extension.none')} /></div>
      <Modal open={!!dec} onClose={() => setDec(null)} size="sm" title={dec ? `${t(`extension.${dec.decision === 'APPROVED' ? 'approve' : 'reject'}`)} — ${dec.r.inquiryNo}` : ''}
        footer={<><button className="btn-secondary" onClick={() => setDec(null)}>{t('common.cancel')}</button><button className={dec?.decision === 'APPROVED' ? 'btn-success' : 'btn-danger'} onClick={decide} disabled={busy}>{t('common.confirm')}</button></>}>
        {dec && <div className="space-y-3">
          {dec.decision === 'APPROVED' && <Field label={t('extension.approveWith')} hint={t('inquiry.newDeadline')}><div className="flex items-center gap-2"><CalendarClock size={16} className="text-muted" /><Input type="datetime-local" value={dec.deadline} onChange={e => setDec({ ...dec, deadline: e.target.value })} /></div></Field>}
          <Field label={t('extension.decisionNote')} required={dec.decision === 'REJECTED'}><Textarea value={dec.note} onChange={e => setDec({ ...dec, note: e.target.value })} /></Field>
        </div>}
      </Modal>
    </div>
  );
}
