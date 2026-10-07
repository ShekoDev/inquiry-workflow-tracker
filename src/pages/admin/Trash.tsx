import { useEffect, useMemo, useState } from 'react';
import { RotateCcw, Trash2, AlertTriangle, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/i18n/I18nProvider';
import { useToast } from '@/contexts/ToastContext';
import type { TrashItem } from '@/types';
import { listTrash, restoreFromTrash, purgeTrashItem, purgeExpiredTrash, RETENTION_DAYS } from '@/services/trash';
import { PageHeader, Card, DataTable, Confirm, Loading, Input, Select, type Column } from '@/components/ui';
import { fmtDateTime } from '@/utils/format';

export default function Trash() {
  const { user, can } = useAuth();
  const { t, lang } = useI18n();
  const { toast } = useToast();
  const [rows, setRows] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [mod, setMod] = useState('');
  const [restore, setRestore] = useState<TrashItem | null>(null);
  const [purge, setPurge] = useState<TrashItem | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      // no server cron on the free plan — expired bundles are swept whenever this page opens
      await purgeExpiredTrash().catch(() => 0);
      setRows(await listTrash());
    } catch (e: any) { toast(e?.message || t('common.error'), 'error'); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const modules = useMemo(() => Array.from(new Set(rows.map(r => r.module))), [rows]);
  const visible = rows
    .filter(r => !mod || r.module === mod)
    .filter(r => !q || [r.label, r.module, r.deletedByName].some(x => (x || '').toLowerCase().includes(q.toLowerCase())));

  const daysLeft = (r: TrashItem) => Math.max(0, Math.ceil(((r.expiresAt?.toMillis?.() || 0) - Date.now()) / 86400000));

  const cols: Column<TrashItem>[] = [
    { key: 'label', header: t('trash.item'), render: r => <div><div className="font-medium">{r.label}</div><div className="text-[11px] text-muted">{t(`perm.modules.${r.module}`)} — {r.docCount} {t('trash.records')}</div></div> },
    { key: 'by', header: t('trash.deletedBy'), render: r => <div className="text-xs">{r.deletedByName}<div className="text-muted">{fmtDateTime(r.deletedAt, lang)}</div></div> },
    { key: 'left', header: t('trash.expiresIn'), render: r => {
      const d = daysLeft(r);
      return <span className={`badge ${d <= 3 ? 'bg-danger/15 text-danger' : d <= 7 ? 'bg-warning/15 text-warning' : 'bg-success/15 text-success'}`}>
        <Clock size={11} className="me-1" />{d} {t('common.days')}
      </span>;
    } },
    { key: 'act', header: '', render: r => <div className="flex gap-1.5">
      <button className="btn-primary btn-sm" onClick={() => setRestore(r)}><RotateCcw size={14} />{t('trash.restore')}</button>
      {can('activity_log.purge') && <button className="btn-ghost btn-sm text-danger" onClick={() => setPurge(r)}><Trash2 size={14} /></button>}
    </div> }
  ];

  return (
    <div>
      <PageHeader title={t('trash.title')} subtitle={t('trash.hint', { d: RETENTION_DAYS })} actions={<>
        <Select options={modules.map(m => ({ value: m, label: t(`perm.modules.${m}`) }))} value={mod} onChange={e => setMod(e.target.value)} placeholder={t('log.module')} />
        <Input placeholder={t('common.search')} value={q} onChange={e => setQ(e.target.value)} className="w-48" />
        <button className="btn-secondary" onClick={load}>{t('common.reset')}</button>
      </>} />

      <div className="card card-body mb-4 flex items-start gap-2 text-sm bg-warning/5">
        <AlertTriangle size={16} className="text-warning mt-0.5 shrink-0" />
        <span className="text-muted">{t('trash.note', { d: RETENTION_DAYS })}</span>
      </div>

      {loading ? <Loading /> : <Card bodyClass="p-0"><DataTable columns={cols} rows={visible} empty={t('trash.none')} /></Card>}

      <Confirm open={!!restore} onClose={() => setRestore(null)} busy={busy}
        text={restore ? t('trash.restoreConfirm', { label: restore.label, n: restore.docCount }) : ''}
        onConfirm={async () => {
          if (!restore || !user) return;
          setBusy(true);
          try { await restoreFromTrash(restore, user); toast(t('trash.restored')); setRestore(null); await load(); }
          catch (e: any) { toast(e?.message || t('common.error'), 'error'); } finally { setBusy(false); }
        }} />

      <Confirm open={!!purge} onClose={() => setPurge(null)} danger busy={busy}
        text={purge ? t('trash.purgeConfirm', { label: purge.label }) : ''}
        onConfirm={async () => {
          if (!purge) return;
          setBusy(true);
          try { await purgeTrashItem(purge); toast(t('common.deleted')); setPurge(null); await load(); }
          catch (e: any) { toast(e?.message || t('common.error'), 'error'); } finally { setBusy(false); }
        }} />
    </div>
  );
}
