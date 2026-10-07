import { useMemo, useState } from 'react';
import { orderBy } from 'firebase/firestore';
import { FileSpreadsheet, Printer } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/contexts/ThemeContext';
import { useCollection } from '@/hooks/useCollection';
import type { Inquiry, Issue, Quotation, ExtensionRequest, Lang, WorkTask } from '@/types';
import { STATUSES, PENDING_QUOTE_STATUSES } from '@/constants/workflow';
import { PageHeader, Card, Field, Select, Input, Loading, Empty, CountryFilter } from '@/components/ui';
import { computeTimes } from '@/utils/sla';
import { fmtDate, fmtDateTime, fmtDuration, fmtMoney, fmtPct } from '@/utils/format';
import { exportRowsToExcel, printDocument, tableHtml, type DocMeta } from '@/utils/export';
import ar from '@/i18n/ar';
import en from '@/i18n/en';

type ReportKey = 'eod' | 'overdue' | 'durations' | 'aging' | 'engineerPerf' | 'salesPerf' | 'winRate' | 'lostAnalysis'
  | 'quotationsIssued' | 'issues' | 'issuesByPerson' | 'tasks' | 'waitingInfo' | 'extensions' | 'workload';
const REPORTS: ReportKey[] = ['eod', 'overdue', 'durations', 'aging', 'engineerPerf', 'salesPerf', 'winRate', 'lostAnalysis',
  'quotationsIssued', 'issues', 'issuesByPerson', 'tasks', 'waitingInfo', 'extensions', 'workload'];

const dget = (o: any, p: string) => p.split('.').reduce((a, k) => a?.[k], o) ?? p;

export default function Reports() {
  const { user, can } = useAuth();
  const { t, lang } = useI18n();
  const { settings } = useTheme();
  const [key, setKey] = useState<ReportKey>('eod');
  const [rl, setRl] = useState<Lang | 'both'>(lang);
  const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const [country, setCountry] = useState('');
  const { data: inqAll, loading } = useCollection<Inquiry>('inquiries', [orderBy('receivedAt', 'desc')]);
  const { data: quotationsAll } = useCollection<Quotation>('quotations', [orderBy('createdAt', 'desc')]);
  const quotations = useMemo(() => quotationsAll.filter(q => !country || q.country === country), [quotationsAll, country]);
  const { data: exts } = useCollection<ExtensionRequest>('extension_requests', [orderBy('requestedAt', 'desc')]);
  const { data: issuesAll } = useCollection<Issue>(can('issues.view') ? 'issues' : null, [orderBy('createdAt', 'desc')], [can('issues.view')]);
  const { data: tasksAll } = useCollection<WorkTask>(can('tasks.view.all') ? 'tasks' : null, [orderBy('createdAt', 'desc')], [can('tasks.view.all')]);
  const issues = useMemo(() => issuesAll.filter(x => !country || x.country === country), [issuesAll, country]);
  const tasks = useMemo(() => tasksAll.filter(x => !country || x.country === country), [tasksAll, country]);
  const canFin = can('reports.view_financials');

  // report-language translator (independent of UI language)
  const L = (k: string) => rl === 'both' ? `${dget(ar, k)} / ${dget(en, k)}` : dget(rl === 'ar' ? ar : en, k);
  const rlang: Lang = rl === 'en' ? 'en' : 'ar';

  const inq = useMemo(() => inqAll.filter(i => !i.isDeleted).filter(i => !country || i.country === country).filter(i => {
    const d = i.receivedAt?.toDate?.(); if (!d) return true;
    return (!from || d >= new Date(from)) && (!to || d <= new Date(to + 'T23:59:59'));
  }), [inqAll, from, to, country]);
  const now = new Date();

  const { headers, rows } = useMemo((): { headers: string[]; rows: (string | number)[][] } => {
    const active = inq.filter(i => !STATUSES[i.status].isFinal);
    const st = (s: string) => L(`status.${s}`);
    switch (key) {
      case 'eod': {
        const pend = active.filter(i => PENDING_QUOTE_STATUSES.includes(i.status)).sort((a, b) => a.salespersonName.localeCompare(b.salespersonName));
        return { headers: [L('inquiry.salesperson'), L('inquiry.no'), L('inquiry.client'), L('inquiry.received'), L('common.status'), L('inquiry.engineer'), L('inquiry.deadline'), L('inquiry.delay')],
          rows: pend.map(i => { const tm = computeTimes(i, settings, now); return [i.salespersonName, i.inquiryNo, i.clientName, fmtDate(i.receivedAt, rlang), st(i.status), i.assignedEngineerName || '', fmtDateTime(i.deadlineAt, rlang), tm.isOverdue ? fmtDuration(tm.delayMin, rlang) : '—']; }) };
      }
      case 'overdue': {
        const od = active.map(i => ({ i, tm: computeTimes(i, settings, now) })).filter(x => x.tm.isOverdue).sort((a, b) => b.tm.delayMin - a.tm.delayMin);
        return { headers: [L('inquiry.no'), L('inquiry.client'), L('inquiry.engineer'), L('inquiry.salesperson'), L('inquiry.priority'), L('common.status'), L('inquiry.deadline'), L('inquiry.delay')],
          rows: od.map(({ i, tm }) => [i.inquiryNo, i.clientName, i.assignedEngineerName || '', i.salespersonName, i.priority ? L(`priority.${i.priority}`) : '', st(i.status), fmtDateTime(i.deadlineAt, rlang), fmtDuration(tm.delayMin, rlang)]) };
      }
      case 'aging': {
        const b = { '0-1': 0, '2-3': 0, '4-7': 0, '7+': 0 } as Record<string, number>;
        active.forEach(i => { const d = (now.getTime() - (i.receivedAt?.toMillis?.() || now.getTime())) / 86400000; b[d <= 1 ? '0-1' : d <= 3 ? '2-3' : d <= 7 ? '4-7' : '7+']++; });
        return { headers: [L('report.bucket') + ' (' + L('common.days') + ')', L('report.count')], rows: Object.entries(b) };
      }
      case 'engineerPerf': {
        const m: Record<string, { name: string; assigned: number; completed: number; onTime: number; delayed: number; mins: number[]; ext: number; rev: number }> = {};
        inq.filter(i => i.assignedEngineerId).forEach(i => {
          const e = (m[i.assignedEngineerId!] ||= { name: i.assignedEngineerName || '', assigned: 0, completed: 0, onTime: 0, delayed: 0, mins: [], ext: 0, rev: 0 });
          e.assigned++;
          if (i.processingCompletedAt) { e.completed++; const tm = computeTimes(i, settings, now); e.mins.push(tm.netWorkingMin); const d = i.deadlineAt?.toDate?.(); if (d && i.processingCompletedAt.toDate() <= d) e.onTime++; else e.delayed++; }
        });
        exts.forEach(x => { const i = inq.find(q => q.id === x.inquiryId); if (i?.assignedEngineerId && m[i.assignedEngineerId]) m[i.assignedEngineerId].ext++; });
        quotations.filter(q => q.status === 'REVISION_REQUIRED' || (q.reviewRemark && q.revision > 0)).forEach(q => { const i = inq.find(x => x.id === q.inquiryId); if (i?.assignedEngineerId && m[i.assignedEngineerId]) m[i.assignedEngineerId].rev++; });
        return { headers: [L('inquiry.engineer'), L('report.assigned'), L('report.completed'), L('report.onTime'), L('report.delayed'), L('dashboard.avgProcessing'), L('report.extensionsCount'), L('report.revisions'), L('report.efficiency')],
          rows: Object.values(m).map(e => { const onPct = e.completed ? e.onTime / e.completed * 100 : 0; const avg = e.mins.length ? e.mins.reduce((a, b) => a + b, 0) / e.mins.length : 0; const speed = avg ? Math.max(0, 100 - avg / 480 * 10) : 0; const revPct = e.completed ? e.rev / e.completed * 100 : 0; const extPct = e.assigned ? e.ext / e.assigned * 100 : 0; const score = onPct * .35 + speed * .2 + (100 - revPct) * .2 + (100 - extPct) * .15 + Math.min(100, e.assigned * 5) * .1; return [e.name, e.assigned, e.completed, e.onTime, e.delayed, fmtDuration(avg, rlang), e.ext, e.rev, fmtPct(score)]; }) };
      }
      case 'salesPerf': {
        const m: Record<string, { name: string; total: number; quoted: number; won: number; lost: number; value: number }> = {};
        inq.forEach(i => { const s = (m[i.salespersonId] ||= { name: i.salespersonName, total: 0, quoted: 0, won: 0, lost: 0, value: 0 }); s.total++; if (i.currentQuotationId) s.quoted++; if (i.status === 'WON') { s.won++; s.value += i.awardValue || i.finalQuotationValue || 0; } if (i.status === 'LOST') s.lost++; });
        return { headers: [L('inquiry.salesperson'), L('dashboard.total'), L('report.quoted'), L('report.wonCount'), L('report.lostCount'), L('dashboard.winRate'), L('inquiry.awardValue')],
          rows: Object.values(m).map(s => [s.name, s.total, s.quoted, s.won, s.lost, fmtPct(s.won + s.lost ? s.won / (s.won + s.lost) * 100 : 0), canFin ? fmtMoney(s.value, rlang, settings.currency) : '—']) };
      }
      case 'winRate': {
        const m: Record<string, { won: number; lost: number }> = {};
        inq.filter(i => i.status === 'WON' || i.status === 'LOST').forEach(i => { const c = (m[i.clientName] ||= { won: 0, lost: 0 }); i.status === 'WON' ? c.won++ : c.lost++; });
        return { headers: [L('inquiry.client'), L('report.wonCount'), L('report.lostCount'), L('dashboard.winRate')], rows: Object.entries(m).map(([c, v]) => [c, v.won, v.lost, fmtPct(v.won / (v.won + v.lost) * 100)]) };
      }
      case 'lostAnalysis': {
        const m: Record<string, { n: number; comp: number[] }> = {};
        inq.filter(i => i.status === 'LOST').forEach(i => { const r = (m[i.lostReason || 'other'] ||= { n: 0, comp: [] }); r.n++; if (i.competitorPrice) r.comp.push(i.competitorPrice); });
        return { headers: [L('inquiry.lostReason'), L('report.count'), L('inquiry.competitorPrice')], rows: Object.entries(m).map(([r, v]) => [L(`lostReason.${r}`), v.n, v.comp.length ? fmtMoney(v.comp.reduce((a, b) => a + b, 0) / v.comp.length, rlang, settings.currency) : '—']) };
      }
      case 'quotationsIssued': {
        const qs = quotations.filter(q => { const d = q.createdAt?.toDate?.(); return d && (!from || d >= new Date(from)) && (!to || d <= new Date(to + 'T23:59:59')); });
        return { headers: [L('quotation.no'), L('quotation.revision'), L('inquiry.no'), L('inquiry.client'), L('quotation.total'), L('common.status'), L('common.by'), L('common.date')],
          rows: qs.map(q => [q.quotationNo, q.revision, q.inquiryNo, q.clientName, fmtMoney(q.total, rlang, settings.currency), L(`qstatus.${q.status}`), q.createdByName, fmtDate(q.createdAt, rlang)]) };
      }
      case 'issues': {
        return {
          headers: [L('inquiry.no'), L('inquiry.client'), L('issue.type'), L('issue.severityLabel'), L('issue.description'), L('issue.responsible'), L('issue.lostTime'), L('common.status'), L('common.date')],
          rows: issues.map(x => [
            x.inquiryNo, inq.find(i => i.id === x.inquiryId)?.clientName || '',
            L(`issue.types.${x.type}`), L(`issue.severity.${x.severity}`), x.description,
            x.responsibleName || '—', x.lostMin ? fmtDuration(x.lostMin, rlang) : '—',
            L(`issue.status.${x.status}`), fmtDate(x.createdAt, rlang)
          ])
        };
      }
      case 'issuesByPerson': {
        // the tally the office needs: which problems keep coming back, and who they sit with
        const byType: Record<string, { n: number; open: number; lost: number }> = {};
        issues.forEach(x => { const r = (byType[x.type] ||= { n: 0, open: 0, lost: 0 }); r.n++; if (x.status === 'OPEN') r.open++; r.lost += x.lostMin || 0; });
        const byPerson: Record<string, { n: number; open: number; lost: number }> = {};
        issues.forEach(x => { const k = x.responsibleName || L('common.unknown'); const r = (byPerson[k] ||= { n: 0, open: 0, lost: 0 }); r.n++; if (x.status === 'OPEN') r.open++; r.lost += x.lostMin || 0; });
        const rows = [
          ...Object.entries(byType).sort((a, b) => b[1].n - a[1].n).map(([k, v]) => [L('issue.type'), L(`issue.types.${k}`), v.n, v.open, fmtDuration(v.lost, rlang)]),
          ...Object.entries(byPerson).sort((a, b) => b[1].n - a[1].n).map(([k, v]) => [L('issue.responsible'), k, v.n, v.open, fmtDuration(v.lost, rlang)])
        ];
        return { headers: [L('report.bucket'), L('common.name'), L('report.count'), L('issue.open'), L('issue.lostTime')], rows };
      }
      case 'tasks': {
        return {
          headers: [L('task.taskTitle'), L('task.assignee'), L('task.assignedBy'), L('inquiry.no'), L('inquiry.priority'), L('common.status'), L('task.pickup'), L('task.assignedAt'), L('task.completedAt')],
          rows: tasks.map(x => [
            x.title, x.assignedToName, x.assignedByName, x.inquiryNo || '—',
            L(`priority.${x.priority}`), L(`task.status.${x.status}`),
            x.pickupMin !== undefined ? fmtDuration(x.pickupMin, rlang) : '—',
            fmtDateTime(x.createdAt, rlang), x.completedAt ? fmtDateTime(x.completedAt, rlang) : '—'
          ])
        };
      }
      case 'durations': {
        // how long each inquiry actually consumed, and who was holding it
        const rows = inq.map(i => {
          const tm = computeTimes(i, settings, now);
          return [
            i.inquiryNo, i.clientName, i.assignedEngineerName || L('inquiry.unassigned'),
            L(`status.${i.status}`),
            fmtDuration(tm.responseMin, rlang), fmtDuration(tm.workingMin, rlang),
            fmtDuration(tm.pausedMin, rlang), fmtDuration(tm.totalElapsedMin, rlang),
            tm.isOverdue ? fmtDuration(tm.delayMin, rlang) : '—',
            `${tm.slaUsedPct}%`, String(i.issueCount || 0)
          ];
        }).sort((a, b) => (a[8] === '—' ? 0 : 1) < (b[8] === '—' ? 0 : 1) ? 1 : -1);
        return {
          headers: [L('inquiry.no'), L('inquiry.client'), L('inquiry.engineer'), L('common.status'),
            L('inquiry.responseTime'), L('inquiry.workTime'), L('inquiry.paused'), L('inquiry.totalElapsed'),
            L('inquiry.delay'), L('inquiry.slaUsed'), L('issue.title')],
          rows
        };
      }
      case 'waitingInfo': return { headers: [L('inquiry.no'), L('inquiry.client'), L('inquiry.salesperson'), L('inquiry.missingInfo'), L('inquiry.requestInfo')], rows: active.filter(i => i.status === 'WAITING_INFO').map(i => [i.inquiryNo, i.clientName, i.salespersonName, (i.missingInfo || []).join('، '), fmtDateTime(i.missingInfoRequestedAt, rlang)]) };
      case 'extensions': return { headers: [L('inquiry.no'), L('extension.requestedBy'), L('inquiry.currentDeadline'), L('inquiry.newDeadline'), L('common.reason'), L('common.status')], rows: exts.map(x => [x.inquiryNo, x.requestedByName, fmtDateTime(x.currentDeadline, rlang), fmtDateTime(x.approvedDeadline || x.requestedDeadline, rlang), x.reason, L(`extension.status.${x.status}`)]) };
      case 'workload': {
        const m: Record<string, { name: string; active: number; processing: number; overdue: number }> = {};
        active.filter(i => i.assignedEngineerId).forEach(i => { const e = (m[i.assignedEngineerId!] ||= { name: i.assignedEngineerName || '', active: 0, processing: 0, overdue: 0 }); e.active++; if (['PROCESSING', 'COSTING', 'QUOTATION_PREP'].includes(i.status)) e.processing++; if (computeTimes(i, settings, now).isOverdue) e.overdue++; });
        return { headers: [L('inquiry.engineer'), L('dashboard.active'), L('dashboard.processing'), L('dashboard.overdue')], rows: Object.values(m).map(e => [e.name, e.active, e.processing, e.overdue]) };
      }
    }
  }, [key, inq, quotations, exts, issues, tasks, rl, settings, canFin]);

  const title = L(`report.${key}`);
  const company = rlang === 'ar' ? settings.companyNameAr : settings.companyNameEn;
  const docMeta = (): DocMeta => ({
    company, title,
    subtitle: country ? L(`country.${country}`) : L('country.all'),
    dir: rl === 'en' ? 'ltr' : 'rtl', lang: rlang,
    info: [
      { label: L('report.period'), value: `${from || '…'} → ${to || '…'}` },
      { label: L('report.generatedBy'), value: (rlang === 'ar' ? user?.nameAr : user?.nameEn) || user?.email || '' },
      { label: L('report.rows'), value: String(rows.length) }
    ]
  });
  // right-align nothing by guesswork — centre the short, obviously numeric columns
  const numericCols = headers.map((h, i) => (/^\d+$/.test(String(rows[0]?.[i] ?? '')) || /%$/.test(String(rows[0]?.[i] ?? '')) ? i : -1)).filter(i => i >= 0);
  const doExcel = () => exportRowsToExcel(rows.map(r => Object.fromEntries(headers.map((h, i) => [h, r[i]]))), key, title.slice(0, 30), docMeta());
  const doPrint = () => printDocument(docMeta(), tableHtml(headers, rows, { numericCols }), { logoUrl: settings.logoUrl });

  return (
    <div>
      <PageHeader title={t('report.title')} actions={<>
        {can('reports.export_excel') && <button className="btn-secondary" onClick={doExcel} disabled={!rows.length}><FileSpreadsheet size={16} />{t('common.excel')}</button>}
        {can('reports.export_pdf') && <button className="btn-primary" onClick={doPrint} disabled={!rows.length}><Printer size={16} />{t('common.pdf')}</button>}
      </>} />
      <Card className="mb-4" bodyClass="grid md:grid-cols-4 gap-3">
        <div className="md:col-span-4"><CountryFilter value={country} onChange={setCountry} allLabel={t('country.all')} /></div>
        <Field label={t('report.title')}><Select options={REPORTS.map(r => ({ value: r, label: t(`report.${r}`) }))} value={key} onChange={e => setKey(e.target.value as ReportKey)} placeholder={t('common.select')} /></Field>
        <Field label={t('report.language')}><Select options={[{ value: 'ar', label: 'العربية' }, { value: 'en', label: 'English' }, { value: 'both', label: t('report.bilingual') }]} value={rl} onChange={e => setRl(e.target.value as any)} placeholder="" /></Field>
        <Field label={t('common.from')}><Input type="date" value={from} onChange={e => setFrom(e.target.value)} /></Field>
        <Field label={t('common.to')}><Input type="date" value={to} onChange={e => setTo(e.target.value)} /></Field>
      </Card>
      <Card title={title} actions={<span className="text-xs text-muted">{t('report.rows')}: {rows.length}</span>} bodyClass="p-0">
        {loading ? <Loading /> : rows.length === 0 ? <Empty /> : (
          <div className="overflow-x-auto" dir={rl === 'en' ? 'ltr' : 'rtl'}>
            <table className="table text-xs"><thead><tr>{headers.map(h => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody></table>
          </div>
        )}
      </Card>
    </div>
  );
}
