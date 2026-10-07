import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/i18n/I18nProvider';
import { useToast } from '@/contexts/ToastContext';
import { useLookups } from '@/hooks/useLookups';
import type { CountryCode, Project } from '@/types';
import { COUNTRIES } from '@/constants/countries';
import { saveProject, deleteProject } from '@/services/masterData';
import { PageHeader, DataTable, Modal, Field, Input, Select, Checkbox, Confirm, CountryBadge, CountryFilter, type Column } from '@/components/ui';

const empty = { name: '', clientId: '', country: 'SA' as CountryCode, city: '', isActive: true };

export default function Projects() {
  const { user, can } = useAuth();
  const { t, lang } = useI18n();
  const { toast } = useToast();
  const { projects, clients } = useLookups();
  const [edit, setEdit] = useState<{ id?: string; data: typeof empty } | null>(null);
  const [del, setDel] = useState<Project | null>(null);
  const [q, setQ] = useState('');
  const [country, setCountry] = useState('');
  const clientName = (id: string) => { const c = clients.find(x => x.id === id); return c ? (lang === 'ar' ? c.nameAr : c.nameEn) : ''; };
  const rows = projects
    .filter(p => !country || (p.country || clients.find(c => c.id === p.clientId)?.country) === country)
    .filter(p => !q || [p.nameAr, p.nameEn, clientName(p.clientId)].some(x => (x || '').toLowerCase().includes(q.toLowerCase())));

  const save = async () => {
    if (!edit || !user || !edit.data.name.trim() || !edit.data.clientId) return;
    const { name, ...rest } = edit.data;
    try { await saveProject({ ...rest, nameAr: name.trim(), nameEn: name.trim(), createdBy: user.uid }, edit.id); toast(t('common.saved')); setEdit(null); }
    catch (e: any) { toast(e?.message || t('common.error'), 'error'); }
  };
  const cols: Column<Project>[] = [
    { key: 'name', header: t('common.name'), render: r => <span className="font-medium" dir="ltr">{r.nameEn || r.nameAr}</span> },
    { key: 'client', header: t('project.client'), render: r => clientName(r.clientId) },
    { key: 'country', header: t('project.country'), render: r => <CountryBadge country={r.country || clients.find(c => c.id === r.clientId)?.country} /> },
    { key: 'city', header: t('client.city'), render: r => r.city || '' },
    { key: 'active', header: t('common.status'), render: r => <span className={`badge ${r.isActive ? 'bg-success/15 text-success' : 'bg-bg text-muted'}`}>{r.isActive ? t('common.active') : t('common.inactive')}</span> },
    { key: 'act', header: '', render: r => <div className="flex gap-1">
      {can('projects.edit') && <button className="btn-ghost btn-sm" onClick={() => setEdit({ id: r.id, data: { name: r.nameEn || r.nameAr, clientId: r.clientId, country: r.country || 'SA', city: r.city || '', isActive: r.isActive } })}><Pencil size={14} /></button>}
      {can('projects.delete') && <button className="btn-ghost btn-sm text-danger" onClick={() => setDel(r)}><Trash2 size={14} /></button>}
    </div> }
  ];
  return (
    <div>
      <PageHeader title={t('project.title')} actions={<>
        <CountryFilter value={country} onChange={setCountry} allLabel={t('country.all')} />
        <Input placeholder={t('common.search')} value={q} onChange={e => setQ(e.target.value)} className="w-56" />
        {can('projects.create') && <button className="btn-primary" onClick={() => setEdit({ data: { ...empty } })}><Plus size={16} />{t('project.add')}</button>}
      </>} />
      <div className="card"><DataTable columns={cols} rows={rows} /></div>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? t('project.edit') : t('project.add')}
        footer={<><button className="btn-secondary" onClick={() => setEdit(null)}>{t('common.cancel')}</button><button className="btn-primary" onClick={save}>{t('common.save')}</button></>}>
        {edit && <div className="grid md:grid-cols-2 gap-3">
          <Field label={t('project.client')} required className="md:col-span-2"><Select options={clients.map(c => ({ value: c.id, label: lang === 'ar' ? c.nameAr : c.nameEn }))} value={edit.data.clientId} onChange={e => setEdit({ ...edit, data: { ...edit.data, clientId: e.target.value } })} /></Field>
          <Field label={t('common.name')} required className="md:col-span-2" hint={t('common.englishOnly')}><Input value={edit.data.name} onChange={e => setEdit({ ...edit, data: { ...edit.data, name: e.target.value } })} dir="ltr" /></Field>
          <Field label={t('project.country')} required><Select options={COUNTRIES.map(c => ({ value: c.code, label: `${c.flag} ${lang === 'ar' ? c.nameAr : c.nameEn}` }))} value={edit.data.country} onChange={e => setEdit({ ...edit, data: { ...edit.data, country: e.target.value as CountryCode } })} /></Field>
          <Field label={t('client.city')}><Input value={edit.data.city} onChange={e => setEdit({ ...edit, data: { ...edit.data, city: e.target.value } })} /></Field>
          <div className="flex items-end pb-2"><Checkbox label={t('common.active')} checked={edit.data.isActive} onChange={e => setEdit({ ...edit, data: { ...edit.data, isActive: e.target.checked } })} /></div>
        </div>}
      </Modal>
      <Confirm open={!!del} onClose={() => setDel(null)} danger onConfirm={async () => { if (del) { await deleteProject(del); setDel(null); toast(t('common.deleted')); } }} />
    </div>
  );
}
