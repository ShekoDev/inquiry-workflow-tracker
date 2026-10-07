import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { orderBy, where } from 'firebase/firestore';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/contexts/ThemeContext';
import { useCollection } from '@/hooks/useCollection';
import { getTopRecurringIssues, type RecurringIssue } from '@/services/analytics';
import type { Inquiry, Quotation } from '@/types';
import { STATUSES, PENDING_QUOTE_STATUSES } from '@/constants/workflow';
import { Kpi, Card, DataTable, StatusBadge, PriorityBadge, QStatusBadge, CountryBadge, CountryFilter, SlaBar, useTicker, type Column } from '@/components/ui';
import { COUNTRIES } from '@/constants/countries';
import { computeTimes } from '@/utils/sla';
import { fmtDate, fmtDateTime, fmtDuration, fmtMoney } from '@/utils/format';

export default function Dashboard() {
  const { user, can } = useAuth();
  const { t, lang } = useI18n();
  const { settings } = useTheme();
  const nav = useNavigate();
  const { data: raw, loading } = useCollection<Inquiry>('inquiries', [orderBy('receivedAt', 'desc')]);
  const { data: quotesRaw } = useCollection<Quotation>('quotations', [where('status', 'in', ['DRAFT', 'UNDER_REVIEW', 'REVISION_REQUIRED', 'APPROVED', 'SENT_TO_SALES', 'SENT_TO_CLIENT'])]);
  const viewAll = can('inquiries.view.all') || can('dashboards.view.company');
  const [country, setCountry] = useState('');
  const [recurringIssues, setRecurringIssues] = useState<RecurringIssue[]>([]);
  useTicker(); // the live clocks below tick once a minute

  // Load recurring issues
  useEffect(() => {
    getTopRecurringIssues().then(setRecurringIssues).catch(e => console.error('Failed to load recurring issues:', e));
  }, []);

  const rows = useMemo(() => raw
    .filter(i => !i.isDeleted)
    .filter(i => viewAll || i.salespersonId === user?.uid || i.assignedEngineerId === user?.uid || i.createdBy === user?.uid)
    .filter(i => !country || i.country === country), [raw, viewAll, user?.uid, country]);
  const now = new Date();
  const stats = useMemo(() => {
    const active = rows.filter(i => !STATUSES[i.status].isFinal);
    const overdue = active.filter(i => computeTimes(i, settings, now).isOverdue);
    const dueToday = active.filter(i => { const d = i.deadlineAt?.toDate?.(); return d && d.toDateString() === now.toDateString(); });
    const byStatus: Record<string, number> = {}; rows.forEach(i => { byStatus[i.status] = (byStatus[i.status] || 0) + 1; });
    const won = rows.filter(i => i.status === 'WON').length, lost = rows.filter(i => i.status === 'LOST').length;
    const awaitingPickup = active.filter(i => !i.acknowledgedAt);
    const inProgress = active.filter(i => !!i.acknowledgedAt);
    const responded = rows.filter(i => i.firstResponseMin !== undefined);
    const avgResponse = responded.length ? Math.round(responded.reduce((a, i) => a + (i.firstResponseMin || 0), 0) / responded.length) : 0;
    const byCountry = COUNTRIES.map(c => ({ ...c, n: rows.filter(i => i.country === c.code).length, active: active.filter(i => i.country === c.code).length }));
    return { total: rows.length, active: active.length, overdue: overdue.length, dueToday: dueToday.length, byStatus, won, lost, winRate: won + lost ? Math.round((won / (won + lost)) * 100) : 0,
      awaitingPickup: awaitingPickup.length, inProgress: inProgress.length, avgResponse, byCountry,
      pendingBySales: Object.values(active.filter(i => PENDING_QUOTE_STATUSES.includes(i.status)).reduce<Record<string, { name: string; n: number }>>((a, i) => { (a[i.salespersonId] ||= { name: i.salespersonName, n: 0 }).n++; return a; }, {})),
      workload: Object.values(active.filter(i => i.assignedEngineerId).reduce<Record<string, { name: string; active: number; processing: number; overdue: number }>>((a, i) => { const e = (a[i.assignedEngineerId!] ||= { name: i.assignedEngineerName || '', active: 0, processing: 0, overdue: 0 }); e.active++; if (['PROCESSING', 'COSTING', 'QUOTATION_PREP'].includes(i.status)) e.processing++; if (computeTimes(i, settings, now).isOverdue) e.overdue++; return a; }, {}))
    };
  }, [rows, settings]);

  const quotes = useMemo(() => {
    // a quotation is only shown while its inquiry still exists — deleting an inquiry
    // takes its quotations with it, and this also hides anything left over from before
    const liveIds = new Set(raw.filter(i => !i.isDeleted).map(i => i.id));
    const visible = new Set(rows.map(r => r.id));
    return quotesRaw
      .filter(q => liveIds.has(q.inquiryId))
      .filter(q => (!country || q.country === country) && (viewAll || visible.has(q.inquiryId)))
      .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
      .slice(0, 10);
  }, [quotesRaw, raw, rows, country, viewAll]);

  const qCols: Column<Quotation>[] = [
    { key: 'no', header: t('quotation.no'), render: r => <span className="font-mono text-primary font-semibold">{r.quotationNo}{r.revision ? <span className="text-muted"> R{r.revision}</span> : null}</span> },
    { key: 'inq', header: t('inquiry.no'), render: r => <span className="font-mono text-xs">{r.inquiryNo}</span> },
    { key: 'client', header: t('inquiry.client'), render: r => <span className="line-clamp-1">{r.clientName}</span> },
    { key: 'c', header: t('inquiry.country'), render: r => <CountryBadge country={r.country} compact />, className: 'hidden md:table-cell' },
    { key: 'total', header: t('quotation.total'), render: r => fmtMoney(r.total, lang, settings.currency), className: 'hidden md:table-cell' },
    { key: 'st', header: t('inquiry.quotationStatus'), render: r => <QStatusBadge status={r.status} /> }
  ];

  const pie = Object.entries(stats.byStatus).map(([k, v]) => ({ name: t(`status.${k}`), value: v, color: STATUSES[k as keyof typeof STATUSES]?.color }));
  const recent = rows.slice(0, 8);
  const cols: Column<Inquiry>[] = [
    { key: 'no', header: t('inquiry.no'), render: r => <span className="font-mono text-primary">{r.inquiryNo}</span> },
    { key: 'cn', header: t('inquiry.country'), render: r => <CountryBadge country={r.country} compact /> },
    { key: 'client', header: t('inquiry.client'), render: r => r.clientName },
    { key: 'p', header: t('inquiry.priority'), render: r => <PriorityBadge priority={r.priority} /> },
    { key: 's', header: t('common.status'), render: r => <StatusBadge status={r.status} /> },
    { key: 'q', header: t('inquiry.quotationNo'), render: r => r.currentQuotationNo
      ? <div className="space-y-0.5"><div className="font-mono text-xs font-semibold">{r.currentQuotationNo}</div>{r.currentQuotationStatus && <QStatusBadge status={r.currentQuotationStatus} />}</div>
      : <span className="text-muted text-xs">{t('inquiry.noQuotationYet')}</span> },
    { key: 'w', header: t('inquiry.workTime'), render: r => {
      const tm = computeTimes(r, settings, now);
      if (!tm.started) return <span className="badge bg-warning/15 text-warning whitespace-nowrap">{t('inquiry.waitingPickup')}</span>;
      return <div className="min-w-[80px] space-y-1"><div className="text-xs">{fmtDuration(tm.workingMin, lang)}</div><SlaBar pct={tm.slaUsedPct} overdue={tm.isOverdue} /></div>;
    } },
    { key: 'd', header: t('inquiry.deadline'), render: r => { const tm = computeTimes(r, settings, now); return <span className={tm.isOverdue ? 'text-danger' : ''}>{fmtDateTime(r.deadlineAt, lang)}{tm.isOverdue && ` (+${fmtDuration(tm.delayMin, lang)})`}</span>; } }
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">{t('dashboard.title')} <span className="text-sm text-muted font-normal">— {fmtDate(now, lang)}</span></h1>
        <CountryFilter value={country} onChange={setCountry} allLabel={t('country.all')} />
      </div>
      {!country && (
        <div className="flex flex-wrap gap-2 text-xs">
          {stats.byCountry.map(c => (
            <button key={c.code} onClick={() => setCountry(c.code)} className="badge gap-1 hover:opacity-80" style={{ background: `${c.color}1A`, color: c.color }}>
              <span aria-hidden>{c.flag}</span>{lang === 'ar' ? c.nameAr : c.nameEn}: <b>{c.n}</b> <span className="opacity-70">({c.active} {t('dashboard.active')})</span>
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Kpi label={t('dashboard.total')} value={stats.total} onClick={() => nav('/inquiries')} />
        <Kpi label={t('dashboard.active')} value={stats.active} color="#2563EB" onClick={() => nav('/inquiries?pending=1')} />
        <Kpi label={t('dashboard.overdue')} value={stats.overdue} color="#DC2626" onClick={() => nav('/inquiries?overdue=1')} />
        <Kpi label={t('dashboard.awaitingPickup')} value={stats.awaitingPickup} color="#D97706" onClick={() => nav('/inquiries?unpicked=1')} />
        <Kpi label={t('dashboard.inProgressNow')} value={stats.inProgress} color="#0EA5E9" />
        <Kpi label={t('dashboard.underReview')} value={stats.byStatus.UNDER_REVIEW || 0} color="#8B5CF6" onClick={() => nav('/inquiries?status=UNDER_REVIEW')} />
        <Kpi label={t('dashboard.winRate')} value={`${stats.winRate}%`} color="#16A34A" />
        <Kpi label={t('dashboard.avgResponse')} value={fmtDuration(stats.avgResponse, lang)} color="#7C3AED" />
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <Card title={t('dashboard.statusBreakdown')}>
          {pie.length === 0 ? <div className="text-muted text-sm">{t('common.noData')}</div> : (
            <div className="h-56"><ResponsiveContainer><PieChart><Pie data={pie} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>{pie.map((p, i) => <Cell key={i} fill={p.color} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div>
          )}
          <div className="grid grid-cols-2 gap-x-3 text-xs mt-2">{pie.map(p => <div key={p.name} className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: p.color }} />{p.name} <b>{p.value}</b></div>)}</div>
        </Card>
        <Card title={t('dashboard.recurringIssues')}>
          {recurringIssues.length === 0 ? (
            <div className="text-muted text-sm">{t('common.noData')}</div>
          ) : (
            <div className="space-y-2">
              {recurringIssues.map((issue, i) => (
                <div key={issue.type} className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium">{t(`issue.types.${issue.type}`)}</div>
                    <div className="text-[10px] text-muted">{issue.recent.join(', ')}</div>
                  </div>
                  <div className="flex items-center gap-2 text-right shrink-0">
                    <div className="text-xs font-bold">{issue.count}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
        {viewAll && (
          <Card title={t('dashboard.pendingByRep')}>
            {stats.pendingBySales.length === 0 ? <div className="text-muted text-sm">{t('common.noData')}</div> : (
              <div className="h-56"><ResponsiveContainer><BarChart data={stats.pendingBySales} layout="vertical" margin={{ left: 10, right: 10 }}><XAxis type="number" hide /><YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="n" fill="rgb(var(--c-primary))" radius={4} /></BarChart></ResponsiveContainer></div>
            )}
          </Card>
        )}
        {viewAll && (
          <Card title={t('dashboard.engineerWorkload')} bodyClass="p-0">
            <table className="table text-xs"><thead><tr><th>{t('inquiry.engineer')}</th><th>{t('dashboard.active')}</th><th>{t('dashboard.processing')}</th><th>{t('dashboard.overdue')}</th><th /></tr></thead>
              <tbody>{stats.workload.map(w => { const lvl = w.active >= 12 || w.overdue >= 3 ? 'overloaded' : w.active >= 7 || w.overdue >= 1 ? 'high' : 'normal'; const c = lvl === 'overloaded' ? 'text-danger' : lvl === 'high' ? 'text-warning' : 'text-success'; return <tr key={w.name}><td>{w.name}</td><td>{w.active}</td><td>{w.processing}</td><td className={w.overdue ? 'text-danger font-bold' : ''}>{w.overdue}</td><td className={`${c} font-semibold`}>● {t(`dashboard.${lvl}`)}</td></tr>; })}
                {stats.workload.length === 0 && <tr><td colSpan={5} className="text-muted text-center py-4">{t('common.noData')}</td></tr>}</tbody></table>
          </Card>
        )}
      </div>
      <Card title={t('dashboard.quotations')} bodyClass="p-0">
        <DataTable columns={qCols} rows={quotes} onRowClick={r => nav(`/inquiries/${r.inquiryId}?tab=quotations`)} empty={t('dashboard.noQuotations')} />
      </Card>
      <Card title={t('dashboard.recent')} bodyClass="p-0"><DataTable columns={cols} rows={recent} loading={loading} onRowClick={r => nav(`/inquiries/${r.id}`)} /></Card>
    </div>
  );
}
