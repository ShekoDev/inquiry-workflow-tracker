import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { orderBy, where } from 'firebase/firestore';
import { Plus, Play, Check, XCircle, Trash2, UserPlus, Users, Link2, AlertTriangle, Inbox } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import { useCollection } from '@/hooks/useCollection';
import { useLookups } from '@/hooks/useLookups';
import type { CountryCode, Inquiry, Priority, TaskStatus, WorkTask } from '@/types';
import { PRIORITIES } from '@/constants/workflow';
import { createTaskForMany, startTask, completeTask, cancelTask, reassignTask, deleteTask } from '@/services/tasks';
import {
  PageHeader, Card, Modal, Field, Input, Textarea, Select, Confirm, Spinner, Empty,
  PriorityBadge, CountryBadge, CountryFilter, Kpi, useTicker
} from '@/components/ui';
import { fmtDateTime, fmtDuration, toInputDateTime } from '@/utils/format';

const STATUS_COLORS: Record<TaskStatus, string> = {
  OPEN: '#D97706', IN_PROGRESS: '#2563EB', DONE: '#16A34A', CANCELLED: '#9CA3AF'
};

const TaskStatusBadge = ({ status }: { status: TaskStatus }) => {
  const { t } = useI18n();
  return <span className="badge text-white" style={{ background: STATUS_COLORS[status] }}>{t(`task.status.${status}`)}</span>;
};

export default function Tasks() {
  const { user, can } = useAuth();
  const { t, lang } = useI18n();
  const { settings } = useTheme();
  const { toast } = useToast();
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const { activeUsers } = useLookups();
  useTicker();

  const viewAll = can('tasks.view.all');
  // A manager subscribes to everything (single orderBy — no composite index);
  // everyone else subscribes only to their own tasks (single equality filter).
  const { data: raw, loading, error } = useCollection<WorkTask>(
    'tasks',
    viewAll ? [orderBy('createdAt', 'desc')] : [where('assignedTo', '==', user?.uid || '-')],
    [viewAll, user?.uid]
  );
  const { data: inquiries } = useCollection<Inquiry>(can('tasks.create') ? 'inquiries' : null, [orderBy('receivedAt', 'desc')], [can('tasks.create')]);

  const [tab, setTab] = useState<'mine' | 'all'>(viewAll ? 'all' : 'mine');
  const [status, setStatus] = useState<string>('');
  const [country, setCountry] = useState('');
  const [person, setPerson] = useState('');
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState<null | { title: string; description: string; assignedTos: string[]; priority: Priority; dueAt: string; inquiryId: string; country: CountryCode }>(null);
  const [done, setDone] = useState<null | { task: WorkTask; note: string }>(null);
  const [cancel, setCancel] = useState<null | { task: WorkTask; reason: string }>(null);
  const [move, setMove] = useState<null | { task: WorkTask; to: string }>(null);
  const [del, setDel] = useState<WorkTask | null>(null);

  // "أسند مهمة على هذا الاستفسار" deep-links here with ?inquiry=<id>&new=1
  useEffect(() => {
    if (sp.get('new') === '1' && can('tasks.create')) {
      const inqId = sp.get('inquiry') || '';
      const inq = inquiries.find(i => i.id === inqId);
      setForm({ title: '', description: '', assignedTos: [], priority: 'MEDIUM', dueAt: '', inquiryId: inqId, country: (inq?.country || settings.defaultCountry || 'SA') as CountryCode });
      setSp({});
    }
  }, [sp, inquiries.length]);

  const rows = useMemo(() => {
    // a task attached to a deleted inquiry is noise — the cascade removes it, this hides strays
    const liveInq = new Set(inquiries.filter(i => !i.isDeleted).map(i => i.id));
    const sorted = [...raw]
      .filter(x => !x.inquiryId || !inquiries.length || liveInq.has(x.inquiryId))
      .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
    return sorted
      .filter(x => tab === 'all' || x.assignedTo === user?.uid)
      .filter(x => !status || x.status === status)
      .filter(x => !country || x.country === country)
      .filter(x => !person || x.assignedTo === person)
      .filter(x => !q || [x.title, x.description, x.inquiryNo, x.assignedToName].some(v => (v || '').toLowerCase().includes(q.toLowerCase())));
  }, [raw, inquiries, tab, status, country, person, q, user?.uid]);

  const mine = raw.filter(x => x.assignedTo === user?.uid);
  const stats = {
    mineOpen: mine.filter(x => x.status === 'OPEN').length,
    mineRunning: mine.filter(x => x.status === 'IN_PROGRESS').length,
    allOpen: raw.filter(x => x.status === 'OPEN').length,
    overdue: raw.filter(x => x.status !== 'DONE' && x.status !== 'CANCELLED' && x.dueAt && x.dueAt.toDate() < new Date()).length
  };

  const submit = async () => {
    if (!form || !user || !form.title.trim() || !form.assignedTos.length) return;
    const inq = inquiries.find(i => i.id === form.inquiryId);
    const assignees = form.assignedTos
      .map(uid => activeUsers.find(u => u.uid === uid))
      .filter(Boolean)
      .map(u => ({ uid: u!.uid, name: u!.nameEn || u!.nameAr || u!.email }));
    setBusy(true);
    try {
      await createTaskForMany({
        title: form.title, description: form.description,
        priority: form.priority, dueAt: form.dueAt ? new Date(form.dueAt) : undefined,
        inquiryId: form.inquiryId || undefined, inquiryNo: inq?.inquiryNo, country: form.country
      }, assignees, user);
      toast(t('task.sent')); setForm(null);
    } catch (e: any) { toast(e?.message || t('common.error'), 'error'); } finally { setBusy(false); }
  };

  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); toast(t('common.saved')); }
    catch (e: any) { toast(e?.message || t('common.error'), 'error'); } finally { setBusy(false); }
  };

  const statusOpts = (['OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED'] as TaskStatus[]).map(s => ({ value: s, label: t(`task.status.${s}`) }));

  return (
    <div>
      <PageHeader title={t('task.title')} subtitle={t('task.hint')} actions={
        can('tasks.create') && <button className="btn-primary" onClick={() => setForm({ title: '', description: '', assignedTos: [], priority: 'MEDIUM', dueAt: '', inquiryId: '', country: (settings.defaultCountry || 'SA') as CountryCode })}>
          <Plus size={16} />{t('task.assign')}
        </button>
      } />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Kpi label={t('task.myOpen')} value={stats.mineOpen} color="#D97706" onClick={() => { setTab('mine'); setStatus('OPEN'); }} />
        <Kpi label={t('task.myRunning')} value={stats.mineRunning} color="#2563EB" onClick={() => { setTab('mine'); setStatus('IN_PROGRESS'); }} />
        {viewAll && <Kpi label={t('task.teamOpen')} value={stats.allOpen} color="#8B5CF6" onClick={() => { setTab('all'); setStatus('OPEN'); }} />}
        {viewAll && <Kpi label={t('task.overdue')} value={stats.overdue} color="#DC2626" />}
      </div>

      <div className="card card-body mb-4 space-y-3">
        {viewAll && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-border bg-surface p-0.5 gap-0.5">
              {(['mine', 'all'] as const).map(k => (
                <button key={k} onClick={() => setTab(k)} className={clsx('px-3 py-1 rounded-md text-xs transition', tab === k ? 'bg-primary text-white font-semibold' : 'text-muted hover:text-txt')}>
                  {t(`task.${k}`)}
                </button>
              ))}
            </div>
            <CountryFilter value={country} onChange={setCountry} allLabel={t('country.all')} />
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Input placeholder={t('common.search')} value={q} onChange={e => setQ(e.target.value)} className="col-span-2" />
          <Select options={statusOpts} value={status} onChange={e => setStatus(e.target.value)} placeholder={t('common.status')} />
          {viewAll && <Select options={activeUsers.map(u => ({ value: u.uid, label: u.nameEn || u.nameAr }))} value={person} onChange={e => setPerson(e.target.value)} placeholder={t('task.assignee')} />}
        </div>
      </div>

      {error && <div className="card card-body text-danger text-sm mb-4 flex items-center gap-2"><AlertTriangle size={16} />{error}</div>}
      {loading ? <div className="card card-body"><Spinner /></div>
        : rows.length === 0 ? <div className="card card-body"><Empty text={t('task.none')} /></div>
        : (
          <div className="space-y-3">
            {rows.map(x => {
              const isMine = x.assignedTo === user?.uid;
              const overdue = x.status !== 'DONE' && x.status !== 'CANCELLED' && x.dueAt && x.dueAt.toDate() < new Date();
              return (
                <Card key={x.id} bodyClass="p-3">
                  <div className="flex flex-wrap items-start gap-3">
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{x.title}</span>
                        <TaskStatusBadge status={x.status} />
                        <PriorityBadge priority={x.priority} />
                        {x.country && <CountryBadge country={x.country} compact />}
                        {x.groupId && <span className="badge bg-primary/10 text-primary flex items-center gap-1" title={lang === 'ar' ? 'مهمة مسندة لأكثر من مهندس' : 'Assigned to multiple engineers'}><Users size={11} />{lang === 'ar' ? 'جماعية' : 'Group'}</span>}
                        {overdue && <span className="badge bg-danger/15 text-danger flex items-center gap-1"><AlertTriangle size={11} />{t('task.overdue')}</span>}
                      </div>
                      {x.description && <div className="text-sm text-muted mt-1 whitespace-pre-wrap">{x.description}</div>}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted mt-2">
                        <span>{t('task.assignedBy')}: <b className="text-txt">{x.assignedByName}</b></span>
                        <span>{t('task.assignee')}: <b className="text-txt">{x.assignedToName}</b></span>
                        <span>{t('task.assignedAt')}: {fmtDateTime(x.createdAt, lang)}</span>
                        {x.dueAt && <span className={overdue ? 'text-danger' : ''}>{t('task.due')}: {fmtDateTime(x.dueAt, lang)}</span>}
                        {x.pickupMin !== undefined && <span>{t('task.pickup')}: {fmtDuration(x.pickupMin, lang)}</span>}
                        {x.completedAt && <span className="text-success">{t('task.completedAt')}: {fmtDateTime(x.completedAt, lang)}</span>}
                        {x.inquiryNo && (
                          <button className="text-primary flex items-center gap-1 hover:underline" onClick={() => nav(`/inquiries/${x.inquiryId}`)}>
                            <Link2 size={11} />{x.inquiryNo}
                          </button>
                        )}
                      </div>
                      {x.resultNote && <div className="text-xs mt-2 rounded bg-bg p-2">{x.resultNote}</div>}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {isMine && x.status === 'OPEN' && <button className="btn-primary btn-sm" disabled={busy} onClick={() => act(() => startTask(x, user!, settings))}><Play size={14} />{t('task.start')}</button>}
                      {isMine && x.status === 'IN_PROGRESS' && <button className="btn-primary btn-sm" onClick={() => setDone({ task: x, note: '' })}><Check size={14} />{t('task.complete')}</button>}
                      {can('tasks.edit') && x.status !== 'DONE' && x.status !== 'CANCELLED' && <button className="btn-secondary btn-sm" onClick={() => setMove({ task: x, to: x.assignedTo })}><UserPlus size={14} />{t('task.reassign')}</button>}
                      {can('tasks.edit') && x.status !== 'DONE' && x.status !== 'CANCELLED' && <button className="btn-secondary btn-sm" onClick={() => setCancel({ task: x, reason: '' })}><XCircle size={14} />{t('common.cancel')}</button>}
                      {can('tasks.delete') && <button className="btn-ghost btn-sm text-danger" onClick={() => setDel(x)}><Trash2 size={14} /></button>}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

      {/* assign */}
      <Modal open={!!form} onClose={() => setForm(null)} title={t('task.assign')}
        footer={<><button className="btn-secondary" onClick={() => setForm(null)}>{t('common.cancel')}</button>
          <button className="btn-primary" onClick={submit} disabled={busy || !form?.title.trim() || !form?.assignedTos.length}>{busy ? <Spinner className="text-white" /> : <><Inbox size={15} />{t('task.send')}</>}</button></>}>
        {form && <div className="grid md:grid-cols-2 gap-3">
          <Field label={t('task.taskTitle')} required className="md:col-span-2"><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder={t('task.titlePlaceholder')} /></Field>
          <Field label={t('task.details')} className="md:col-span-2"><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></Field>
          <Field label={t('task.assignee')} required hint={t('task.assigneeHint')}>
            <div className="border border-border rounded-md max-h-40 overflow-y-auto p-1">
              {activeUsers.map(u => (
                <label key={u.uid} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-bg cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    checked={form.assignedTos.includes(u.uid)}
                    onChange={e => setForm({
                      ...form,
                      assignedTos: e.target.checked
                        ? [...form.assignedTos, u.uid]
                        : form.assignedTos.filter(id => id !== u.uid)
                    })}
                  />
                  <span className="flex-1 truncate">{u.nameEn || u.nameAr || u.email}</span>
                </label>
              ))}
            </div>
            {form.assignedTos.length > 1 && (
              <div className="text-[11px] text-primary mt-1">
                {lang === 'ar'
                  ? `سيتم إنشاء ${form.assignedTos.length} مهام — نسخة لكل مهندس بتتبع استلامه ووقته الخاص`
                  : `${form.assignedTos.length} tasks will be created — one copy per engineer with his own receipt & timer`}
              </div>
            )}
          </Field>
          <Field label={t('inquiry.priority')} required>
            <Select options={PRIORITIES.map(p => ({ value: p.key, label: t(`priority.${p.key}`) }))} value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as Priority })} />
          </Field>
          <Field label={t('task.due')}><Input type="datetime-local" value={form.dueAt} onChange={e => setForm({ ...form, dueAt: e.target.value })} min={toInputDateTime(new Date())} /></Field>
          <Field label={t('task.linkInquiry')}>
            <Select options={inquiries.filter(i => !i.isDeleted).slice(0, 200).map(i => ({ value: i.id, label: `${i.inquiryNo} — ${i.clientName}` }))} value={form.inquiryId}
              onChange={e => { const inq = inquiries.find(i => i.id === e.target.value); setForm({ ...form, inquiryId: e.target.value, country: (inq?.country || form.country) as CountryCode }); }}
              placeholder={t('common.none')} />
          </Field>
        </div>}
      </Modal>

      {/* complete */}
      <Modal open={!!done} onClose={() => setDone(null)} size="sm" title={t('task.complete')}
        footer={<><button className="btn-secondary" onClick={() => setDone(null)}>{t('common.cancel')}</button>
          <button className="btn-primary" disabled={busy} onClick={async () => { if (done) { await act(() => completeTask(done.task, done.note, user!)); setDone(null); } }}>{t('common.confirm')}</button></>}>
        <Field label={t('task.resultNote')}><Textarea value={done?.note || ''} onChange={e => setDone({ ...done!, note: e.target.value })} /></Field>
      </Modal>

      {/* cancel */}
      <Modal open={!!cancel} onClose={() => setCancel(null)} size="sm" title={t('task.cancelTask')}
        footer={<><button className="btn-secondary" onClick={() => setCancel(null)}>{t('common.close')}</button>
          <button className="btn-danger" disabled={busy || !cancel?.reason.trim()} onClick={async () => { if (cancel) { await act(() => cancelTask(cancel.task, cancel.reason, user!)); setCancel(null); } }}>{t('common.confirm')}</button></>}>
        <Field label={t('common.reason')} required><Textarea value={cancel?.reason || ''} onChange={e => setCancel({ ...cancel!, reason: e.target.value })} /></Field>
      </Modal>

      {/* reassign */}
      <Modal open={!!move} onClose={() => setMove(null)} size="sm" title={t('task.reassign')}
        footer={<><button className="btn-secondary" onClick={() => setMove(null)}>{t('common.cancel')}</button>
          <button className="btn-primary" disabled={busy || !move?.to} onClick={async () => {
            if (!move) return;
            const to = activeUsers.find(u => u.uid === move.to); if (!to) return;
            await act(() => reassignTask(move.task, to.uid, to.nameEn || to.nameAr || to.email, user!)); setMove(null);
          }}>{t('common.save')}</button></>}>
        <Field label={t('task.assignee')} required>
          <Select options={activeUsers.map(u => ({ value: u.uid, label: u.nameEn || u.nameAr || u.email }))} value={move?.to || ''} onChange={e => setMove({ ...move!, to: e.target.value })} />
        </Field>
      </Modal>

      <Confirm open={!!del} onClose={() => setDel(null)} danger text={del ? `${t('common.delete')}: ${del.title}?` : ''}
        onConfirm={async () => { if (del) { await act(() => deleteTask(del)); setDel(null); } }} />
    </div>
  );
}
