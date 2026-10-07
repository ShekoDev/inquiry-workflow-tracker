import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import { useLookups } from '@/hooks/useLookups';
import { useDoc } from '@/hooks/useCollection';
import type { CountryCode, Inquiry, Priority } from '@/types';
import { COUNTRIES } from '@/constants/countries';
import { SCOPE_TYPES, PRIORITIES } from '@/constants/workflow';
import { createInquiry, updateInquiryFields, isInquiryNoFree } from '@/services/inquiries';
import { findPotentialDuplicates } from '@/services/analytics';
import { autoPriority } from '@/utils/sla';
import { PageHeader, Card, Field, Input, Select, Textarea, Spinner, PriorityBadge } from '@/components/ui';
import { Check, AlertCircle, AlertTriangle } from 'lucide-react';
import { toInputDate, toInputDateTime, fmtDate } from '@/utils/format';

export default function InquiryForm() {
  const { id } = useParams();
  const { user, can } = useAuth();
  const { t, lang } = useI18n();
  const { settings } = useTheme();
  const { toast } = useToast();
  const nav = useNavigate();
  const { clients, projects, peopleFor } = useLookups();
  const { data: existing, loading } = useDoc<Inquiry>(id ? 'inquiries' : null, id);

  const isSales = user?.roleId === 'salesperson';
  const manualNo = settings.inquiryNumbering === 'manual';
  const [f, setF] = useState({
    inquiryNo: '', clientId: '', projectId: '', country: (settings.defaultCountry || 'SA') as CountryCode,
    salespersonId: isSales ? user!.uid : '', scope: '', scopeType: '',
    receivedAt: toInputDateTime(new Date()), requiredSubmissionDate: '', estimatedValue: '', priority: '' as Priority | ''
  });
  const [busy, setBusy] = useState(false);
  const [noCheck, setNoCheck] = useState<'idle' | 'checking' | 'free' | 'taken'>('idle');
  const [duplicates, setDuplicates] = useState<Inquiry[]>([]);

  useEffect(() => {
    if (existing) setF({
      inquiryNo: existing.inquiryNo, clientId: existing.clientId, projectId: existing.projectId || '', country: (existing.country || settings.defaultCountry || 'SA') as CountryCode,
      salespersonId: existing.salespersonId, scope: existing.scopeEn || existing.scopeAr,
      scopeType: existing.scopeType || '', receivedAt: toInputDateTime(existing.receivedAt), requiredSubmissionDate: toInputDate(existing.requiredSubmissionDate),
      estimatedValue: existing.estimatedValue?.toString() || '', priority: existing.priority || ''
    });
  }, [existing]);

  const client = clients.find(c => c.id === f.clientId);

  // picking a client pre-fills the country from that client's market (still overridable)
  useEffect(() => {
    if (!existing && client?.country && client.country !== f.country) setF(prev => ({ ...prev, country: client.country as CountryCode }));
  }, [client?.id]);

  // debounce the "is this number free?" lookup so we don't hit Firestore on every keystroke
  useEffect(() => {
    if (!manualNo || existing) return;
    const no = f.inquiryNo.trim();
    if (!no) { setNoCheck('idle'); return; }
    setNoCheck('checking');
    const h = setTimeout(() => { isInquiryNoFree(no).then(free => setNoCheck(free ? 'free' : 'taken')).catch(() => setNoCheck('idle')); }, 450);
    return () => clearTimeout(h);
  }, [f.inquiryNo, manualNo, existing]);

  // Check for potential duplicates when creating new inquiry
  useEffect(() => {
    if (existing) return; // Only check for new inquiries
    if (!f.clientId) { setDuplicates([]); return; }
    const h = setTimeout(() => {
      const clientName = client?.nameEn || client?.nameAr || '';
      findPotentialDuplicates(clientName, f.projectId ? (projects.find(p => p.id === f.projectId)?.nameEn || projects.find(p => p.id === f.projectId)?.nameAr) : undefined)
        .then(setDuplicates)
        .catch(e => { console.error('Duplicate check error:', e); setDuplicates([]); });
    }, 300);
    return () => clearTimeout(h);
  }, [f.clientId, f.projectId, existing, client, projects]);

  const clientProjects = projects.filter(p => p.clientId === f.clientId);
  // salespeople for this market: real users plus roster members who have no login
  const salesOptions = useMemo(() => peopleFor('salesperson', f.country), [peopleFor, f.country, clients.length]);
  const suggested = useMemo(() => autoPriority(f.requiredSubmissionDate ? new Date(f.requiredSubmissionDate) : undefined, client?.tier, Number(f.estimatedValue) || undefined), [f.requiredSubmissionDate, client?.tier, f.estimatedValue]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !f.clientId || !f.salespersonId || !f.scope.trim()) return;
    if (!existing && manualNo) {
      if (!f.inquiryNo.trim()) { toast(t('inquiry.noRequired'), 'error'); return; }
      if (noCheck === 'taken') { toast(t('inquiry.noTaken'), 'error'); return; }
    }
    setBusy(true);
    try {
      const sp = salesOptions.find(s => s.id === f.salespersonId);
      const proj = clientProjects.find(p => p.id === f.projectId);
      if (existing) {
        const patch: Record<string, unknown> = {
          clientId: f.clientId, clientName: lang === 'ar' ? client!.nameAr : client!.nameEn, projectId: f.projectId || null, projectName: proj ? (lang === 'ar' ? proj.nameAr : proj.nameEn) : '', country: f.country,
          salespersonId: f.salespersonId, salespersonName: sp ? sp.name : existing.salespersonName,
          scopeAr: f.scope.trim(), scopeEn: f.scope.trim(), scopeType: f.scopeType || null,
          requiredSubmissionDate: f.requiredSubmissionDate ? Timestamp.fromDate(new Date(f.requiredSubmissionDate)) : null,
          estimatedValue: f.estimatedValue ? Number(f.estimatedValue) : null
        };
        await updateInquiryFields(existing, patch, user);
        toast(t('common.saved')); nav(`/inquiries/${existing.id}`);
      } else {
        const newId = await createInquiry({
          inquiryNo: manualNo ? f.inquiryNo.trim() : undefined,
          clientId: f.clientId, clientName: client!.nameAr || client!.nameEn, projectId: f.projectId || undefined, projectName: proj ? (proj.nameAr || proj.nameEn) : undefined, country: f.country,
          salespersonId: f.salespersonId, salespersonName: sp ? sp.name : '', scopeAr: f.scope.trim(), scopeEn: f.scope.trim(), scopeType: f.scopeType || undefined,
          receivedAt: new Date(f.receivedAt), requiredSubmissionDate: f.requiredSubmissionDate ? new Date(f.requiredSubmissionDate) : undefined,
          estimatedValue: f.estimatedValue ? Number(f.estimatedValue) : undefined,
          priority: (f.priority || suggested) as Priority, prioritySource: f.priority ? 'manual' : 'auto'
        }, user, settings);
        toast(t('inquiry.created')); nav(`/inquiries/${newId}`);
      }
    } catch (ex: any) {
      const m = ex?.message === 'inquiry_no_taken' ? t('inquiry.noTaken') : ex?.message === 'inquiry_no_required' ? t('inquiry.noRequired') : (ex?.message || t('common.error'));
      toast(m, 'error');
    }
    finally { setBusy(false); }
  };

  if (id && loading) return <Spinner />;
  return (
    <form onSubmit={submit}>
      <PageHeader title={existing ? t('inquiry.edit') : t('inquiry.create')} actions={<>
        <button type="button" className="btn-secondary" onClick={() => nav(-1)}>{t('common.cancel')}</button>
        <button className="btn-primary" disabled={busy}>{busy ? <Spinner className="text-white" /> : t('common.save')}</button>
      </>} />
      <div className="grid lg:grid-cols-3 gap-4">
        {!existing && duplicates.length > 0 && (
          <div className="lg:col-span-3 p-4 bg-warning/10 border border-warning rounded-lg flex gap-3 items-start">
            <AlertTriangle className="text-warning flex-shrink-0 mt-0.5" size={20} />
            <div>
              <div className="font-semibold text-sm text-warning">{t('inquiry.potentialDuplicates')}</div>
              <div className="text-xs text-warning/80 mt-1">
                {duplicates.map(d => (
                  <div key={d.id} className="mt-1">
                    <span className="font-mono">{d.inquiryNo}</span> — {d.clientName}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        <Card title={t('inquiry.overview')} className="lg:col-span-2">
          <div className="grid md:grid-cols-2 gap-3">
            {manualNo ? (
              <Field label={t('inquiry.manualNo')} required hint={t('inquiry.manualNoHint')} className="md:col-span-2">
                <Input value={f.inquiryNo} onChange={e => setF({ ...f, inquiryNo: e.target.value })} disabled={!!existing} required dir="ltr" className="font-mono" placeholder="INQ-2026-0001" />
                {!existing && noCheck === 'checking' && <div className="text-[11px] text-muted mt-1">{t('inquiry.checkingNo')}</div>}
                {!existing && noCheck === 'free' && <div className="text-[11px] text-success mt-1 flex items-center gap-1"><Check size={12} />{t('inquiry.noFree')}</div>}
                {!existing && noCheck === 'taken' && <div className="text-[11px] text-danger mt-1 flex items-center gap-1"><AlertCircle size={12} />{t('inquiry.noTaken')}</div>}
              </Field>
            ) : existing ? (
              <Field label={t('inquiry.no')} className="md:col-span-2"><Input value={f.inquiryNo} disabled dir="ltr" className="font-mono" /></Field>
            ) : null}
            <Field label={t('inquiry.country')} required>
              <Select options={COUNTRIES.map(c => ({ value: c.code, label: `${c.flag} ${lang === 'ar' ? c.nameAr : c.nameEn}` }))} value={f.country} onChange={e => setF({ ...f, country: e.target.value as CountryCode })} required />
            </Field>
            <Field label={t('inquiry.client')} required><Select options={clients.filter(c => c.isActive).map(c => ({ value: c.id, label: lang === 'ar' ? c.nameAr : c.nameEn }))} value={f.clientId} onChange={e => setF({ ...f, clientId: e.target.value, projectId: '' })} required /></Field>
            <Field label={t('inquiry.project')}><Select options={clientProjects.map(p => ({ value: p.id, label: lang === 'ar' ? p.nameAr : p.nameEn }))} value={f.projectId} onChange={e => setF({ ...f, projectId: e.target.value })} /></Field>
            <Field label={t('inquiry.salesperson')} required>
              <Select options={salesOptions.map(s => ({ value: s.id, label: s.name }))} value={f.salespersonId} onChange={e => setF({ ...f, salespersonId: e.target.value })} disabled={isSales && !can('inquiries.assign')} required />
            </Field>
            <Field label={t('inquiry.scopeType')}><Select options={SCOPE_TYPES.map(s => ({ value: s, label: t(`scopeType.${s}`) }))} value={f.scopeType} onChange={e => setF({ ...f, scopeType: e.target.value })} /></Field>
            <Field label={t('inquiry.scope')} required className="md:col-span-2" hint={t('common.englishOnly')}>
              <Textarea value={f.scope} onChange={e => setF({ ...f, scope: e.target.value })} required dir="ltr" />
            </Field>
          </div>
        </Card>
        <div className="space-y-4">
          <Card title={t('common.date')}>
            <div className="space-y-3">
              <Field label={t('inquiry.received')} required><Input type="datetime-local" value={f.receivedAt} onChange={e => setF({ ...f, receivedAt: e.target.value })} disabled={!!existing} required /></Field>
              <Field label={t('inquiry.requiredDate')}><Input type="date" value={f.requiredSubmissionDate} onChange={e => setF({ ...f, requiredSubmissionDate: e.target.value })} /></Field>
              <Field label={`${t('inquiry.estimatedValue')} (${settings.currency})`}><Input type="number" min={0} value={f.estimatedValue} onChange={e => setF({ ...f, estimatedValue: e.target.value })} /></Field>
            </div>
          </Card>
          {!existing && (
            <Card title={t('inquiry.priority')}>
              <div className="space-y-2">
                <div className="text-xs text-muted flex items-center gap-2">{t('inquiry.autoPriority')}: <PriorityBadge priority={suggested} /></div>
                {can('inquiries.set_priority') && (
                  <Field label={t('inquiry.manualPriority')}><Select options={PRIORITIES.map(p => ({ value: p.key, label: t(`priority.${p.key}`) }))} value={f.priority} onChange={e => setF({ ...f, priority: e.target.value as Priority })} placeholder={t('inquiry.autoPriority')} /></Field>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </form>
  );
}
