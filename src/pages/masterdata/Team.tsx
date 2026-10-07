import { useState } from 'react';
import { Plus, Pencil, Trash2, Download } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/i18n/I18nProvider';
import { useToast } from '@/contexts/ToastContext';
import { useLookups } from '@/hooks/useLookups';
import type { CountryCode, TeamMember, TeamMemberType } from '@/types';
import { COUNTRIES } from '@/constants/countries';
import { saveTeamMember, deleteTeamMember, seedTeam } from '@/services/masterData';
import { PageHeader, DataTable, Modal, Field, Input, Select, Checkbox, Confirm, CountryBadge, CountryFilter, type Column } from '@/components/ui';

const empty = { name: '', type: 'both' as TeamMemberType, country: 'SA' as CountryCode, phone: '', email: '', isActive: true };
const TYPES: TeamMemberType[] = ['engineer', 'salesperson', 'both'];

export default function Team() {
  const { user, can } = useAuth();
  const { t, lang } = useI18n();
  const { toast } = useToast();
  const { team } = useLookups();
  const [edit, setEdit] = useState<{ id?: string; data: typeof empty } | null>(null);
  const [del, setDel] = useState<TeamMember | null>(null);
  const [q, setQ] = useState('');
  const [country, setCountry] = useState('');
  const [busy, setBusy] = useState(false);

  const rows = team
    .filter(m => !country || m.country === country)
    .filter(m => !q || m.name.toLowerCase().includes(q.toLowerCase()));

  const save = async () => {
    if (!edit || !user || !edit.data.name.trim()) return;
    setBusy(true);
    try { await saveTeamMember({ ...edit.data, name: edit.data.name.trim(), createdBy: user.uid }, edit.id); toast(t('common.saved')); setEdit(null); }
    catch (e: any) { toast(e?.message || t('common.error'), 'error'); } finally { setBusy(false); }
  };

  const doSeed = async () => {
    if (!user) return;
    setBusy(true);
    try { const n = await seedTeam(user.uid); toast(n ? t('team.seeded', { n }) : t('team.seedSkipped')); }
    catch (e: any) { toast(e?.message || t('common.error'), 'error'); } finally { setBusy(false); }
  };

  const cols: Column<TeamMember>[] = [
    { key: 'name', header: t('common.name'), render: r => <span className="font-medium" dir="ltr">{r.name}</span> },
    { key: 'type', header: t('team.type'), render: r => <span className="badge bg-primary/10 text-primary">{t(`team.types.${r.type}`)}</span> },
    { key: 'country', header: t('team.country'), render: r => <CountryBadge country={r.country} /> },
    { key: 'contact', header: t('client.contact'), render: r => <div className="text-xs" dir="ltr">{r.phone || ''}{r.email ? <div className="text-muted">{r.email}</div> : null}</div> },
    { key: 'active', header: t('common.status'), render: r => <span className={`badge ${r.isActive !== false ? 'bg-success/15 text-success' : 'bg-bg text-muted'}`}>{r.isActive !== false ? t('common.active') : t('common.inactive')}</span> },
    { key: 'act', header: '', render: r => <div className="flex gap-1">
      {can('team.edit') && <button className="btn-ghost btn-sm" onClick={() => setEdit({ id: r.id, data: { name: r.name, type: r.type, country: r.country || 'SA', phone: r.phone || '', email: r.email || '', isActive: r.isActive !== false } })}><Pencil size={14} /></button>}
      {can('team.delete') && <button className="btn-ghost btn-sm text-danger" onClick={() => setDel(r)}><Trash2 size={14} /></button>}
    </div> }
  ];

  return (
    <div>
      <PageHeader title={t('team.title')} subtitle={t('team.hint')} actions={<>
        <CountryFilter value={country} onChange={setCountry} allLabel={t('country.all')} />
        <Input placeholder={t('common.search')} value={q} onChange={e => setQ(e.target.value)} className="w-48" />
        {can('team.create') && team.length === 0 && <button className="btn-secondary" onClick={doSeed} disabled={busy}><Download size={16} />{t('team.seed')}</button>}
        {can('team.create') && <button className="btn-primary" onClick={() => setEdit({ data: { ...empty } })}><Plus size={16} />{t('team.add')}</button>}
      </>} />
      <div className="card"><DataTable columns={cols} rows={rows} empty={t('team.none')} /></div>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? t('team.edit') : t('team.add')}
        footer={<><button className="btn-secondary" onClick={() => setEdit(null)}>{t('common.cancel')}</button><button className="btn-primary" onClick={save} disabled={busy || !edit?.data.name.trim()}>{t('common.save')}</button></>}>
        {edit && <div className="grid md:grid-cols-2 gap-3">
          <Field label={t('common.name')} required className="md:col-span-2" hint={t('common.englishOnly')}>
            <Input value={edit.data.name} onChange={e => setEdit({ ...edit, data: { ...edit.data, name: e.target.value } })} dir="ltr" placeholder="Omar Ragheb" />
          </Field>
          <Field label={t('team.type')} required>
            <Select options={TYPES.map(x => ({ value: x, label: t(`team.types.${x}`) }))} value={edit.data.type} onChange={e => setEdit({ ...edit, data: { ...edit.data, type: e.target.value as TeamMemberType } })} />
          </Field>
          <Field label={t('team.country')} required>
            <Select options={COUNTRIES.map(c => ({ value: c.code, label: `${c.flag} ${lang === 'ar' ? c.nameAr : c.nameEn}` }))} value={edit.data.country} onChange={e => setEdit({ ...edit, data: { ...edit.data, country: e.target.value as CountryCode } })} />
          </Field>
          <Field label={t('common.phone')}><Input value={edit.data.phone} onChange={e => setEdit({ ...edit, data: { ...edit.data, phone: e.target.value } })} dir="ltr" /></Field>
          <Field label={t('common.email')}><Input type="email" value={edit.data.email} onChange={e => setEdit({ ...edit, data: { ...edit.data, email: e.target.value } })} dir="ltr" /></Field>
          <div className="flex items-end pb-2 md:col-span-2"><Checkbox label={t('common.active')} checked={edit.data.isActive} onChange={e => setEdit({ ...edit, data: { ...edit.data, isActive: e.target.checked } })} /></div>
        </div>}
      </Modal>

      <Confirm open={!!del} onClose={() => setDel(null)} danger text={del ? `${t('common.delete')}: ${del.name}?` : ''}
        onConfirm={async () => { if (del) { try { await deleteTeamMember(del); toast(t('common.deleted')); } catch (e: any) { toast(e?.message || t('common.error'), 'error'); } setDel(null); } }} />
    </div>
  );
}
