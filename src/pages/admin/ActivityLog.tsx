import { useEffect, useState } from 'react';
import { Trash2, FileSpreadsheet, Search, RefreshCw, History, Undo2, CheckCircle2 } from 'lucide-react';
import type { DocumentSnapshot } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/i18n/I18nProvider';
import { useToast } from '@/contexts/ToastContext';
import { useLookups } from '@/hooks/useLookups';
import type { ActivityLog as Log } from '@/types';
import { fetchLogs, deleteLogEntries, fetchLogDeletions, undoLogEntry } from '@/services/activityLog';
import { PageHeader, Card, Field, Input, Select, Modal, Textarea, Loading, Empty, Spinner, Tabs } from '@/components/ui';
import { fmtDateTime } from '@/utils/format';
import { exportRowsToExcel } from '@/utils/export';

const MODULES = ['auth', 'inquiries', 'tasks', 'issues', 'quotations', 'extensions', 'follow_ups', 'clients', 'projects', 'team', 'users', 'roles', 'settings', 'reports'];
const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'APPROVE', 'REJECT', 'EXPORT', 'PERMISSION_CHANGE', 'STATUS_CHANGE', 'ASSIGN'];

export default function ActivityLog() {
  const { user: me, can } = useAuth();
  const { t, lang } = useI18n();
  const { toast } = useToast();
  const { users } = useLookups();
  const [tab, setTab] = useState('log');
  const [f, setF] = useState({ userId: '', module: '', action: '', from: '', to: '', text: '' });
  const [rows, setRows] = useState<Log[]>([]);
  const [last, setLast] = useState<DocumentSnapshot | undefined>();
  const [loading, setLoading] = useState(false);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [delOpen, setDelOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [deletions, setDeletions] = useState<any[]>([]);
  const [undo, setUndo] = useState<Log | null>(null);

  const load = async (append = false) => {
    setLoading(true);
    try {
      const res = await fetchLogs({ userId: f.userId || undefined, module: f.module || undefined, action: f.action || undefined, from: f.from ? new Date(f.from) : undefined, to: f.to ? new Date(f.to + 'T23:59:59') : undefined, after: append ? last : undefined, pageSize: 100 });
      setRows(append ? [...rows, ...res.rows] : res.rows); setLast(res.last);
    } catch (e: any) { toast(e?.message || t('common.error'), 'error'); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { if (tab === 'deletions' && me?.isSuperAdmin) fetchLogDeletions().then(setDeletions).catch(() => {}); }, [tab]);

  const visible = rows.filter(r => !f.text || [r.descriptionAr, r.descriptionEn, r.recordLabel, r.userName, r.userEmail, r.field, r.oldValue, r.newValue].some(x => (x || '').toLowerCase().includes(f.text.toLowerCase())));
  const toggle = (id: string) => setSel(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allSel = visible.length > 0 && visible.every(r => sel.has(r.id));

  const doDelete = async () => {
    const entries = rows.filter(r => sel.has(r.id)); if (!entries.length) return;
    setBusy(true);
    try { await deleteLogEntries(entries, reason); toast(t('log.deletedCount', { n: entries.length })); setSel(new Set()); setDelOpen(false); setReason(''); await load(); }
    catch (e: any) { toast(e?.message || t('common.error'), 'error'); } finally { setBusy(false); }
  };
  // one-click reversal: deletes come back from the 30-day bin, field changes get written back
  const doUndo = async () => {
    if (!undo || !me) return;
    setBusy(true);
    try { await undoLogEntry(undo, me); toast(t('log.undone')); setUndo(null); await load(); }
    catch (e: any) {
      const m = e?.message === 'trash_expired' ? t('log.undoExpired')
        : e?.message === 'already_undone' ? t('log.alreadyUndone')
        : e?.message === 'not_undoable' ? t('log.notUndoable') : (e?.message || t('common.error'));
      toast(m, 'error');
    } finally { setBusy(false); }
  };

  const doExport = () => exportRowsToExcel(visible.map(r => ({
    [t('common.date')]: fmtDateTime(r.timestamp, lang), [t('log.user')]: r.userName, [t('common.email')]: r.userEmail, [t('user.role')]: r.roleId,
    [t('log.action')]: t(`log.actions.${r.action}`), [t('log.module')]: r.module, [t('log.record')]: r.recordLabel || '', [t('log.field')]: r.field || '',
    [t('log.oldValue')]: r.oldValue || '', [t('log.newValue')]: r.newValue || '', [t('log.description')]: lang === 'ar' ? r.descriptionAr : r.descriptionEn, [t('log.device')]: r.userAgent || ''
  })), 'activity_log', t('log.title'));

  const actionColor: Record<string, string> = { CREATE: 'bg-success/15 text-success', UPDATE: 'bg-info/15 text-info', DELETE: 'bg-danger/15 text-danger', LOGIN: 'bg-bg text-muted', LOGOUT: 'bg-bg text-muted', APPROVE: 'bg-success/15 text-success', REJECT: 'bg-danger/15 text-danger', PERMISSION_CHANGE: 'bg-warning/15 text-warning', STATUS_CHANGE: 'bg-primary/10 text-primary', ASSIGN: 'bg-primary/10 text-primary', EXPORT: 'bg-bg text-muted' };

  return (
    <div>
      <PageHeader title={t('log.title')} subtitle={t('log.adminOnly')} actions={<>
        {can('activity_log.export') && <button className="btn-secondary" onClick={doExport}><FileSpreadsheet size={16} />{t('common.excel')}</button>}
        {can('activity_log.delete') && sel.size > 0 && <button className="btn-danger" onClick={() => setDelOpen(true)}><Trash2 size={16} />{t('log.deleteSelected')} ({sel.size})</button>}
      </>} />
      {me?.isSuperAdmin && <Tabs active={tab} onChange={setTab} tabs={[{ key: 'log', label: t('log.title') }, { key: 'deletions', label: t('log.deletions') }]} />}
      {tab === 'log' && <>
        <Card className="my-4" bodyClass="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2 items-end">
          <Select options={users.map(u => ({ value: u.uid, label: lang === 'ar' ? u.nameAr : u.nameEn }))} value={f.userId} onChange={e => setF({ ...f, userId: e.target.value })} placeholder={t('log.user')} />
          <Select options={MODULES.map(m => ({ value: m, label: m }))} value={f.module} onChange={e => setF({ ...f, module: e.target.value })} placeholder={t('log.module')} />
          <Select options={ACTIONS.map(a => ({ value: a, label: t(`log.actions.${a}`) }))} value={f.action} onChange={e => setF({ ...f, action: e.target.value })} placeholder={t('log.action')} />
          <Input type="date" value={f.from} onChange={e => setF({ ...f, from: e.target.value })} />
          <Input type="date" value={f.to} onChange={e => setF({ ...f, to: e.target.value })} />
          <Input placeholder={t('common.search')} value={f.text} onChange={e => setF({ ...f, text: e.target.value })} />
          <button className="btn-primary" onClick={() => load()}><Search size={15} />{t('common.apply')}</button>
        </Card>
        <Card bodyClass="p-0">
          {loading && rows.length === 0 ? <Loading /> : visible.length === 0 ? <Empty /> : (
            <div className="overflow-x-auto">
              <table className="table text-xs">
                <thead><tr>
                  {can('activity_log.delete') && <th><input type="checkbox" checked={allSel} onChange={() => setSel(allSel ? new Set() : new Set(visible.map(r => r.id)))} /></th>}
                  <th>{t('common.date')}</th><th>{t('log.user')}</th><th>{t('log.action')}</th><th>{t('log.module')}</th><th>{t('log.record')}</th><th>{t('log.description')}</th><th>{t('log.field')}</th><th>{t('log.oldValue')}</th><th>{t('log.newValue')}</th><th>{t('log.undo')}</th>
                </tr></thead>
                <tbody>
                  {visible.map(r => (
                    <tr key={r.id} className={sel.has(r.id) ? 'bg-danger/5' : ''}>
                      {can('activity_log.delete') && <td><input type="checkbox" checked={sel.has(r.id)} onChange={() => toggle(r.id)} /></td>}
                      <td className="whitespace-nowrap font-mono">{fmtDateTime(r.timestamp, lang)}</td>
                      <td><div className="font-medium">{r.userName}</div><div className="text-[10px] text-muted">{r.roleId}</div></td>
                      <td><span className={`badge ${actionColor[r.action] || 'bg-bg'}`}>{t(`log.actions.${r.action}`)}</span></td>
                      <td>{r.module}</td>
                      <td className="font-mono">{r.recordLabel || ''}</td>
                      <td className="max-w-[300px]">{lang === 'ar' ? r.descriptionAr : r.descriptionEn}</td>
                      <td className="font-mono">{r.field || ''}</td>
                      <td className="max-w-[160px] truncate text-muted" title={r.oldValue}>{r.oldValue || ''}</td>
                      <td className="max-w-[160px] truncate" title={r.newValue}>{r.newValue || ''}</td>
                      <td>
                        {r.undoneAt
                          ? <span className="badge bg-bg text-muted whitespace-nowrap" title={`${t('log.undoneBy')}: ${r.undoneByName || ''}`}><CheckCircle2 size={11} className="me-1" />{t('log.undoneLabel')}</span>
                          : r.undo
                            ? <button className="btn-secondary btn-sm whitespace-nowrap" onClick={() => setUndo(r)}><Undo2 size={13} />{t('log.undo')}</button>
                            : <span className="text-muted">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {last && rows.length >= 100 && <div className="p-3 text-center"><button className="btn-secondary btn-sm" onClick={() => load(true)} disabled={loading}>{loading ? <Spinner /> : <><RefreshCw size={13} />{t('common.next')}</>}</button></div>}
        </Card>
      </>}
      {tab === 'deletions' && (
        <Card className="mt-4" title={<span className="flex items-center gap-2"><History size={16} />{t('log.deletions')}</span>} actions={<span className="text-xs text-muted">{t('log.deletionsHint')}</span>} bodyClass="p-0">
          {deletions.length === 0 ? <Empty /> : (
            <table className="table text-xs">
              <thead><tr><th>{t('common.date')}</th><th>{t('log.deletedBy')}</th><th>{t('log.count')}</th><th>{t('log.rangeFrom')}</th><th>{t('log.rangeTo')}</th><th>{t('common.reason')}</th></tr></thead>
              <tbody>{deletions.map(d => <tr key={d.id}><td className="font-mono">{fmtDateTime(d.deletedAt, lang)}</td><td>{d.deletedByName}</td><td><b>{d.count}</b></td><td>{fmtDateTime(d.rangeFrom, lang)}</td><td>{fmtDateTime(d.rangeTo, lang)}</td><td>{d.reason}</td></tr>)}</tbody>
            </table>
          )}
        </Card>
      )}
      <Modal open={!!undo} onClose={() => setUndo(null)} size="sm" title={t('log.undoTitle')}
        footer={<><button className="btn-secondary" onClick={() => setUndo(null)}>{t('common.cancel')}</button>
          <button className="btn-primary" onClick={doUndo} disabled={busy}>{busy ? <Spinner className="text-white" /> : <><Undo2 size={15} />{t('log.undo')}</>}</button></>}>
        {undo && <div className="space-y-2 text-sm">
          <div className="rounded bg-bg p-2">{lang === 'ar' ? undo.descriptionAr : undo.descriptionEn}</div>
          <div className="text-xs text-muted">{undo.undo?.kind === 'restore' ? t('log.undoRestoreHint') : t('log.undoFieldHint')}</div>
        </div>}
      </Modal>
      <Modal open={delOpen} onClose={() => setDelOpen(false)} size="sm" title={`${t('log.deleteSelected')} (${sel.size})`}
        footer={<><button className="btn-secondary" onClick={() => setDelOpen(false)}>{t('common.cancel')}</button><button className="btn-danger" onClick={doDelete} disabled={busy || !reason.trim()}>{busy ? <Spinner className="text-white" /> : t('common.delete')}</button></>}>
        <Field label={t('log.deleteReason')} required><Textarea value={reason} onChange={e => setReason(e.target.value)} /></Field>
      </Modal>
    </div>
  );
}
