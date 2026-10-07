import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Save, Lock, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/i18n/I18nProvider';
import { useToast } from '@/contexts/ToastContext';
import { useLookups } from '@/hooks/useLookups';
import type { Role } from '@/types';
import { PERMISSIONS, PERMISSION_MODULES } from '@/constants/permissions';
import { saveRole, deleteRole, seedDefaultRoles, syncDefaultRoles } from '@/services/roles';
import { PageHeader, Card, Modal, Field, Input, Confirm, Spinner } from '@/components/ui';

export default function Roles() {
  const { can, user: me } = useAuth();
  const { t, lang } = useI18n();
  const { toast } = useToast();
  const { roles, users } = useLookups();
  const [matrix, setMatrix] = useState<Record<string, Set<string>>>({});
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [add, setAdd] = useState<{ id: string; name: string } | null>(null);
  const [del, setDel] = useState<Role | null>(null);
  const canEdit = can('roles.manage_permissions') || can('roles.edit');
  const doSync = async () => {
    setBusy(true);
    try { const r = await syncDefaultRoles(); toast(r.created || r.updated ? t('role.synced', { c: r.created, u: r.updated }) : t('role.syncNothing')); }
    catch (e: any) { toast(e?.message || t('common.error'), 'error'); } finally { setBusy(false); }
  };

  useEffect(() => { if (roles.length === 0) seedDefaultRoles().catch(() => {}); }, [roles.length]);
  useEffect(() => { const m: Record<string, Set<string>> = {}; roles.forEach(r => { m[r.id] = new Set(r.permissions); }); setMatrix(m); setDirty(false); }, [roles]);

  const sorted = useMemo(() => [...roles].sort((a, b) => (a.isSystem === b.isSystem ? 0 : a.isSystem ? -1 : 1)), [roles]);
  const toggle = (roleId: string, perm: string) => {
    if (!canEdit || roleId === 'super_admin') return;
    setMatrix(m => { const s = new Set(m[roleId]); s.has(perm) ? s.delete(perm) : s.add(perm); return { ...m, [roleId]: s }; });
    setDirty(true);
  };
  const toggleModule = (roleId: string, module: string) => {
    if (!canEdit || roleId === 'super_admin') return;
    const keys = PERMISSIONS.filter(p => p.module === module).map(p => p.key);
    setMatrix(m => { const s = new Set(m[roleId]); const all = keys.every(k => s.has(k)); keys.forEach(k => all ? s.delete(k) : s.add(k)); return { ...m, [roleId]: s }; });
    setDirty(true);
  };
  const saveAll = async () => {
    setBusy(true);
    try {
      for (const r of roles) {
        const next = Array.from(matrix[r.id] || []);
        if (JSON.stringify([...next].sort()) !== JSON.stringify([...r.permissions].sort())) await saveRole({ ...r, permissions: next }, false, r);
      }
      toast(t('role.saved')); setDirty(false);
    } catch (e: any) { toast(e?.message || t('common.error'), 'error'); } finally { setBusy(false); }
  };
  const createRole = async () => {
    if (!add || !add.id || !add.name.trim()) return;
    const id = add.id.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    setBusy(true);
    try { await saveRole({ id, nameAr: add.name.trim(), nameEn: add.name.trim(), permissions: [], isSystem: false }, true); toast(t('common.saved')); setAdd(null); }
    catch (e: any) { toast(e?.message || t('common.error'), 'error'); } finally { setBusy(false); }
  };

  return (
    <div>
      <PageHeader title={t('role.matrix')} subtitle={t('role.matrixHint')} actions={<>
        {canEdit && <button className="btn-secondary" onClick={doSync} disabled={busy} title={t('role.syncHint')}><RefreshCw size={16} />{t('role.sync')}</button>}
        {can('roles.create') && <button className="btn-secondary" onClick={() => setAdd({ id: '', name: '' })}><Plus size={16} />{t('role.add')}</button>}
        {canEdit && <button className="btn-primary" onClick={saveAll} disabled={!dirty || busy}>{busy ? <Spinner className="text-white" /> : <><Save size={16} />{t('common.save')}</>}</button>}
      </>} />
      <Card bodyClass="p-0 overflow-x-auto">
        <table className="table text-xs">
          <thead>
            <tr>
              <th className="sticky start-0 bg-bg z-10 min-w-[220px]">{t('perm.actions.view')} / {t('role.one')}</th>
              {sorted.map(r => (
                <th key={r.id} className="text-center min-w-[110px]">
                  <div className="flex flex-col items-center gap-1">
                    <span className="flex items-center gap-1">{r.isSystem && <Lock size={10} />}{lang === 'ar' ? r.nameAr : r.nameEn}</span>
                    <span className="text-[10px] text-muted font-normal">{(matrix[r.id]?.size || 0)} · {users.filter(u => u.roleId === r.id && u.status === 'active').length} 👤</span>
                    {!r.isSystem && can('roles.delete') && <button className="text-danger" onClick={() => setDel(r)}><Trash2 size={12} /></button>}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSION_MODULES.map(m => (
              <>
                <tr key={m} className="bg-primary/5">
                  <td className="sticky start-0 bg-primary/5 font-bold z-10">{t(`perm.modules.${m}`)}</td>
                  {sorted.map(r => { const keys = PERMISSIONS.filter(p => p.module === m).map(p => p.key); const all = keys.every(k => matrix[r.id]?.has(k)); return (
                    <td key={r.id} className="text-center"><input type="checkbox" checked={all} onChange={() => toggleModule(r.id, m)} disabled={!canEdit || r.id === 'super_admin'} className="accent-[rgb(var(--c-primary))]" /></td>
                  ); })}
                </tr>
                {PERMISSIONS.filter(p => p.module === m).map(p => (
                  <tr key={p.key}>
                    <td className="sticky start-0 bg-surface z-10 ps-6"><div>{t(`perm.actions.${p.key.slice(m.length + 1).replace(/\./g, '_')}`)}</div><div className="text-[10px] text-muted font-mono">{p.key}</div></td>
                    {sorted.map(r => (
                      <td key={r.id} className={clsx('text-center', matrix[r.id]?.has(p.key) && 'bg-success/5')}>
                        <input type="checkbox" checked={!!matrix[r.id]?.has(p.key)} onChange={() => toggle(r.id, p.key)} disabled={!canEdit || r.id === 'super_admin'} className="accent-[rgb(var(--c-primary))]" />
                      </td>
                    ))}
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </Card>
      <Modal open={!!add} onClose={() => setAdd(null)} size="sm" title={t('role.add')} footer={<><button className="btn-secondary" onClick={() => setAdd(null)}>{t('common.cancel')}</button><button className="btn-primary" onClick={createRole} disabled={busy}>{t('common.create')}</button></>}>
        {add && <div className="space-y-3">
          <Field label="ID" required hint="a-z, 0-9, _"><Input value={add.id} onChange={e => setAdd({ ...add, id: e.target.value })} dir="ltr" /></Field>
          <Field label={t('common.name')} required hint={t('common.englishOnly')}><Input value={add.name} onChange={e => setAdd({ ...add, name: e.target.value })} dir="ltr" /></Field>
        </div>}
      </Modal>
      <Confirm open={!!del} onClose={() => setDel(null)} danger onConfirm={async () => { if (del) { try { await deleteRole(del); toast(t('common.deleted')); } catch { toast(t('role.cannotDeleteSystem'), 'error'); } setDel(null); } }} />
    </div>
  );
}
