import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/i18n/I18nProvider';
import { useToast } from '@/contexts/ToastContext';
import { useLookups } from '@/hooks/useLookups';
import type { Client, CountryCode } from '@/types';
import { COUNTRIES } from '@/constants/countries';
import { saveClient, deleteClient } from '@/services/masterData';
import { PageHeader, DataTable, Modal, Field, Input, Select, Checkbox, Confirm, CountryBadge, CountryFilter, type Column } from '@/components/ui';

const empty = { name: '', contactPerson: '', phone: '', email: '', country: 'SA' as CountryCode, city: '', tier: 'B' as 'A' | 'B' | 'C', isActive: true };

export default function Clients() {
  const { user, can } = useAuth();
  const { t, lang } = useI18n();
  const { toast } = useToast();
  const { clients } = useLookups();
  const [edit, setEdit] = useState<{ id?: string; data: typeof empty; prev?: Client } | null>(null);
  const [del, setDel] = useState<Client | null>(null);
  const [q, setQ] = useState('');
  const [country, setCountry] = useState('');

  const rows = clients
    .filter(c => !country || c.country === country)
    .filter(c => !q || [c.nameAr, c.nameEn, c.contactPerson, c.city].some(x => (x || '').toLowerCase().includes(q.toLowerCase())));
  const save = async () => {
    if (!edit || !user || !edit.data.name.trim()) return;
    // one English name is stored in both language fields so every screen and report keeps working
    const { name, ...rest } = edit.data;
    try { await saveClient({ ...rest, nameAr: name.trim(), nameEn: name.trim(), createdBy: user.uid }, edit.id, edit.prev); toast(t('common.saved')); setEdit(null); }
    catch (e: any) { toast(e?.message || t('common.error'), 'error'); }
  };
  const cols: Column<Client>[] = [
    { key: 'name', header: t('common.name'), render: r => <span className="font-medium" dir="ltr">{r.nameEn || r.nameAr}</span> },
    { key: 'contact', header: t('client.contact'), render: r => <div>{r.contactPerson}<div className="text-xs text-muted" dir="ltr">{r.phone}</div></div> },
    { key: 'country', header: t('client.country'), render: r => <CountryBadge country={r.country} /> },
    { key: 'city', header: t('client.city'), render: r => r.city || '' },
    { key: 'tier', header: t('client.tier'), render: r => <span className="badge bg-primary/10 text-primary">{r.tier || '—'}</span> },
    { key: 'active', header: t('common.status'), render: r => <span className={`badge ${r.isActive ? 'bg-success/15 text-success' : 'bg-bg text-muted'}`}>{r.isActive ? t('common.active') : t('common.inactive')}</span> },
    { key: 'act', header: '', render: r => <div className="flex gap-1">
      {can('clients.edit') && <button className="btn-ghost btn-sm" onClick={() => setEdit({ id: r.id, prev: r, data: { name: r.nameEn || r.nameAr, contactPerson: r.contactPerson || '', phone: r.phone || '', email: r.email || '', country: r.country || 'SA', city: r.city || '', tier: r.tier || 'B', isActive: r.isActive } })}><Pencil size={14} /></button>}
      {can('clients.delete') && <button className="btn-ghost btn-sm text-danger" onClick={() => setDel(r)}><Trash2 size={14} /></button>}
    </div> }
  ];
  return (
    <div>
      <PageHeader title={t('client.title')} actions={<>
        <CountryFilter value={country} onChange={setCountry} allLabel={t('country.all')} />
        <Input placeholder={t('common.search')} value={q} onChange={e => setQ(e.target.value)} className="w-56" />
        {can('clients.create') && <button className="btn-primary" onClick={() => setEdit({ data: { ...empty } })}><Plus size={16} />{t('client.add')}</button>}
      </>} />
      <div className="card"><DataTable columns={cols} rows={rows} /></div>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? t('client.edit') : t('client.add')}
        footer={<><button className="btn-secondary" onClick={() => setEdit(null)}>{t('common.cancel')}</button><button className="btn-primary" onClick={save}>{t('common.save')}</button></>}>
        {edit && <div className="grid md:grid-cols-2 gap-3">
          <Field label={t('common.name')} required className="md:col-span-2" hint={t('common.englishOnly')}><Input value={edit.data.name} onChange={e => setEdit({ ...edit, data: { ...edit.data, name: e.target.value } })} dir="ltr" /></Field>
          <Field label={t('client.contact')}><Input value={edit.data.contactPerson} onChange={e => setEdit({ ...edit, data: { ...edit.data, contactPerson: e.target.value } })} /></Field>
          <Field label={t('common.phone')}><Input value={edit.data.phone} onChange={e => setEdit({ ...edit, data: { ...edit.data, phone: e.target.value } })} dir="ltr" /></Field>
          <Field label={t('common.email')}><Input type="email" value={edit.data.email} onChange={e => setEdit({ ...edit, data: { ...edit.data, email: e.target.value } })} dir="ltr" /></Field>
          <Field label={t('client.country')} required><Select options={COUNTRIES.map(c => ({ value: c.code, label: `${c.flag} ${lang === 'ar' ? c.nameAr : c.nameEn}` }))} value={edit.data.country} onChange={e => setEdit({ ...edit, data: { ...edit.data, country: e.target.value as CountryCode } })} /></Field>
          <Field label={t('client.city')}><Input value={edit.data.city} onChange={e => setEdit({ ...edit, data: { ...edit.data, city: e.target.value } })} /></Field>
          <Field label={t('client.tier')}><Select options={['A', 'B', 'C'].map(x => ({ value: x, label: x }))} value={edit.data.tier} onChange={e => setEdit({ ...edit, data: { ...edit.data, tier: e.target.value as any } })} /></Field>
          <div className="flex items-end pb-2"><Checkbox label={t('common.active')} checked={edit.data.isActive} onChange={e => setEdit({ ...edit, data: { ...edit.data, isActive: e.target.checked } })} /></div>
        </div>}
      </Modal>
      <Confirm open={!!del} onClose={() => setDel(null)} danger onConfirm={async () => { if (del) { await deleteClient(del); setDel(null); toast(t('common.deleted')); } }} />
    </div>
  );
}
