import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { orderBy, where, writeBatch, doc } from 'firebase/firestore';
import { Plus, FileSpreadsheet, AlertTriangle, Save, Trash2, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import { useCollection } from '@/hooks/useCollection';
import { useLookups } from '@/hooks/useLookups';
import type { Inquiry, InquiryStatus, Priority } from '@/types';
import { STATUSES, PRIORITIES } from '@/constants/workflow';
import { PageHeader, DataTable, StatusBadge, PriorityBadge, QStatusBadge, CountryBadge, CountryFilter, SlaBar, Select, Input, Checkbox, Modal, Field, useTicker, type Column } from '@/components/ui';
import { countryName } from '@/constants/countries';
import { fmtDate, fmtDateTime, fmtDuration } from '@/utils/format';
import { computeTimes } from '@/utils/sla';
import { exportRowsToExcel } from '@/utils/export';
import { db } from '@/config/firebase';

interface SavedFilter {
  id: string;
  name: string;
  filters: {
    status: string; priority: string; engineer: string; sales: string; country: string;
    onlyOverdue: boolean; onlyPending: boolean; onlyMine: boolean; onlyUnpicked: boolean; q: string;
  };
}

export default function InquiriesList() {
  const { user, can } = useAuth();
  const { t, lang, pick } = useI18n();
  const { settings } = useTheme();
  const { toast } = useToast();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const { peopleFor } = useLookups();
  const viewAll = can('inquiries.view.all');

  const constraints = useMemo(() => {
    const c = [orderBy('receivedAt', 'desc')];
    if (!viewAll && user) {
      // Firestore can't OR across fields; we subscribe to the broad list and filter client-side for own-only users.
    }
    return c;
  }, [viewAll, user?.uid]);
  const { data: raw, loading } = useCollection<Inquiry>('inquiries', constraints, [viewAll]);

  const [q, setQ] = useState('');
  const [status, setStatus] = useState<string>(sp.get('status') || '');
  const [priority, setPriority] = useState<string>('');
  const [engineer, setEngineer] = useState<string>(sp.get('engineer') || '');
  const [sales, setSales] = useState<string>(sp.get('sales') || '');
  const [onlyOverdue, setOnlyOverdue] = useState(sp.get('overdue') === '1');
  const [onlyPending, setOnlyPending] = useState(sp.get('pending') === '1');
  const [onlyMine, setOnlyMine] = useState(false);
  const [country, setCountry] = useState<string>(sp.get('country') || '');
  const [onlyUnpicked, setOnlyUnpicked] = useState(sp.get('unpicked') === '1');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkModal, setBulkModal] = useState(false);
  const [bulkAction, setBulkAction] = useState<'engineer' | 'status' | null>(null);
  const [bulkValue, setBulkValue] = useState('');
  const [saveFilterName, setSaveFilterName] = useState('');
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>(() => {
    if (!user) return [];
    try {
      return JSON.parse(localStorage.getItem(`filters_${user.uid}`) || '[]');
    } catch {
      return [];
    }
  });
  useTicker(); // keep the live work-time column honest

  const handleSaveFilter = () => {
    if (!saveFilterName.trim() || !user) return;
    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name: saveFilterName,
      filters: { status, priority, engineer, sales, country, onlyOverdue, onlyPending, onlyMine, onlyUnpicked, q }
    };
    const updated = [...savedFilters, newFilter];
    setSavedFilters(updated);
    localStorage.setItem(`filters_${user.uid}`, JSON.stringify(updated));
    setSaveFilterName('');
    toast(t('common.saved'));
  };

  const handleLoadFilter = (f: SavedFilter) => {
    setStatus(f.filters.status);
    setPriority(f.filters.priority);
    setEngineer(f.filters.engineer);
    setSales(f.filters.sales);
    setCountry(f.filters.country);
    setOnlyOverdue(f.filters.onlyOverdue);
    setOnlyPending(f.filters.onlyPending);
    setOnlyMine(f.filters.onlyMine);
    setOnlyUnpicked(f.filters.onlyUnpicked);
    setQ(f.filters.q);
  };

  const handleDeleteFilter = (id: string) => {
    if (!user) return;
    const updated = savedFilters.filter(f => f.id !== id);
    setSavedFilters(updated);
    localStorage.setItem(`filters_${user.uid}`, JSON.stringify(updated));
  };

  const handleBulkAction = async () => {
    if (selected.size === 0 || !bulkValue) return;
    try {
      const batch = writeBatch(db);
      selected.forEach(id => {
        const ref = doc(db, 'inquiries', id);
        if (bulkAction === 'engineer') {
          const eng = peopleFor('engineer', country).find(u => u.id === bulkValue);
          batch.update(ref, {
            assignedEngineerId: bulkValue || null,
            assignedEngineerName: eng?.name || null,
            engineerIds: bulkValue ? [bulkValue] : [],
            engineerNames: eng ? [eng.name] : []
          });
        } else if (bulkAction === 'status') {
          batch.update(ref, { status: bulkValue as InquiryStatus });
        }
      });
      await batch.commit();
      setSelected(new Set());
      setBulkModal(false);
      setBulkAction(null);
      setBulkValue('');
      toast(t('common.saved'));
    } catch (e) {
      toast(t('common.error'), 'error');
    }
  };

  const rows = useMemo(() => {
    const now = new Date();
    return raw.filter(i => !i.isDeleted)
      .filter(i => viewAll || i.salespersonId === user?.uid || i.assignedEngineerId === user?.uid || (i.engineerIds || []).includes(user?.uid || '-') || i.createdBy === user?.uid)
      .filter(i => !onlyMine || i.salespersonId === user?.uid || i.assignedEngineerId === user?.uid || (i.engineerIds || []).includes(user?.uid || '-'))
      .filter(i => !country || i.country === country)
      .filter(i => !onlyUnpicked || (!i.acknowledgedAt && !STATUSES[i.status].isFinal))
      .filter(i => !status || i.status === status)
      .filter(i => !priority || i.priority === priority)
      .filter(i => !engineer || i.assignedEngineerId === engineer || (i.engineerIds || []).includes(engineer))
      .filter(i => !sales || i.salespersonId === sales)
      .filter(i => !onlyPending || !STATUSES[i.status].isFinal)
      .filter(i => !onlyOverdue || computeTimes(i, settings, now).isOverdue)
      .filter(i => !q || [i.inquiryNo, i.clientName, i.projectName, i.scopeAr, i.scopeEn].some(x => (x || '').toLowerCase().includes(q.toLowerCase())));
  }, [raw, viewAll, user?.uid, status, priority, engineer, sales, country, onlyOverdue, onlyPending, onlyMine, onlyUnpicked, q, settings]);

  const cols: Column<Inquiry>[] = [
    { key: 'select', header: '', className: 'w-10', render: r => <Checkbox checked={selected.has(r.id)} onChange={e => { const s = new Set(selected); e.target.checked ? s.add(r.id) : s.delete(r.id); setSelected(s); }} /> },
    { key: 'inquiryNo', header: t('inquiry.no'), render: r => <span className="font-mono font-semibold text-primary">{r.inquiryNo}</span> },
    { key: 'country', header: t('inquiry.country'), render: r => <CountryBadge country={r.country} compact /> },
    { key: 'client', header: t('inquiry.client'), render: r => <div><div className="font-medium">{r.clientName}</div><div className="text-xs text-muted">{r.projectName || ''}</div></div> },
    { key: 'scope', header: t('inquiry.scope'), render: r => <span className="line-clamp-1 max-w-[220px]">{pick(r.scopeAr, r.scopeEn)}</span>, className: 'hidden md:table-cell' },
    { key: 'sales', header: t('inquiry.salesperson'), render: r => r.salespersonName, className: 'hidden lg:table-cell' },
    { key: 'eng', header: t('inquiry.engineer'), render: r => (r.engineerNames?.length ? <span>{r.assignedEngineerName}{r.engineerNames.length > 1 && <span className="text-muted text-[10px]"> +{r.engineerNames.length - 1}</span>}</span> : r.assignedEngineerName) || <span className="text-muted">{t('inquiry.unassigned')}</span>, className: 'hidden lg:table-cell' },
    { key: 'priority', header: t('inquiry.priority'), render: r => <PriorityBadge priority={r.priority} /> },
    { key: 'status', header: t('common.status'), render: r => <StatusBadge status={r.status} /> },
    { key: 'quote', header: t('inquiry.quotationNo'), render: r => r.currentQuotationNo
      ? <div className="space-y-0.5"><div className="font-mono text-xs font-semibold">{r.currentQuotationNo}{r.currentQuotationRevision ? <span className="text-muted"> R{r.currentQuotationRevision}</span> : null}</div>{r.currentQuotationStatus && <QStatusBadge status={r.currentQuotationStatus} />}</div>
      : <span className="text-muted text-xs">{t('inquiry.noQuotationYet')}</span> },
    { key: 'issues', header: t('issue.title'), render: r => (r.issueCount || 0) === 0
      ? <span className="text-muted text-xs">—</span>
      : <span className={`badge ${(r.openIssueCount || 0) > 0 ? 'bg-danger/15 text-danger' : 'bg-success/15 text-success'}`}>{r.openIssueCount || 0}/{r.issueCount}</span> },
    { key: 'work', header: t('inquiry.workTime'), render: r => {
      const tm = computeTimes(r, settings);
      if (!tm.started) return <span className="badge bg-warning/15 text-warning whitespace-nowrap">{t('inquiry.waitingPickup')}</span>;
      return <div className="min-w-[90px] space-y-1">
        <div className="text-xs font-medium">{fmtDuration(tm.workingMin, lang)}</div>
        <SlaBar pct={tm.slaUsedPct} overdue={tm.isOverdue} />
        <div className="text-[10px] text-muted">{r.acknowledgedByName || ''}</div>
      </div>;
    }, className: 'hidden md:table-cell' },
    { key: 'received', header: t('inquiry.received'), render: r => fmtDate(r.receivedAt, lang), className: 'hidden md:table-cell' },
    { key: 'deadline', header: t('inquiry.deadline'), render: r => {
      const tm = computeTimes(r, settings);
      return <div className="text-xs">{fmtDateTime(r.deadlineAt, lang)}{tm.isOverdue && <div className="text-danger flex items-center gap-1"><AlertTriangle size={12} />{fmtDuration(tm.delayMin, lang)}</div>}</div>;
    } }
  ];

  const statusOpts = (Object.keys(STATUSES) as InquiryStatus[]).map(s => ({ value: s, label: t(`status.${s}`) }));
  const prioOpts = PRIORITIES.map(p => ({ value: p.key, label: t(`priority.${p.key as Priority}`) }));

  const doExport = () => exportRowsToExcel(
    rows.map(r => ({
      [t('inquiry.no')]: r.inquiryNo, [t('inquiry.country')]: countryName(r.country, lang), [t('inquiry.client')]: r.clientName, [t('inquiry.project')]: r.projectName || '', [t('inquiry.salesperson')]: r.salespersonName,
      [t('inquiry.engineer')]: r.assignedEngineerName || '', [t('inquiry.priority')]: r.priority ? t(`priority.${r.priority}`) : '', [t('common.status')]: t(`status.${r.status}`),
      [t('inquiry.received')]: fmtDate(r.receivedAt, lang), [t('inquiry.acknowledgedAt')]: fmtDateTime(r.acknowledgedAt, lang),
      [t('inquiry.responseTime')]: fmtDuration(computeTimes(r, settings).responseMin, lang), [t('inquiry.workTime')]: fmtDuration(computeTimes(r, settings).workingMin, lang),
      [t('inquiry.quotationNo')]: r.currentQuotationNo || '', [t('inquiry.quotationStatus')]: r.currentQuotationStatus ? t(`qstatus.${r.currentQuotationStatus}`) : '',
      [t('inquiry.deadline')]: fmtDateTime(r.deadlineAt, lang), [t('inquiry.estimatedValue')]: r.estimatedValue ?? ''
    })), 'inquiries', t('inquiry.title'));

  return (
    <div>
      {bulkModal && (
        <Modal open={bulkModal} title={bulkAction === 'engineer' ? t('inquiry.assign') : t('inquiry.changeStatus')} onClose={() => setBulkModal(false)}>
          <div className="space-y-4">
            <div className="text-sm text-muted">{selected.size} {t('common.selected')}</div>
            {bulkAction === 'engineer' ? (
              <Field label={t('inquiry.engineer')}>
                <Select
                  options={[{ value: '', label: t('inquiry.unassigned') }, ...peopleFor('engineer', country).map(u => ({ value: u.id, label: u.name }))]}
                  value={bulkValue}
                  onChange={e => setBulkValue(e.target.value)}
                />
              </Field>
            ) : (
              <Field label={t('common.status')}>
                <Select
                  options={Object.keys(STATUSES).map(s => ({ value: s, label: t(`status.${s}`) }))}
                  value={bulkValue}
                  onChange={e => setBulkValue(e.target.value)}
                />
              </Field>
            )}
            <div className="flex gap-2 justify-end">
              <button className="btn-secondary" onClick={() => setBulkModal(false)}>{t('common.cancel')}</button>
              <button className="btn-primary" onClick={handleBulkAction}>{t('common.save')}</button>
            </div>
          </div>
        </Modal>
      )}
      <PageHeader title={t('inquiry.title')} subtitle={`${rows.length} / ${raw.length}`} actions={<>
        {selected.size > 0 && (
          <div className="flex gap-2">
            {can('inquiries.assign') && <button className="btn-secondary text-sm" onClick={() => { setBulkAction('engineer'); setBulkModal(true); }}><Users size={16} />{selected.size} {t('inquiry.assign')}</button>}
            {can('inquiries.change_status') && <button className="btn-secondary text-sm" onClick={() => { setBulkAction('status'); setBulkModal(true); }}>{selected.size} {t('inquiry.changeStatus')}</button>}
            <button className="btn-ghost text-sm" onClick={() => setSelected(new Set())}>{t('common.cancel')}</button>
          </div>
        )}
        {can('reports.export_excel') && <button className="btn-secondary" onClick={doExport}><FileSpreadsheet size={16} />{t('common.excel')}</button>}
        {can('inquiries.create') && <button className="btn-primary" onClick={() => nav('/inquiries/new')}><Plus size={16} />{t('nav.newInquiry')}</button>}
      </>} />
      <div className="card card-body mb-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 items-end">
          <div className="col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-6"><CountryFilter value={country} onChange={setCountry} allLabel={t('country.all')} /></div>
          <div className="col-span-1 sm:col-span-2 md:col-span-2 lg:col-span-3"><Input placeholder={t('inquiry.searchPlaceholder')} value={q} onChange={e => setQ(e.target.value)} /></div>
          <div className="col-span-1"><Select options={statusOpts} value={status} onChange={e => setStatus(e.target.value)} placeholder={t('inquiry.filterStatus')} /></div>
          <div className="col-span-1"><Select options={prioOpts} value={priority} onChange={e => setPriority(e.target.value)} placeholder={t('inquiry.filterPriority')} /></div>
          {viewAll && <div className="col-span-1"><Select options={peopleFor('engineer', country).map(u => ({ value: u.id, label: u.name }))} value={engineer} onChange={e => setEngineer(e.target.value)} placeholder={t('inquiry.filterEngineer')} /></div>}
          {viewAll && <div className="col-span-1"><Select options={peopleFor('salesperson', country).map(u => ({ value: u.id, label: u.name }))} value={sales} onChange={e => setSales(e.target.value)} placeholder={t('inquiry.filterSales')} /></div>}
          <div className="col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-6 flex flex-wrap gap-4 text-sm">
            <Checkbox label={t('inquiry.overdue')} checked={onlyOverdue} onChange={e => setOnlyOverdue(e.target.checked)} />
            <Checkbox label={t('inquiry.pendingQuote')} checked={onlyPending} onChange={e => setOnlyPending(e.target.checked)} />
            <Checkbox label={t('inquiry.waitingPickup')} checked={onlyUnpicked} onChange={e => setOnlyUnpicked(e.target.checked)} />
            {viewAll && <Checkbox label={t('inquiry.mine')} checked={onlyMine} onChange={e => setOnlyMine(e.target.checked)} />}
          </div>
        </div>
        <div className="border-t border-border pt-3 flex flex-wrap gap-2 items-center text-sm">
          <span className="text-muted">{t('inquiry.saveFilter')}:</span>
          <Input placeholder={t('inquiry.filterName')} value={saveFilterName} onChange={e => setSaveFilterName(e.target.value)} className="flex-1 min-w-[120px]" />
          <button className="btn-secondary text-xs" onClick={handleSaveFilter} disabled={!saveFilterName.trim()}><Save size={14} />{t('common.save')}</button>
          {savedFilters.length > 0 && (
            <div className="w-full flex flex-wrap gap-1">
              {savedFilters.map(f => (
                <div key={f.id} className="badge bg-primary/15 text-primary text-xs py-1 flex items-center gap-1">
                  <button className="hover:opacity-70" onClick={() => handleLoadFilter(f)}>{f.name}</button>
                  <button className="hover:opacity-70" onClick={() => handleDeleteFilter(f.id)}><Trash2 size={12} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="card"><DataTable columns={cols} rows={rows} loading={loading} onRowClick={r => nav(`/inquiries/${r.id}`)} empty={t('inquiry.noInquiries')} /></div>
    </div>
  );
}
