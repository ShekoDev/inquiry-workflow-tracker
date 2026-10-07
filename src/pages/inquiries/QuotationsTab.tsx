import { useEffect, useState } from 'react';
import { Plus, Send, Check, RotateCcw, Printer, Pencil, ShieldCheck } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import type { Inquiry, Quotation } from '@/types';
import { SEND_CHANNELS } from '@/constants/workflow';
import { createQuotation, updateQuotation, submitForApproval, reviewQuotation, sendToSales, sendToClient, listApprovers } from '@/services/quotations';
import { Card, Modal, Field, Input, Textarea, Select, Spinner, QStatusBadge, Checkbox, Empty } from '@/components/ui';
import { fmtDateTime, fmtMoney } from '@/utils/format';
import { printDocument, tableHtml } from '@/utils/export';

type Approver = { uid: string; name: string; roleId: string };

export default function QuotationsTab({ inq, quotations }: { inq: Inquiry; quotations: Quotation[] }) {
  const { user, can } = useAuth();
  const { t, lang } = useI18n();
  const { settings } = useTheme();
  const { toast } = useToast();

  const [editor, setEditor] = useState<null | { base?: Quotation; revisionOf?: Quotation; quotationNo: string; total: string; notes: string; reason: string }>(null);
  const [submit, setSubmit] = useState<null | { q: Quotation; picked: string[] }>(null);
  const [review, setReview] = useState<null | { q: Quotation; decision: 'APPROVED' | 'REVISION_REQUIRED' | 'REJECTED'; remark: string }>(null);
  const [toClient, setToClient] = useState<null | { q: Quotation; channel: string }>(null);
  const [approvers, setApprovers] = useState<Approver[]>([]);
  const [busy, setBusy] = useState(false);

  const current = quotations.find(q => q.id === inq.currentQuotationId) || quotations[0];

  useEffect(() => { listApprovers().then(setApprovers).catch(() => setApprovers([])); }, []);

  const openSubmit = (q: Quotation) => {
    // the System Admin is the default destination; the department manager can be added on top
    const admins = approvers.filter(a => a.roleId === 'admin' || a.roleId === 'super_admin').map(a => a.uid);
    setSubmit({ q, picked: admins.length ? admins : approvers.map(a => a.uid) });
  };

  const save = async () => {
    if (!editor || !user || !editor.quotationNo.trim()) return;
    setBusy(true);
    try {
      if (editor.base) {
        await updateQuotation(editor.base, { quotationNo: editor.quotationNo, total: Number(editor.total) || 0, notes: editor.notes }, inq, user);
      } else {
        await createQuotation(inq, { quotationNo: editor.quotationNo, total: Number(editor.total) || 0, notes: editor.notes }, user, settings, editor.revisionOf, editor.reason);
      }
      toast(t('common.saved')); setEditor(null);
    } catch (e: any) {
      toast(e?.message === 'quotation_no_required' ? t('quotation.noRequired') : (e?.message || t('common.error')), 'error');
    } finally { setBusy(false); }
  };

  const act = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true);
    try { await fn(); toast(ok); }
    catch (e: any) { toast(e?.message === 'note_required' ? t('inquiry.noteRequired') : (e?.message || t('common.error')), 'error'); }
    finally { setBusy(false); }
  };

  const doPrint = (q: Quotation) => {
    printDocument({
      company: lang === 'ar' ? settings.companyNameAr : settings.companyNameEn,
      title: `${t('quotation.one')} ${q.quotationNo}${q.revision ? ` — Rev.${q.revision}` : ''}`,
      subtitle: `${inq.clientName}${inq.projectName ? ' — ' + inq.projectName : ''}`,
      dir: lang === 'ar' ? 'rtl' : 'ltr', lang,
      info: [
        { label: t('inquiry.no'), value: inq.inquiryNo },
        { label: t('quotation.no'), value: q.quotationNo },
        { label: t('common.status'), value: t(`qstatus.${q.status}`) },
        { label: t('inquiry.salesperson'), value: inq.salespersonName || '—' },
        { label: t('inquiry.engineer'), value: inq.assignedEngineerName || '—' }
      ]
    },
    `<h2 class="section">${t('inquiry.scope')}</h2><p>${lang === 'ar' ? (inq.scopeAr || inq.scopeEn) : (inq.scopeEn || inq.scopeAr)}</p>
     <h2 class="section">${t('quotation.summary')}</h2>
     ${tableHtml(
       [t('quotation.no'), t('quotation.revision'), t('quotation.total'), t('common.status'), t('quotation.issuedAt')],
       [[q.quotationNo, q.revision, fmtMoney(q.total, lang, q.currency || settings.currency), t(`qstatus.${q.status}`), fmtDateTime(q.createdAt, lang)]],
       { numericCols: [1, 2, 4] }
     )}
     ${q.notes ? `<h2 class="section">${t('quotation.notes')}</h2><p>${q.notes}</p>` : ''}`,
    { logoUrl: settings.logoUrl, signatures: [t('quotation.preparedBy'), t('quotation.approvedBy')] });
  };

  const canEditQ = (q: Quotation) => can('quotations.edit') && ['DRAFT', 'REVISION_REQUIRED'].includes(q.status);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {can('quotations.create') && (
          <button className="btn-primary" onClick={() => setEditor({ quotationNo: '', total: String(inq.estimatedValue || ''), notes: '', reason: '' })}>
            <Plus size={16} />{t('quotation.create')}
          </button>
        )}
        {can('quotations.create_revision') && current && ['APPROVED', 'SENT_TO_SALES', 'SENT_TO_CLIENT', 'REVISION_REQUIRED'].includes(current.status) && (
          <button className="btn-secondary" onClick={() => setEditor({ revisionOf: current, quotationNo: current.quotationNo, total: String(current.total), notes: current.notes || '', reason: '' })}>
            <RotateCcw size={16} />{t('quotation.newRevision')}
          </button>
        )}
      </div>

      {quotations.length === 0 ? <Card><Empty text={t('quotation.noQuotations')} /></Card> : quotations.map(q => (
        <Card key={q.id} bodyClass="p-3">
          <div className="flex flex-wrap items-start gap-3">
            <div className="flex-1 min-w-[220px]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono font-bold text-primary text-base">{q.quotationNo}</span>
                {q.revision > 0 && <span className="badge bg-bg text-muted">Rev.{q.revision}</span>}
                <QStatusBadge status={q.status} />
                {q.id === inq.currentQuotationId && <span className="badge bg-primary/10 text-primary">{t('quotation.current')}</span>}
              </div>
              <div className="text-lg font-semibold mt-1">{fmtMoney(q.total, lang, q.currency || settings.currency)}</div>
              {q.notes && <div className="text-sm text-muted mt-1 whitespace-pre-wrap">{q.notes}</div>}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted mt-2">
                <span>{t('quotation.issuedBy')}: <b className="text-txt">{q.createdByName}</b></span>
                <span>{fmtDateTime(q.createdAt, lang)}</span>
                {q.approverNames?.length ? <span className="flex items-center gap-1"><ShieldCheck size={11} />{t('quotation.sentFor')}: <b className="text-txt">{q.approverNames.join('، ')}</b></span> : null}
                {q.reviewedByName && <span>{t('quotation.reviewedBy')}: <b className="text-txt">{q.reviewedByName}</b> — {fmtDateTime(q.reviewedAt, lang)}</span>}
              </div>
              {q.reviewRemark && <div className={clsx('text-xs mt-2 rounded p-2', q.status === 'APPROVED' ? 'bg-success/10' : 'bg-warning/10')}>{q.reviewRemark}</div>}
              {q.revisionReason && <div className="text-xs mt-2 rounded bg-bg p-2">{t('quotation.revisionReason')}: {q.revisionReason}</div>}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {canEditQ(q) && <button className="btn-secondary btn-sm" onClick={() => setEditor({ base: q, quotationNo: q.quotationNo, total: String(q.total), notes: q.notes || '', reason: '' })}><Pencil size={14} />{t('common.edit')}</button>}
              {can('quotations.submit_for_approval') && ['DRAFT', 'REVISION_REQUIRED'].includes(q.status) && <button className="btn-primary btn-sm" onClick={() => openSubmit(q)}><Send size={14} />{t('quotation.submit')}</button>}
              {can('quotations.approve') && q.status === 'UNDER_REVIEW' && <button className="btn-primary btn-sm" onClick={() => setReview({ q, decision: 'APPROVED', remark: '' })}><Check size={14} />{t('quotation.review')}</button>}
              {can('quotations.send_to_sales') && q.status === 'APPROVED' && <button className="btn-primary btn-sm" disabled={busy} onClick={() => act(() => sendToSales(q, inq, user!, settings), t('quotation.sent'))}><Send size={14} />{t('quotation.sendToSales')}</button>}
              {can('quotations.send_to_client') && q.status === 'SENT_TO_SALES' && <button className="btn-primary btn-sm" onClick={() => setToClient({ q, channel: 'email' })}><Send size={14} />{t('quotation.sendToClient')}</button>}
              <button className="btn-secondary btn-sm" onClick={() => doPrint(q)}><Printer size={14} />{t('common.pdf')}</button>
            </div>
          </div>
        </Card>
      ))}

      {/* create / edit / revise */}
      <Modal open={!!editor} onClose={() => setEditor(null)} title={editor?.base ? t('common.edit') : editor?.revisionOf ? t('quotation.newRevision') : t('quotation.create')}
        footer={<><button className="btn-secondary" onClick={() => setEditor(null)}>{t('common.cancel')}</button>
          <button className="btn-primary" onClick={save} disabled={busy || !editor?.quotationNo.trim()}>{busy ? <Spinner className="text-white" /> : t('common.save')}</button></>}>
        {editor && <div className="space-y-3">
          <div className="text-xs text-muted rounded bg-bg p-2">{t('quotation.fromMainSystem')}</div>
          <Field label={t('quotation.no')} required hint={editor.revisionOf ? t('quotation.sameNoOnRevision') : undefined}>
            <Input value={editor.quotationNo} onChange={e => setEditor({ ...editor, quotationNo: e.target.value })} disabled={!!editor.revisionOf} dir="ltr" className="font-mono" placeholder="QTN-2026-0001" />
          </Field>
          <Field label={`${t('quotation.total')} (${settings.currency})`} required>
            <Input type="number" min={0} step="0.01" value={editor.total} onChange={e => setEditor({ ...editor, total: e.target.value })} dir="ltr" />
          </Field>
          <Field label={t('quotation.notes')}><Textarea value={editor.notes} onChange={e => setEditor({ ...editor, notes: e.target.value })} /></Field>
          {editor.revisionOf && <Field label={t('quotation.revisionReason')} required><Textarea value={editor.reason} onChange={e => setEditor({ ...editor, reason: e.target.value })} /></Field>}
        </div>}
      </Modal>

      {/* submit for approval — pick who it goes to */}
      <Modal open={!!submit} onClose={() => setSubmit(null)} size="sm" title={t('quotation.submit')}
        footer={<><button className="btn-secondary" onClick={() => setSubmit(null)}>{t('common.cancel')}</button>
          <button className="btn-primary" disabled={busy || !submit?.picked.length} onClick={async () => {
            if (!submit) return;
            const picked = approvers.filter(a => submit.picked.includes(a.uid)).map(a => ({ uid: a.uid, name: a.name }));
            await act(() => submitForApproval(submit.q, inq, user!, settings, picked), t('quotation.submitted'));
            setSubmit(null);
          }}>{t('quotation.send')}</button></>}>
        {submit && <div className="space-y-2">
          <div className="text-xs text-muted">{t('quotation.approverHint')}</div>
          {approvers.length === 0 && <div className="text-danger text-sm">{t('quotation.noApprovers')}</div>}
          {approvers.map(a => {
            const isAdmin = a.roleId === 'admin' || a.roleId === 'super_admin';
            const locked = isAdmin || !can('quotations.choose_approver');
            return (
              <label key={a.uid} className={clsx('flex items-center gap-2 rounded border border-border px-2 py-1.5 text-sm', locked && 'bg-bg')}>
                <input type="checkbox" className="accent-[rgb(var(--c-primary))]" checked={submit.picked.includes(a.uid)} disabled={locked}
                  onChange={e => setSubmit({ ...submit, picked: e.target.checked ? [...submit.picked, a.uid] : submit.picked.filter(x => x !== a.uid) })} />
                <span className="flex-1">{a.name}</span>
                <span className="badge bg-primary/10 text-primary text-[10px]">{a.roleId}</span>
                {isAdmin && <span className="text-[10px] text-muted">{t('quotation.defaultApprover')}</span>}
              </label>
            );
          })}
        </div>}
      </Modal>

      {/* review */}
      <Modal open={!!review} onClose={() => setReview(null)} size="sm" title={t('quotation.review')}
        footer={<><button className="btn-secondary" onClick={() => setReview(null)}>{t('common.cancel')}</button>
          <button className="btn-primary" disabled={busy} onClick={async () => {
            if (!review) return;
            await act(() => reviewQuotation(review.q, inq, review.decision, review.remark, user!, settings), review.decision === 'APPROVED' ? t('quotation.approved') : t('quotation.returned'));
            setReview(null);
          }}>{t('common.confirm')}</button></>}>
        {review && <div className="space-y-3">
          <Field label={t('common.confirm')} required>
            <Select options={[
              { value: 'APPROVED', label: t('quotation.approve') },
              { value: 'REVISION_REQUIRED', label: t('quotation.returnRevision') },
              { value: 'REJECTED', label: t('quotation.reject') }
            ]} value={review.decision} onChange={e => setReview({ ...review, decision: e.target.value as any })} />
          </Field>
          <Field label={t('quotation.reviewRemark')} required={review.decision !== 'APPROVED'}>
            <Textarea value={review.remark} onChange={e => setReview({ ...review, remark: e.target.value })} />
          </Field>
        </div>}
      </Modal>

      {/* send to client */}
      <Modal open={!!toClient} onClose={() => setToClient(null)} size="sm" title={t('quotation.sendToClient')}
        footer={<><button className="btn-secondary" onClick={() => setToClient(null)}>{t('common.cancel')}</button>
          <button className="btn-primary" disabled={busy} onClick={async () => {
            if (!toClient) return;
            await act(() => sendToClient(toClient.q, inq, toClient.channel, user!, settings), t('quotation.sent'));
            setToClient(null);
          }}>{t('common.confirm')}</button></>}>
        <Field label={t('quotation.channel')} required>
          <Select options={SEND_CHANNELS.map(c => ({ value: c, label: t(`channel.${c}`) }))} value={toClient?.channel || 'email'} onChange={e => setToClient({ ...toClient!, channel: e.target.value })} />
        </Field>
      </Modal>
    </div>
  );
}
