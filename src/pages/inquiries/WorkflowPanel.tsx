import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Circle, CircleDot, ArrowRight, UserPlus, Flag, Clock, Info, ListTodo } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import { useLookups } from '@/hooks/useLookups';
import type { Inquiry, InquiryStatus, Priority, StatusHistory } from '@/types';
import { STATUSES, TRANSITIONS, MAIN_PATH, PRIORITIES, LOST_REASONS } from '@/constants/workflow';
import { transition, setPriority, assignEngineer } from '@/services/inquiries';
import { requestExtension } from '@/services/extensions';
import { Card, Modal, Field, Select, Textarea, Input, Spinner, StatusBadge } from '@/components/ui';
import { fmtDateTime, toInputDateTime } from '@/utils/format';

export default function WorkflowPanel({ inq, history }: { inq: Inquiry; history: StatusHistory[] }) {
  const { user, can } = useAuth();
  const { t, lang } = useI18n();
  const { settings } = useTheme();
  const { toast } = useToast();
  const { peopleFor } = useLookups();
  const navTo = useNavigate();
  const [target, setTarget] = useState<InquiryStatus | null>(null);
  const [note, setNote] = useState('');
  const [missing, setMissing] = useState<string[]>(['']);
  const [lost, setLost] = useState({ reason: '', competitorPrice: '', awardValue: '', poNumber: '' });
  const [busy, setBusy] = useState(false);
  const [prio, setPrio] = useState<{ p: Priority | ''; reason: string } | null>(null);
  const [assign, setAssign] = useState<string[] | null>(null);
  const [ext, setExt] = useState<{ deadline: string; reason: string } | null>(null);

  // engineers for this inquiry's market: real users plus roster members with no login
  const engineerOptions = peopleFor('engineer', inq.country);
  const isOwnerEngineer = inq.assignedEngineerId === user?.uid || (inq.engineerIds || []).includes(user?.uid || '-');
  const isOwnerSales = inq.salespersonId === user?.uid;
  const allowed = (TRANSITIONS[inq.status] || []).filter(s => {
    const def = STATUSES[s];
    if (can(def.permission)) return true;
    // owners may move their own inquiries along the ordinary path
    if ((isOwnerEngineer || isOwnerSales) && can('inquiries.change_status')) return true;
    return false;
  });

  const currentStep = STATUSES[inq.status].step;
  const mainIdx = MAIN_PATH.indexOf(inq.status);

  const doTransition = async () => {
    if (!target || !user) return;
    setBusy(true);
    try {
      const extra: Record<string, unknown> = {};
      if (target === 'WAITING_INFO') extra.missingInfo = missing.map(m => m.trim()).filter(Boolean);
      if (target === 'LOST') { extra.lostReason = lost.reason; extra.lostNote = note; if (lost.competitorPrice) extra.competitorPrice = Number(lost.competitorPrice); }
      if (target === 'WON') { if (lost.awardValue) extra.awardValue = Number(lost.awardValue); if (lost.poNumber) extra.poNumber = lost.poNumber; }
      const finalNote = target === 'WAITING_INFO' ? (note || missing.filter(Boolean).join('، ')) : note;
      await transition(inq, target, user, settings, { note: finalNote, extra });
      toast(t('inquiry.transitionDone')); setTarget(null); setNote(''); setMissing(['']);
    } catch (e: any) {
      toast(e?.message === 'note_required' ? t('inquiry.noteRequired') : e?.message === 'invalid_transition' ? t('inquiry.invalidTransition') : (e?.message || t('common.error')), 'error');
    } finally { setBusy(false); }
  };

  const doPriority = async () => {
    if (!prio?.p || !prio.reason.trim() || !user) return;
    setBusy(true);
    try { await setPriority(inq, prio.p, prio.reason, user, settings); toast(t('common.saved')); setPrio(null); }
    catch (e: any) { toast(e?.message || t('common.error'), 'error'); } finally { setBusy(false); }
  };

  const doAssign = async () => {
    if (!assign?.length || !user) return;
    const engs = assign
      .map(id => engineerOptions.find(e => e.id === id))
      .filter(Boolean)
      .map(e => ({ id: e!.id, name: e!.name, isUser: e!.isUser }));
    if (!engs.length) return;
    setBusy(true);
    try { await assignEngineer(inq, engs, user, settings); toast(t('common.saved')); setAssign(null); }
    catch (e: any) { toast(e?.message || t('common.error'), 'error'); } finally { setBusy(false); }
  };

  const doExtension = async () => {
    if (!ext?.deadline || !ext.reason.trim() || !user) return;
    setBusy(true);
    try { await requestExtension(inq, new Date(ext.deadline), ext.reason, user); toast(t('extension.submitted')); setExt(null); }
    catch (e: any) { toast(e?.message || t('common.error'), 'error'); } finally { setBusy(false); }
  };

  const needsNote = target ? STATUSES[target].requiresNote : false;

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <Card title={t('inquiry.workflow')} className="lg:col-span-2">
        <ol className="space-y-1">
          {MAIN_PATH.map((s, i) => {
            const def = STATUSES[s];
            const done = mainIdx >= 0 ? i < mainIdx : def.step < currentStep;
            const active = s === inq.status;
            const entry = history.find(h => h.to === s);
            return (
              <li key={s} className={clsx('flex items-center gap-3 px-2 py-1.5 rounded', active && 'bg-primary/10')}>
                {done ? <Check size={16} className="text-success" /> : active ? <CircleDot size={16} style={{ color: def.color }} /> : <Circle size={16} className="text-border" />}
                <span className={clsx('flex-1 text-sm', active && 'font-semibold', !done && !active && 'text-muted')}>{t(`status.${s}`)}</span>
                {entry && <span className="text-[11px] text-muted">{fmtDateTime(entry.at, lang)} — {entry.byName}</span>}
              </li>
            );
          })}
          {STATUSES[inq.status].step === 0 && (
            <li className="flex items-center gap-3 px-2 py-1.5 rounded bg-warning/10 mt-2">
              <CircleDot size={16} style={{ color: STATUSES[inq.status].color }} /><span className="text-sm font-semibold">{t(`status.${inq.status}`)}</span>
              {inq.missingInfo?.length ? <span className="text-xs text-muted">— {inq.missingInfo.join('، ')}</span> : null}
            </li>
          )}
        </ol>
      </Card>

      <div className="space-y-4">
        <Card title={t('inquiry.currentAction')}>
          <div className="space-y-2">
            {inq.processingStartedAt && <Row label={t('inquiry.startProcessing')} value={fmtDateTime(inq.processingStartedAt, lang)} />}
            {inq.missingInfoRequestedAt && <Row label={t('inquiry.requestInfo')} value={fmtDateTime(inq.missingInfoRequestedAt, lang)} />}
            {inq.missingInfoReceivedAt && <Row label={t('inquiry.infoReceived')} value={fmtDateTime(inq.missingInfoReceivedAt, lang)} />}
            {inq.priorityReason && <Row label={t('inquiry.priorityReason')} value={inq.priorityReason} />}
            {inq.lostReason && <Row label={t('inquiry.lostReason')} value={t(`lostReason.${inq.lostReason}`)} />}
            <div className="pt-2 space-y-2">
              {allowed.length > 0 && (
                <div>
                  <div className="label">{t('inquiry.moveTo')}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {allowed.map(s => <button key={s} className="btn-secondary btn-sm" onClick={() => setTarget(s)} style={{ borderColor: STATUSES[s].color }}><ArrowRight size={12} className="rtl:rotate-180" />{t(`status.${s}`)}</button>)}
                  </div>
                </div>
              )}
              {can('inquiries.set_priority') && !STATUSES[inq.status].isFinal && <button className="btn-secondary w-full" onClick={() => setPrio({ p: inq.priority || '', reason: '' })}><Flag size={15} />{t('inquiry.setPriority')}</button>}
              {can('inquiries.assign') && !STATUSES[inq.status].isFinal && <button className="btn-secondary w-full" onClick={() => setAssign(inq.engineerIds?.length ? [...inq.engineerIds] : (inq.assignedEngineerId ? [inq.assignedEngineerId] : []))}><UserPlus size={15} />{t('inquiry.assign')}</button>}
              {can('tasks.create') && !STATUSES[inq.status].isFinal && <button className="btn-secondary w-full" onClick={() => navTo(`/tasks?new=1&inquiry=${inq.id}`)}><ListTodo size={15} />{t('task.assignOnInquiry')}</button>}
              {can('extensions.request') && inq.deadlineAt && !STATUSES[inq.status].isFinal && (isOwnerEngineer || can('inquiries.view.all')) && <button className="btn-secondary w-full" onClick={() => setExt({ deadline: toInputDateTime(inq.deadlineAt), reason: '' })}><Clock size={15} />{t('inquiry.requestExtension')}</button>}
            </div>
          </div>
        </Card>
        {inq.missingInfo?.length ? (
          <Card title={t('inquiry.missingInfo')}>
            <ul className="list-disc ps-5 text-sm space-y-1">{inq.missingInfo.map((m, i) => <li key={i}>{m}</li>)}</ul>
          </Card>
        ) : null}
      </div>

      {/* transition modal */}
      <Modal open={!!target} onClose={() => setTarget(null)} title={<span className="flex items-center gap-2">{t('inquiry.changeStatus')}: {target && <StatusBadge status={target} />}</span>}
        footer={<><button className="btn-secondary" onClick={() => setTarget(null)}>{t('common.cancel')}</button><button className="btn-primary" onClick={doTransition} disabled={busy}>{busy ? <Spinner className="text-white" /> : t('common.confirm')}</button></>}>
        <div className="space-y-3">
          {target === 'WAITING_INFO' && (
            <Field label={t('inquiry.missingInfo')} required>
              {missing.map((m, i) => <Input key={i} className="mb-1" value={m} placeholder={t('inquiry.missingItem')} onChange={e => setMissing(missing.map((x, j) => j === i ? e.target.value : x))} />)}
              <button type="button" className="btn-ghost btn-sm" onClick={() => setMissing([...missing, ''])}>+ {t('inquiry.addItem')}</button>
            </Field>
          )}
          {target === 'LOST' && (<>
            <Field label={t('inquiry.lostReason')} required><Select options={LOST_REASONS.map(r => ({ value: r, label: t(`lostReason.${r}`) }))} value={lost.reason} onChange={e => setLost({ ...lost, reason: e.target.value })} /></Field>
            <Field label={`${t('inquiry.competitorPrice')} (${t('common.optional')})`}><Input type="number" value={lost.competitorPrice} onChange={e => setLost({ ...lost, competitorPrice: e.target.value })} /></Field>
          </>)}
          {target === 'WON' && (<>
            <Field label={t('inquiry.awardValue')}><Input type="number" value={lost.awardValue} onChange={e => setLost({ ...lost, awardValue: e.target.value })} /></Field>
            <Field label={t('inquiry.poNumber')}><Input value={lost.poNumber} onChange={e => setLost({ ...lost, poNumber: e.target.value })} /></Field>
          </>)}
          <Field label={t('inquiry.statusNote')} required={needsNote} hint={needsNote ? t('inquiry.noteRequired') : undefined}><Textarea value={note} onChange={e => setNote(e.target.value)} /></Field>
        </div>
      </Modal>

      {/* priority modal */}
      <Modal open={!!prio} onClose={() => setPrio(null)} title={t('inquiry.setPriority')} size="sm"
        footer={<><button className="btn-secondary" onClick={() => setPrio(null)}>{t('common.cancel')}</button><button className="btn-primary" onClick={doPriority} disabled={busy || !prio?.p || !prio?.reason.trim()}>{t('common.save')}</button></>}>
        <div className="space-y-3">
          <Field label={t('inquiry.priority')} required><Select options={PRIORITIES.map(p => ({ value: p.key, label: `${t(`priority.${p.key}`)} — ${settings.slaHours[p.key]} ${t('common.hours')}` }))} value={prio?.p || ''} onChange={e => setPrio({ ...prio!, p: e.target.value as Priority })} /></Field>
          <Field label={t('inquiry.priorityReason')} required><Textarea value={prio?.reason || ''} onChange={e => setPrio({ ...prio!, reason: e.target.value })} /></Field>
          <div className="text-xs text-muted flex items-start gap-1"><Info size={13} className="mt-0.5" />{t('inquiry.slaHours')}: {PRIORITIES.map(p => `${t(`priority.${p.key}`)} ${settings.slaHours[p.key]}`).join(' / ')}</div>
        </div>
      </Modal>

      {/* assign modal — several engineers may work the same inquiry; the first picked is the responsible one */}
      <Modal open={assign !== null} onClose={() => setAssign(null)} title={t('inquiry.assign')} size="sm"
        footer={<><button className="btn-secondary" onClick={() => setAssign(null)}>{t('common.cancel')}</button><button className="btn-primary" onClick={doAssign} disabled={busy || !assign?.length}>{t('common.save')}</button></>}>
        <Field label={t('inquiry.engineer')} required>
          <div className="border border-border rounded-md max-h-48 overflow-y-auto p-1">
            {engineerOptions.map(e => {
              const checked = (assign || []).includes(e.id);
              const order = (assign || []).indexOf(e.id);
              return (
                <label key={e.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-bg cursor-pointer text-sm">
                  <input type="checkbox" className="w-4 h-4" checked={checked}
                    onChange={ev => setAssign(ev.target.checked ? [...(assign || []), e.id] : (assign || []).filter(id => id !== e.id))} />
                  <span className="flex-1 truncate">{e.name}</span>
                  {order === 0 && checked && <span className="badge bg-primary/10 text-primary text-[10px]">{lang === 'ar' ? 'المسؤول الرئيسي' : 'Primary'}</span>}
                </label>
              );
            })}
          </div>
          {(assign || []).length > 1 && (
            <div className="text-[11px] text-muted mt-1">
              {lang === 'ar'
                ? `${assign!.length} مهندسين على هذا الاستفسار — أول مختار هو المسؤول الرئيسي وتُحسب عليه المدد`
                : `${assign!.length} engineers on this inquiry — the first selected is the responsible one for SLA`}
            </div>
          )}
        </Field>
      </Modal>

      {/* extension modal */}
      <Modal open={!!ext} onClose={() => setExt(null)} title={t('inquiry.requestExtension')} size="sm"
        footer={<><button className="btn-secondary" onClick={() => setExt(null)}>{t('common.cancel')}</button><button className="btn-primary" onClick={doExtension} disabled={busy || !ext?.reason.trim()}>{t('common.confirm')}</button></>}>
        <div className="space-y-3">
          <Row label={t('inquiry.currentDeadline')} value={fmtDateTime(inq.deadlineAt, lang)} />
          <Field label={t('inquiry.newDeadline')} required><Input type="datetime-local" value={ext?.deadline || ''} onChange={e => setExt({ ...ext!, deadline: e.target.value })} /></Field>
          <Field label={t('inquiry.extensionReason')} required><Textarea value={ext?.reason || ''} onChange={e => setExt({ ...ext!, reason: e.target.value })} /></Field>
        </div>
      </Modal>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex justify-between gap-3 text-sm"><span className="text-muted">{label}</span><span className="font-medium text-end">{value}</span></div>;
}
