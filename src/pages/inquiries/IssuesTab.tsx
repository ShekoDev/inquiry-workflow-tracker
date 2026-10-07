import { useState } from 'react';
import { Plus, CheckCircle2, Trash2, AlertOctagon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/i18n/I18nProvider';
import { useToast } from '@/contexts/ToastContext';
import { useLookups } from '@/hooks/useLookups';
import type { Inquiry, Issue, IssueSeverity, IssueType } from '@/types';
import { ISSUE_TYPES, ISSUE_SEVERITIES, SEVERITY_COLORS, createIssue, resolveIssue, deleteIssue } from '@/services/issues';
import { Card, Modal, Field, Input, Textarea, Select, Confirm, Spinner, Empty } from '@/components/ui';
import { fmtDateTime, fmtDuration } from '@/utils/format';

export default function IssuesTab({ inq, issues }: { inq: Inquiry; issues: Issue[] }) {
  const { user, can } = useAuth();
  const { t, lang } = useI18n();
  const { toast } = useToast();
  const { peopleFor } = useLookups();

  const [add, setAdd] = useState<null | { type: IssueType; severity: IssueSeverity; description: string; responsibleId: string; lostHours: string }>(null);
  const [fix, setFix] = useState<null | { issue: Issue; resolution: string }>(null);
  const [del, setDel] = useState<Issue | null>(null);
  const [busy, setBusy] = useState(false);

  // anyone who could be behind a hold-up: engineers, sales reps and roster members
  const people = [...peopleFor('engineer', inq.country), ...peopleFor('salesperson', inq.country)]
    .filter((p, i, a) => a.findIndex(x => x.id === p.id) === i);

  const open = issues.filter(i => i.status === 'OPEN');
  const lostTotal = issues.reduce((s, i) => s + (i.lostMin || 0), 0);

  const save = async () => {
    if (!add || !user || !add.description.trim()) return;
    setBusy(true);
    try {
      const who = people.find(p => p.id === add.responsibleId);
      await createIssue(inq, {
        type: add.type, severity: add.severity, description: add.description,
        responsibleId: add.responsibleId || undefined, responsibleName: who?.name,
        lostMin: add.lostHours ? Math.round(Number(add.lostHours) * 60) : undefined,
        country: inq.country
      }, user);
      toast(t('issue.logged')); setAdd(null);
    } catch (e: any) { toast(e?.message || t('common.error'), 'error'); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {can('issues.create') && (
          <button className="btn-primary" onClick={() => setAdd({ type: 'missing_info', severity: 'MEDIUM', description: '', responsibleId: '', lostHours: '' })}>
            <Plus size={16} />{t('issue.log')}
          </button>
        )}
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="badge bg-danger/15 text-danger">{t('issue.open')}: <b>{open.length}</b></span>
          <span className="badge bg-bg text-muted">{t('issue.total')}: <b>{issues.length}</b></span>
          {lostTotal > 0 && <span className="badge bg-warning/15 text-warning">{t('issue.lostTime')}: <b>{fmtDuration(lostTotal, lang)}</b></span>}
        </div>
      </div>

      {issues.length === 0 ? <Card><Empty text={t('issue.none')} /></Card> : issues.map(x => (
        <Card key={x.id} bodyClass="p-3">
          <div className="flex flex-wrap items-start gap-3">
            <AlertOctagon size={18} className="mt-0.5 shrink-0" style={{ color: SEVERITY_COLORS[x.severity] }} />
            <div className="flex-1 min-w-[200px]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="badge text-white" style={{ background: SEVERITY_COLORS[x.severity] }}>{t(`issue.severity.${x.severity}`)}</span>
                <span className="badge bg-primary/10 text-primary">{t(`issue.types.${x.type}`)}</span>
                <span className={`badge ${x.status === 'OPEN' ? 'bg-danger/15 text-danger' : 'bg-success/15 text-success'}`}>{t(`issue.status.${x.status}`)}</span>
              </div>
              <div className="text-sm mt-1.5 whitespace-pre-wrap">{x.description}</div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted mt-2">
                {x.responsibleName && <span>{t('issue.responsible')}: <b className="text-txt">{x.responsibleName}</b></span>}
                {x.lostMin ? <span className="text-warning">{t('issue.lostTime')}: <b>{fmtDuration(x.lostMin, lang)}</b></span> : null}
                <span>{t('issue.loggedBy')}: {x.createdByName} — {fmtDateTime(x.createdAt, lang)}</span>
                {x.resolvedAt && <span className="text-success">{t('issue.resolvedAt')}: {fmtDateTime(x.resolvedAt, lang)} — {x.resolvedByName}</span>}
              </div>
              {x.resolution && <div className="text-xs mt-2 rounded bg-success/10 p-2">{x.resolution}</div>}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {can('issues.resolve') && x.status === 'OPEN' && <button className="btn-primary btn-sm" onClick={() => setFix({ issue: x, resolution: '' })}><CheckCircle2 size={14} />{t('issue.resolve')}</button>}
              {can('issues.delete') && <button className="btn-ghost btn-sm text-danger" onClick={() => setDel(x)}><Trash2 size={14} /></button>}
            </div>
          </div>
        </Card>
      ))}

      <Modal open={!!add} onClose={() => setAdd(null)} title={t('issue.log')}
        footer={<><button className="btn-secondary" onClick={() => setAdd(null)}>{t('common.cancel')}</button>
          <button className="btn-primary" onClick={save} disabled={busy || !add?.description.trim()}>{busy ? <Spinner className="text-white" /> : t('common.save')}</button></>}>
        {add && <div className="grid md:grid-cols-2 gap-3">
          <Field label={t('issue.type')} required>
            <Select options={ISSUE_TYPES.map(x => ({ value: x, label: t(`issue.types.${x}`) }))} value={add.type} onChange={e => setAdd({ ...add, type: e.target.value as IssueType })} />
          </Field>
          <Field label={t('issue.severityLabel')} required>
            <Select options={ISSUE_SEVERITIES.map(x => ({ value: x, label: t(`issue.severity.${x}`) }))} value={add.severity} onChange={e => setAdd({ ...add, severity: e.target.value as IssueSeverity })} />
          </Field>
          <Field label={t('issue.description')} required className="md:col-span-2"><Textarea value={add.description} onChange={e => setAdd({ ...add, description: e.target.value })} /></Field>
          <Field label={t('issue.responsible')} hint={t('issue.responsibleHint')}>
            <Select options={people.map(p => ({ value: p.id, label: p.name }))} value={add.responsibleId} onChange={e => setAdd({ ...add, responsibleId: e.target.value })} placeholder={t('common.none')} />
          </Field>
          <Field label={t('issue.lostHours')} hint={t('issue.lostHoursHint')}>
            <Input type="number" min={0} step="0.5" value={add.lostHours} onChange={e => setAdd({ ...add, lostHours: e.target.value })} dir="ltr" />
          </Field>
        </div>}
      </Modal>

      <Modal open={!!fix} onClose={() => setFix(null)} size="sm" title={t('issue.resolve')}
        footer={<><button className="btn-secondary" onClick={() => setFix(null)}>{t('common.cancel')}</button>
          <button className="btn-primary" disabled={busy} onClick={async () => {
            if (!fix || !user) return;
            setBusy(true);
            try { await resolveIssue(fix.issue, fix.resolution, user); toast(t('common.saved')); setFix(null); }
            catch (e: any) { toast(e?.message || t('common.error'), 'error'); } finally { setBusy(false); }
          }}>{t('common.confirm')}</button></>}>
        <Field label={t('issue.resolution')}><Textarea value={fix?.resolution || ''} onChange={e => setFix({ ...fix!, resolution: e.target.value })} /></Field>
      </Modal>

      <Confirm open={!!del} onClose={() => setDel(null)} danger
        onConfirm={async () => { if (del) { try { await deleteIssue(del); toast(t('common.deleted')); } catch (e: any) { toast(e?.message || t('common.error'), 'error'); } setDel(null); } }} />
    </div>
  );
}
