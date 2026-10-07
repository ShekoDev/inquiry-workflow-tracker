import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, KeyRound, ShieldCheck, UserX, UserCheck, Trash2, Crown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/i18n/I18nProvider';
import { useToast } from '@/contexts/ToastContext';
import { useLookups } from '@/hooks/useLookups';
import type { AppUser } from '@/types';
import { createUser, updateUser, setUserStatus, hardDeleteUser, countOpenInquiriesFor, adminResetPassword } from '@/services/users';
import { PageHeader, DataTable, Modal, Field, Input, Select, Checkbox, Confirm, Spinner, type Column } from '@/components/ui';
import { fmtDateTime } from '@/utils/format';
import { strongPassword } from '@/pages/auth/ChangePassword';

const emptyForm = { email: '', password: '', name: '', phone: '', roleId: '', department: '', branch: '', language: 'ar' as 'ar' | 'en' };

export default function Users() {
  const { user: me, can } = useAuth();
  const { t, lang } = useI18n();
  const { toast } = useToast();
  const nav = useNavigate();
  const { users, roles } = useLookups();
  const [showDeleted, setShowDeleted] = useState(false);
  const [q, setQ] = useState('');
  const [form, setForm] = useState<{ uid?: string; data: typeof emptyForm; prev?: AppUser } | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState<{ u: AppUser; status: 'active' | 'inactive' | 'deleted' } | null>(null);
  const [hard, setHard] = useState<{ u: AppUser; open: number; reassign: string } | null>(null);
  const [tempPw, setTempPw] = useState<string | null>(null);

  const roleName = (id: string) => { const r = roles.find(x => x.id === id); return r ? (lang === 'ar' ? r.nameAr : r.nameEn) : id; };
  const rows = users.filter(u => showDeleted || u.status !== 'deleted').filter(u => !q || [u.nameAr, u.nameEn, u.email, roleName(u.roleId)].some(x => (x || '').toLowerCase().includes(q.toLowerCase())));

  const save = async () => {
    if (!form) return;
    const d = form.data;
    if (!d.email || !d.name.trim() || !d.roleId) return;
    setBusy(true);
    try {
      if (form.uid && form.prev) {
        await updateUser(form.prev, { nameAr: d.name.trim(), nameEn: d.name.trim(), phone: d.phone, roleId: d.roleId, department: d.department, branch: d.branch, language: d.language }, roles);
        toast(t('common.saved'));
      } else {
        if (!strongPassword(d.password)) { toast(t('auth.weak'), 'error'); setBusy(false); return; }
        const { name, ...rest } = d;
        await createUser({ ...rest, nameAr: name.trim(), nameEn: name.trim() }, roles, me!);
        setTempPw(d.password); toast(t('user.created'));
      }
      setForm(null);
    } catch (e: any) { toast(e?.message || t('common.error'), 'error'); } finally { setBusy(false); }
  };

  const changeStatus = async () => {
    if (!confirmStatus) return; setBusy(true);
    try { await setUserStatus(confirmStatus.u, confirmStatus.status); toast(t('user.statusChanged')); setConfirmStatus(null); }
    catch (e: any) { toast(e?.message === 'super_admin' ? t('user.cannotDeleteSuper') : (e?.message || t('common.error')), 'error'); } finally { setBusy(false); }
  };

  const openHard = async (u: AppUser) => { const open = await countOpenInquiriesFor(u.uid); setHard({ u, open, reassign: '' }); };
  const doHard = async () => {
    if (!hard) return;
    if (hard.open > 0 && !hard.reassign) return;
    setBusy(true);
    try { await hardDeleteUser(hard.u, hard.reassign || me!.uid, users); toast(t('user.deleted')); setHard(null); }
    catch (e: any) { toast(e?.message || t('common.error'), 'error'); } finally { setBusy(false); }
  };

  const cols: Column<AppUser & { id?: string }>[] = [
    { key: 'name', header: t('common.name'), render: r => <div className="flex items-center gap-2">{r.isSuperAdmin && <Crown size={14} className="text-warning" />}<div><div className="font-medium" dir="ltr">{r.nameEn || r.nameAr}</div><div className="text-xs text-muted" dir="ltr">{r.email}</div></div></div> },
    { key: 'role', header: t('user.role'), render: r => <span className="badge bg-primary/10 text-primary">{roleName(r.roleId)}</span> },
    { key: 'dept', header: t('user.department'), render: r => <span className="text-xs">{[r.department, r.branch].filter(Boolean).join(' / ')}</span>, className: 'hidden md:table-cell' },
    { key: 'status', header: t('user.status'), render: r => <span className={`badge ${r.status === 'active' ? 'bg-success/15 text-success' : r.status === 'inactive' ? 'bg-warning/15 text-warning' : 'bg-danger/15 text-danger'}`}>{r.status === 'active' ? t('common.active') : r.status === 'inactive' ? t('common.inactive') : t('common.delete')}</span> },
    { key: 'last', header: t('user.lastLogin'), render: r => <span className="text-xs">{fmtDateTime(r.lastLoginAt, lang)}</span>, className: 'hidden lg:table-cell' },
    { key: 'act', header: t('common.actions'), render: r => r.status === 'deleted' ? null : <div className="flex gap-1 flex-wrap">
      {can('users.edit') && <button className="btn-ghost btn-sm" title={t('common.edit')} onClick={() => setForm({ uid: r.uid, prev: r, data: { email: r.email, password: '', name: r.nameEn || r.nameAr, phone: r.phone || '', roleId: r.roleId, department: r.department || '', branch: r.branch || '', language: r.language } })}><Pencil size={14} /></button>}
      {(can('users.edit') || can('roles.manage_permissions')) && <button className="btn-ghost btn-sm" title={t('user.permissions')} onClick={() => nav(`/admin/users/${r.uid}/permissions`)}><ShieldCheck size={14} /></button>}
      {can('users.reset_password') && <button className="btn-ghost btn-sm" title={t('user.resetPassword')} onClick={async () => { await adminResetPassword(r); toast(t('user.resetSent')); }}><KeyRound size={14} /></button>}
      {can('users.deactivate') && !r.isSuperAdmin && (r.status === 'active'
        ? <button className="btn-ghost btn-sm text-warning" title={t('user.deactivate')} onClick={() => setConfirmStatus({ u: r, status: 'inactive' })}><UserX size={14} /></button>
        : <button className="btn-ghost btn-sm text-success" title={t('user.activate')} onClick={() => setConfirmStatus({ u: r, status: 'active' })}><UserCheck size={14} /></button>)}
      {can('users.delete') && !r.isSuperAdmin && r.uid !== me?.uid && <button className="btn-ghost btn-sm text-danger" title={t('user.hardDelete')} onClick={() => openHard(r)}><Trash2 size={14} /></button>}
    </div> }
  ];

  return (
    <div>
      <PageHeader title={t('user.title')} subtitle={`${rows.length}`} actions={<>
        <Input placeholder={t('common.search')} value={q} onChange={e => setQ(e.target.value)} className="w-56" />
        <Checkbox label={t('user.showDeleted')} checked={showDeleted} onChange={e => setShowDeleted(e.target.checked)} />
        {can('users.create') && <button className="btn-primary" onClick={() => setForm({ data: { ...emptyForm } })}><Plus size={16} />{t('user.add')}</button>}
      </>} />
      <div className="card"><DataTable columns={cols} rows={rows.map(r => ({ ...r, id: r.uid }))} /></div>

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.uid ? t('user.edit') : t('user.add')}
        footer={<><button className="btn-secondary" onClick={() => setForm(null)}>{t('common.cancel')}</button><button className="btn-primary" onClick={save} disabled={busy}>{busy ? <Spinner className="text-white" /> : t('common.save')}</button></>}>
        {form && <div className="grid md:grid-cols-2 gap-3">
          <Field label={t('common.name')} required className="md:col-span-2" hint={t('common.englishOnly')}><Input value={form.data.name} onChange={e => setForm({ ...form, data: { ...form.data, name: e.target.value } })} dir="ltr" /></Field>
          <Field label={t('common.email')} required><Input type="email" value={form.data.email} disabled={!!form.uid} onChange={e => setForm({ ...form, data: { ...form.data, email: e.target.value } })} dir="ltr" /></Field>
          {!form.uid && <Field label={t('user.tempPassword')} required hint={t('auth.weak')}><Input type="text" value={form.data.password} onChange={e => setForm({ ...form, data: { ...form.data, password: e.target.value } })} dir="ltr" /></Field>}
          <Field label={t('user.role')} required><Select options={roles.filter(r => r.id !== 'super_admin' || me?.isSuperAdmin).map(r => ({ value: r.id, label: lang === 'ar' ? r.nameAr : r.nameEn }))} value={form.data.roleId} onChange={e => setForm({ ...form, data: { ...form.data, roleId: e.target.value } })} disabled={!!form.uid && !can('users.assign_role')} /></Field>
          <Field label={t('common.phone')}><Input value={form.data.phone} onChange={e => setForm({ ...form, data: { ...form.data, phone: e.target.value } })} dir="ltr" /></Field>
          <Field label={t('user.department')}><Input value={form.data.department} onChange={e => setForm({ ...form, data: { ...form.data, department: e.target.value } })} /></Field>
          <Field label={t('user.branch')}><Input value={form.data.branch} onChange={e => setForm({ ...form, data: { ...form.data, branch: e.target.value } })} /></Field>
          <Field label={t('common.language')}><Select options={[{ value: 'ar', label: 'العربية' }, { value: 'en', label: 'English' }]} value={form.data.language} onChange={e => setForm({ ...form, data: { ...form.data, language: e.target.value as any } })} /></Field>
        </div>}
      </Modal>

      <Confirm open={!!confirmStatus} onClose={() => setConfirmStatus(null)} onConfirm={changeStatus} busy={busy} danger={confirmStatus?.status !== 'active'}
        text={confirmStatus ? `${confirmStatus.status === 'active' ? t('user.activate') : t('user.deactivate')}: ${confirmStatus.u.nameAr}?` : ''} />

      <Modal open={!!hard} onClose={() => setHard(null)} size="sm" title={`${t('user.hardDelete')} — ${hard?.u.nameAr}`}
        footer={<><button className="btn-secondary" onClick={() => setHard(null)}>{t('common.cancel')}</button><button className="btn-danger" onClick={doHard} disabled={busy || (!!hard && hard.open > 0 && !hard.reassign)}>{busy ? <Spinner className="text-white" /> : t('common.delete')}</button></>}>
        {hard && <div className="space-y-3 text-sm">
          <div className="text-danger">{t('user.hardDeleteWarn')}</div>
          <div><b>{hard.open}</b> {t('user.openItems')}</div>
          {hard.open > 0 && <Field label={t('user.reassignTo')} required><Select options={users.filter(u => u.status === 'active' && u.uid !== hard.u.uid).map(u => ({ value: u.uid, label: lang === 'ar' ? u.nameAr : u.nameEn }))} value={hard.reassign} onChange={e => setHard({ ...hard, reassign: e.target.value })} /></Field>}
        </div>}
      </Modal>

      <Modal open={!!tempPw} onClose={() => setTempPw(null)} size="sm" title={t('user.tempPassword')} footer={<button className="btn-primary" onClick={() => setTempPw(null)}>{t('common.close')}</button>}>
        <div className="text-sm">{t('user.created')}</div>
        <div className="font-mono text-lg mt-2 p-2 bg-bg rounded text-center select-all" dir="ltr">{tempPw}</div>
      </Modal>
    </div>
  );
}
