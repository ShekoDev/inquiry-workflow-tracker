import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { orderBy } from 'firebase/firestore';
import { Pencil, Trash2, AlertTriangle, Clock, PauseCircle, PlayCircle, Hourglass, Timer, FileText } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import { useCollection, useDoc } from '@/hooks/useCollection';
import type { Inquiry, Remark, StatusHistory, Attachment, FollowUp, Quotation, Issue } from '@/types';
import { PageHeader, Card, Tabs, StatusBadge, PriorityBadge, QStatusBadge, CountryBadge, SlaBar, Loading, Confirm, Spinner, useTicker } from '@/components/ui';
import { fmtDateTime, fmtDuration, fmtMoney } from '@/utils/format';
import { computeTimes } from '@/utils/sla';
import { STATUSES } from '@/constants/workflow';
import { deleteInquiry, acknowledgeInquiry } from '@/services/inquiries';
import WorkflowPanel from './WorkflowPanel';
import QuotationsTab from './QuotationsTab';
import IssuesTab from './IssuesTab';
import FollowUpTab from './FollowUpTab';
import AttachmentsTab from './AttachmentsTab';
import HistoryTab from './HistoryTab';
import { where } from 'firebase/firestore';

export default function InquiryDetail() {
  const { id } = useParams();
  const { user, can } = useAuth();
  const { t, lang, pick } = useI18n();
  const { settings } = useTheme();
  const { toast } = useToast();
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const tab = sp.get('tab') || 'workflow';
  const [del, setDel] = useState(false);
  const [ackBusy, setAckBusy] = useState(false);
  useTicker(); // the work clock below ticks while the page is open

  const { data: inq, loading } = useDoc<Inquiry>('inquiries', id);
  const { data: history } = useCollection<StatusHistory>(id ? `inquiries/${id}/history` : null, [orderBy('at', 'desc')], [id]);
  const { data: remarks } = useCollection<Remark>(id ? `inquiries/${id}/remarks` : null, [orderBy('at', 'desc')], [id]);
  const { data: attachments } = useCollection<Attachment>(id ? `inquiries/${id}/attachments` : null, [orderBy('at', 'desc')], [id]);
  const { data: followups } = useCollection<FollowUp>(id ? `inquiries/${id}/followups` : null, [orderBy('seq', 'desc')], [id]);
  const { data: quotations } = useCollection<Quotation>(id ? 'quotations' : null, [where('inquiryId', '==', id || '-')], [id]);
  const { data: issues } = useCollection<Issue>(id && can('issues.view') ? 'issues' : null, [where('inquiryId', '==', id || '-')], [id, can('issues.view')]);
  const sortedIssues = useMemo(() => [...issues].sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)), [issues]);
  const sortedQ = useMemo(() => [...quotations].sort((a, b) => b.revision - a.revision), [quotations]);

  if (loading) return <Loading />;
  if (!inq || inq.isDeleted) return <div className="text-muted">{t('common.noData')}</div>;

  const times = computeTimes(inq, settings);
  const isFinal = !!STATUSES[inq.status]?.isFinal;
  // whoever owns the inquiry, or anyone allowed to move it along, may confirm receipt
  const canAck = !inq.acknowledgedAt && !isFinal &&
    (can('inquiries.change_status') || can('inquiries.edit') || inq.assignedEngineerId === user?.uid || inq.salespersonId === user?.uid);

  const doAck = async () => {
    if (!user) return;
    setAckBusy(true);
    try { await acknowledgeInquiry(inq, user, settings); toast(t('inquiry.ackDone')); }
    catch (e: any) { toast(e?.message || t('common.error'), 'error'); }
    finally { setAckBusy(false); }
  };

  const tabs = [
    { key: 'workflow', label: t('inquiry.workflow') },
    { key: 'issues', label: t('issue.title'), count: issues.filter(i => i.status === 'OPEN').length },
    { key: 'quotations', label: t('inquiry.quotations'), count: quotations.length },
    { key: 'followups', label: t('inquiry.followUps'), count: followups.length },
    { key: 'attachments', label: t('inquiry.attachments'), count: attachments.length },
    { key: 'history', label: t('inquiry.history'), count: history.length + remarks.length }
  ].filter(tb => tb.key !== 'issues' || can('issues.view'));

  const onDelete = async () => { if (!user) return; await deleteInquiry(inq, user); toast(t('inquiry.deletedRecoverable')); nav('/inquiries'); };

  return (
    <div>
      <PageHeader
        title={<span className="flex items-center gap-3 flex-wrap"><span className="font-mono">{inq.inquiryNo}</span><StatusBadge status={inq.status} /><PriorityBadge priority={inq.priority} /></span>}
        subtitle={<span className="flex items-center gap-2 flex-wrap"><CountryBadge country={inq.country} />{inq.clientName}{inq.projectName ? ` — ${inq.projectName}` : ''}</span>}
        actions={<>
          {can('inquiries.edit') && <button className="btn-secondary" onClick={() => nav(`/inquiries/${inq.id}/edit`)}><Pencil size={16} />{t('common.edit')}</button>}
          {can('inquiries.delete') && <button className="btn-danger" onClick={() => setDel(true)}><Trash2 size={16} />{t('common.delete')}</button>}
        </>} />

      <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        <Info label={t('inquiry.salesperson')} value={inq.salespersonName} />
        <Info label={t('inquiry.engineer')} value={(inq.engineerNames?.length ? inq.engineerNames.join('، ') : inq.assignedEngineerName) || <span className="text-muted">{t('inquiry.unassigned')}</span>} />
        <Info label={t('inquiry.received')} value={fmtDateTime(inq.receivedAt, lang)} />
        <Info label={t('inquiry.deadline')} value={<span className={times.isOverdue ? 'text-danger font-semibold' : ''}>{fmtDateTime(inq.deadlineAt, lang)}{times.isOverdue && <span className="ms-2 inline-flex items-center gap-1 text-xs"><AlertTriangle size={12} />{fmtDuration(times.delayMin, lang)}</span>}</span>} />
        <Info label={t('inquiry.estimatedValue')} value={fmtMoney(inq.finalQuotationValue ?? inq.estimatedValue, lang, settings.currency)} />
      </div>
      <Card title={<span className="flex items-center gap-2"><Timer size={15} />{t('inquiry.tracking')}</span>} className="mb-4"
        actions={canAck && (
          <button className="btn-primary btn-sm" onClick={doAck} disabled={ackBusy}>
            {ackBusy ? <Spinner className="text-white" /> : <><PlayCircle size={15} />{t('inquiry.acknowledge')}</>}
          </button>
        )}>
        {!times.started ? (
          <div className="flex items-start gap-2 rounded-lg bg-warning/10 text-warning p-3 mb-3 text-sm">
            <Hourglass size={16} className="mt-0.5 shrink-0" />
            <div>
              <div className="font-semibold">{t('inquiry.notAcknowledged')} — {t('inquiry.waitingPickup')} {fmtDuration(times.responseMin, lang)}</div>
              {canAck && <div className="text-xs opacity-90 mt-0.5">{t('inquiry.ackHint')}</div>}
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted mb-3">
            <span className="badge bg-success/15 text-success">● {t('inquiry.acknowledged')}</span>
            <span>{t('inquiry.acknowledgedBy')}: <b className="text-txt">{inq.acknowledgedByName || '—'}</b></span>
            <span>{t('inquiry.acknowledgedAt')}: <b className="text-txt">{fmtDateTime(inq.acknowledgedAt, lang)}</b></span>
            {!isFinal && <span className="badge bg-info/15 text-info">{t('inquiry.workRunning')}</span>}
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <Info icon={<Hourglass size={14} />} label={t('inquiry.responseTime')} value={fmtDuration(times.responseMin, lang)} />
          <Info icon={<Clock size={14} />} label={t('inquiry.workTime')} value={fmtDuration(times.workingMin, lang)} />
          <Info icon={<PauseCircle size={14} />} label={t('inquiry.paused')} value={fmtDuration(times.pausedMin, lang)} />
          <Info icon={<Clock size={14} />} label={t('inquiry.totalElapsed')} value={fmtDuration(times.totalElapsedMin, lang)} />
          <Info icon={<AlertTriangle size={14} />} label={t('inquiry.remaining')}
            value={<span className={times.isOverdue ? 'text-danger' : ''}>{times.isOverdue ? `− ${fmtDuration(times.delayMin, lang)}` : fmtDuration(times.remainingMin, lang)}</span>} />
        </div>
        {inq.deadlineAt && (
          <div className="mt-3">
            <div className="flex justify-between text-[11px] text-muted mb-1"><span>{t('inquiry.slaUsed')}</span><span>{times.slaUsedPct}%</span></div>
            <SlaBar pct={times.slaUsedPct} overdue={times.isOverdue} />
          </div>
        )}
      </Card>

      {inq.currentQuotationNo && (
        <button className="card card-body mb-4 w-full flex flex-wrap items-center gap-3 text-start hover:border-primary transition" onClick={() => setSp({ tab: 'quotations' })}>
          <FileText size={16} className="text-primary" />
          <span className="text-[11px] text-muted">{t('inquiry.quotationNo')}</span>
          <span className="font-mono font-semibold">{inq.currentQuotationNo}{inq.currentQuotationRevision ? ` R${inq.currentQuotationRevision}` : ''}</span>
          {inq.currentQuotationStatus && <QStatusBadge status={inq.currentQuotationStatus} />}
          <span className="ms-auto text-sm font-medium">{fmtMoney(inq.finalQuotationValue, lang, settings.currency)}</span>
        </button>
      )}
      <Card className="mb-4" bodyClass="text-sm whitespace-pre-wrap">{pick(inq.scopeAr, inq.scopeEn)}</Card>

      <Tabs tabs={tabs} active={tab} onChange={k => setSp({ tab: k })} />
      <div className="mt-4">
        {tab === 'workflow' && <WorkflowPanel inq={inq} history={history} />}
        {tab === 'issues' && <IssuesTab inq={inq} issues={sortedIssues} />}
        {tab === 'quotations' && <QuotationsTab inq={inq} quotations={sortedQ} />}
        {tab === 'followups' && <FollowUpTab inq={inq} followups={followups} />}
        {tab === 'attachments' && <AttachmentsTab inq={inq} attachments={attachments} />}
        {tab === 'history' && <HistoryTab inq={inq} history={history} remarks={remarks} />}
      </div>
      <Confirm open={del} onClose={() => setDel(false)} onConfirm={onDelete} text={t('inquiry.deleteConfirm')} danger />
    </div>
  );
}

function Info({ label, value, icon }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="card card-body py-2">
      <div className="text-[11px] text-muted flex items-center gap-1">{icon}{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}
