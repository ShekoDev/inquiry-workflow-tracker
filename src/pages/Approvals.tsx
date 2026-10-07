import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { where } from 'firebase/firestore';
import { CheckCircle2, RotateCcw, XCircle, ExternalLink } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import { useCollection } from '@/hooks/useCollection';
import type { Inquiry, Quotation } from '@/types';
import { reviewQuotation } from '@/services/quotations';
import { getInquiry } from '@/services/inquiries';
import { PageHeader, DataTable, Modal, Field, Textarea, QStatusBadge, type Column } from '@/components/ui';
import { fmtMoney, fmtDateTime } from '@/utils/format';

export default function Approvals() {
  const { user, can } = useAuth();
  const { t, lang } = useI18n();
  const { settings } = useTheme();
  const { toast } = useToast();
  const nav = useNavigate();
  // Single equality filter only — no composite index required. Oldest first (FIFO) is applied client-side.
  const { data: raw, loading, error } = useCollection<Quotation>('quotations', [where('status', '==', 'UNDER_REVIEW')]);
  const { data: inquiries } = useCollection<Inquiry>('inquiries');
  const rows = useMemo(() => {
    // never queue a quotation whose inquiry has been deleted
    const live = new Set(inquiries.filter(i => !i.isDeleted).map(i => i.id));
    return [...raw].filter(q => live.has(q.inquiryId)).sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0));
  }, [raw, inquiries]);
  const [review, setReview] = useState<{ q: Quotation; decision: 'APPROVED' | 'REVISION_REQUIRED' | 'REJECTED'; remark: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const decide = async () => {
    if (!review || !user) return; setBusy(true);
    try {
      const inq = await getInquiry(review.q.inquiryId); if (!inq) throw new Error('inquiry');
      await reviewQuotation(review.q, inq, review.decision, review.remark, user, settings);
      toast(t('common.success')); setReview(null);
    } catch (e: any) { toast(e?.message === 'note_required' ? t('inquiry.noteRequired') : (e?.message || t('common.error')), 'error'); } finally { setBusy(false); }
  };

  const cols: Column<Quotation>[] = [
    { key: 'no', header: t('quotation.no'), render: r => <span className="font-mono">{r.quotationNo} <span className="text-xs text-muted">Rev.{r.revision}</span></span> },
    { key: 'inq', header: t('inquiry.no'), render: r => <button className="text-primary underline flex items-center gap-1" onClick={e => { e.stopPropagation(); nav(`/inquiries/${r.inquiryId}?tab=quotations`); }}>{r.inquiryNo}<ExternalLink size={12} /></button> },
    { key: 'client', header: t('inquiry.client'), render: r => r.clientName },
    { key: 'total', header: t('quotation.total'), render: r => <b>{fmtMoney(r.total, lang, settings.currency)}</b> },
    { key: 'sentTo', header: t('quotation.sentFor'), render: r => <span className="text-xs">{(r.approverNames || []).join('، ') || '—'}</span> },
    { key: 'by', header: t('common.by'), render: r => <div className="text-xs">{r.createdByName}<br />{fmtDateTime(r.createdAt, lang)}</div> },
    { key: 'status', header: t('common.status'), render: r => <QStatusBadge status={r.status} /> },
    { key: 'act', header: t('common.actions'), render: r => <div className="flex gap-1">
      {can('quotations.approve') && <button className="btn-success btn-sm" onClick={e => { e.stopPropagation(); setReview({ q: r, decision: 'APPROVED', remark: '' }); }}><CheckCircle2 size={13} />{t('quotation.approve')}</button>}
      {can('quotations.reject') && <><button className="btn-secondary btn-sm" onClick={e => { e.stopPropagation(); setReview({ q: r, decision: 'REVISION_REQUIRED', remark: '' }); }}><RotateCcw size={13} /></button><button className="btn-danger btn-sm" onClick={e => { e.stopPropagation(); setReview({ q: r, decision: 'REJECTED', remark: '' }); }}><XCircle size={13} /></button></>}
    </div> }
  ];

  return (
    <div>
      <PageHeader title={t('quotation.approvalQueue')} subtitle={`${rows.length}`} />
      {error && <div className="card card-body mb-3 text-sm text-danger">{error}</div>}
      <div className="card"><DataTable columns={cols} rows={rows} loading={loading} empty={t('quotation.nothingToApprove')} onRowClick={r => nav(`/inquiries/${r.inquiryId}?tab=quotations`)} /></div>
      <Modal open={!!review} onClose={() => setReview(null)} size="sm" title={review ? `${t(`quotation.${review.decision === 'APPROVED' ? 'approve' : review.decision === 'REJECTED' ? 'reject' : 'returnRevision'}`)} — ${review.q.quotationNo}` : ''}
        footer={<><button className="btn-secondary" onClick={() => setReview(null)}>{t('common.cancel')}</button><button className={review?.decision === 'APPROVED' ? 'btn-success' : 'btn-danger'} onClick={decide} disabled={busy}>{t('common.confirm')}</button></>}>
        <Field label={t('quotation.reviewRemark')} required={review?.decision !== 'APPROVED'}><Textarea value={review?.remark || ''} onChange={e => setReview({ ...review!, remark: e.target.value })} /></Field>
      </Modal>
    </div>
  );
}
