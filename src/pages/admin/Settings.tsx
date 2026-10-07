import { useEffect, useState } from 'react';
import { Save, Plus, Trash2, Eraser } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import type { CountryCode, GeneralSettings, ThemeDef, Priority, CopyrightFxStyle } from '@/types';
import { COUNTRIES } from '@/constants/countries';
import { saveSettings, saveTheme, deleteTheme } from '@/services/settings';
import { cleanupOrphans } from '@/services/maintenance';
import { SYSTEM_THEMES } from '@/constants/themes';
import { PRIORITIES } from '@/constants/workflow';
import { PageHeader, Card, Tabs, Field, Input, Select, Checkbox, Textarea, Spinner, Confirm } from '@/components/ui';

export default function Settings() {
  const { can } = useAuth();
  const { t, lang } = useI18n();
  const { settings, themes } = useTheme();
  const { toast } = useToast();
  const [tab, setTab] = useState('general');
  const [s, setS] = useState<GeneralSettings>(settings);
  const [busy, setBusy] = useState(false);
  const [theme, setTheme] = useState<ThemeDef | null>(null);
  const [delTheme, setDelTheme] = useState<ThemeDef | null>(null);
  const [confirmClean, setConfirmClean] = useState(false);
  useEffect(() => setS(settings), [settings]);

  const canGeneral = can('settings.edit_general'), canTheme = can('settings.edit_theme'), canSla = can('settings.edit_sla');
  const save = async () => { setBusy(true); try { await saveSettings(s, settings); toast(t('settings.saved')); } catch (e: any) { toast(e?.message || t('common.error'), 'error'); } finally { setBusy(false); } };

  const newTheme = () => setTheme({ ...SYSTEM_THEMES[0], id: `custom_${Date.now().toString(36)}`, nameAr: 'ثيم مخصص', nameEn: 'Custom theme', isSystem: false, colors: { ...SYSTEM_THEMES[0].colors }, dark: { ...SYSTEM_THEMES[0].dark } });
  const doSaveTheme = async () => { if (!theme) return; setBusy(true); try { await saveTheme(theme); toast(t('common.saved')); setTheme(null); } catch (e: any) { toast(e?.message || t('common.error'), 'error'); } finally { setBusy(false); } };

  // clears anything left behind by the old soft-delete: deleted inquiries and orphan records
  const doCleanup = async () => {
    setBusy(true);
    try { const r = await cleanupOrphans(); toast(r.total ? t('settings.cleanupDone', { n: r.total }) : t('settings.cleanupNothing')); }
    catch (e: any) { toast(e?.message || t('common.error'), 'error'); } finally { setBusy(false); setConfirmClean(false); }
  };

  const colorKeys = Object.keys(SYSTEM_THEMES[0].colors) as (keyof ThemeDef['colors'])[];
  const darkKeys = Object.keys(SYSTEM_THEMES[0].dark) as (keyof ThemeDef['dark'])[];

  return (
    <div>
      <PageHeader title={t('settings.title')} actions={tab !== 'theme' && (canGeneral || canSla) && <button className="btn-primary" onClick={save} disabled={busy}>{busy ? <Spinner className="text-white" /> : <><Save size={16} />{t('common.save')}</>}</button>} />
      <Tabs active={tab} onChange={setTab} tabs={[{ key: 'general', label: t('settings.general') }, { key: 'sla', label: t('settings.sla') }, { key: 'theme', label: t('settings.theme') }]} />
      <div className="mt-4 grid lg:grid-cols-2 gap-4">
        {tab === 'general' && <>
          <Card title={t('settings.company')}>
            <div className="space-y-3">
              <Field label={t('settings.companyNameAr')}><Input value={s.companyNameAr} disabled={!canGeneral} onChange={e => setS({ ...s, companyNameAr: e.target.value })} dir="rtl" /></Field>
              <Field label={t('settings.companyNameEn')}><Input value={s.companyNameEn} disabled={!canGeneral} onChange={e => setS({ ...s, companyNameEn: e.target.value })} dir="ltr" /></Field>
              <Field label={t('settings.logo') + ' (URL)'}><Input value={s.logoUrl || ''} disabled={!canGeneral} onChange={e => setS({ ...s, logoUrl: e.target.value })} dir="ltr" /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t('settings.defaultLanguage')}><Select options={[{ value: 'ar', label: 'العربية' }, { value: 'en', label: 'English' }]} value={s.defaultLanguage} disabled={!canGeneral} onChange={e => setS({ ...s, defaultLanguage: e.target.value as any })} /></Field>
                <Field label={t('settings.currency')}><Input value={s.currency} disabled={!canGeneral} onChange={e => setS({ ...s, currency: e.target.value })} dir="ltr" /></Field>
              </div>
              <Field label={t('settings.defaultCountry')} hint={COUNTRIES.map(c => `${c.flag} ${lang === 'ar' ? c.nameAr : c.nameEn} — ${c.currency} / ${c.vatPct}%`).join('   ')}>
                <Select options={COUNTRIES.map(c => ({ value: c.code, label: `${c.flag} ${lang === 'ar' ? c.nameAr : c.nameEn}` }))}
                  value={s.defaultCountry || 'SA'} disabled={!canGeneral} onChange={e => setS({ ...s, defaultCountry: e.target.value as CountryCode })} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t('settings.defaultTheme')}><Select options={themes.map(th => ({ value: th.id, label: lang === 'ar' ? th.nameAr : th.nameEn }))} value={s.defaultThemeId} disabled={!canTheme && !canGeneral} onChange={e => setS({ ...s, defaultThemeId: e.target.value })} /></Field>
                <div className="flex items-end pb-2"><Checkbox label={t('settings.allowUserTheme')} checked={s.allowUserTheme} disabled={!canGeneral} onChange={e => setS({ ...s, allowUserTheme: e.target.checked })} /></div>
              </div>
            </div>
          </Card>
          <Card title={t('settings.general')}>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('settings.validity')}><Input type="number" value={s.quotationValidityDays} disabled={!canGeneral} onChange={e => setS({ ...s, quotationValidityDays: Number(e.target.value) })} /></Field>
              <Field label={t('settings.retention')}><Input type="number" value={s.logRetentionMonths} disabled={!canGeneral} onChange={e => setS({ ...s, logRetentionMonths: Number(e.target.value) })} /></Field>
            </div>
          </Card>
          <Card title={lang === 'ar' ? '✨ توقيع الحقوق (نيون)' : '✨ Copyright signature (neon)'} className="lg:col-span-2">
            {(() => {
              const fx = s.copyrightFx || { enabled: false, style: 'sweep' as const, color: '' };
              const setFx = (patch: Partial<typeof fx>) => setS({ ...s, copyrightFx: { ...fx, ...patch } });
              const followTheme = !fx.color;
              const styles: { key: CopyrightFxStyle; ar: string; en: string }[] = [
                { key: 'sweep',   ar: 'لمعان متحرك',   en: 'Moving shine' },
                { key: 'glow',    ar: 'توهج هادئ',     en: 'Soft glow' },
                { key: 'pulse',   ar: 'نبض نيون',      en: 'Neon pulse' },
                { key: 'frame',   ar: 'إطار نيون',     en: 'Neon frame' },
                { key: 'box',     ar: 'صندوق نيون',    en: 'Neon box' },
                { key: 'flicker', ar: 'وميض لافتة',    en: 'Sign flicker' }
              ];
              const previewVars = fx.color ? ({ '--fx-color': fx.color } as React.CSSProperties) : undefined;
              return (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <Checkbox label={lang === 'ar' ? 'تفعيل التأثير على جملة الحقوق' : 'Enable effect on the copyright line'}
                      checked={fx.enabled} disabled={!canGeneral} onChange={e => setFx({ enabled: e.target.checked })} />
                    <Checkbox label={lang === 'ar' ? 'اتبع لون الثيم تلقائيًا' : 'Follow theme color'}
                      checked={followTheme} disabled={!canGeneral || !fx.enabled} onChange={e => setFx({ color: e.target.checked ? '' : '#00e5ff' })} />
                    {!followTheme && (
                      <label className="flex items-center gap-2 text-sm">
                        <span>{lang === 'ar' ? 'اللون:' : 'Color:'}</span>
                        <input type="color" value={fx.color || '#00e5ff'} disabled={!canGeneral || !fx.enabled}
                          onChange={e => setFx({ color: e.target.value })}
                          className="h-8 w-12 rounded cursor-pointer border border-border bg-transparent" />
                        <span className="font-mono text-xs text-muted" dir="ltr">{fx.color}</span>
                      </label>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {styles.map(st => (
                      <button key={st.key} type="button" disabled={!canGeneral || !fx.enabled}
                        onClick={() => setFx({ style: st.key })}
                        className={`rounded-lg border p-3 text-center transition disabled:opacity-40 ${fx.style === st.key ? 'border-primary ring-2 ring-primary/40' : 'border-border hover:border-primary/50'}`}>
                        <div className="rounded-md bg-[#101a2e] py-3 px-2 mb-2 overflow-hidden">
                          <span className={`fx-base fx-${st.key} text-[11px] whitespace-nowrap`} style={previewVars}>
                            {lang === 'ar' ? 'جميع حقوق الملكية محفوظة لمحمود شهاب' : 'All rights reserved to Mahmoud Shehab'}
                          </span>
                        </div>
                        <div className="text-xs font-medium">{lang === 'ar' ? st.ar : st.en}</div>
                      </button>
                    ))}
                  </div>
                  <div className="text-xs text-muted">
                    {lang === 'ar'
                      ? 'التأثير يظهر لكل المستخدمين في القائمة الجانبية وأسفل الصفحة. أطفئه أو غيّر شكله ولونه في أي وقت — التحكم للمسؤول فقط.'
                      : 'The effect is shown to all users in the sidebar and page footer. Turn it on/off or change style and color anytime — admin only.'}
                  </div>
                </div>
              );
            })()}
          </Card>
          <Card title={t('settings.maintenance')} className="lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-muted flex-1 min-w-[240px]">{t('settings.cleanupHint')}</div>
              <button className="btn-danger" onClick={() => setConfirmClean(true)} disabled={busy || !canGeneral}>
                <Eraser size={16} />{t('settings.cleanup')}
              </button>
            </div>
          </Card>
          <Card title={t('settings.numbering')}>
            <div className="grid md:grid-cols-2 gap-3">
              <Field label={t('settings.inquiryNumbering')} hint={s.inquiryNumbering === 'manual' ? t('inquiry.manualNoHint') : t('inquiry.autoNoHint')}>
                <Select options={[{ value: 'auto', label: t('settings.numberingAuto') }, { value: 'manual', label: t('settings.numberingManual') }]}
                  value={s.inquiryNumbering || 'auto'} disabled={!canGeneral} onChange={e => setS({ ...s, inquiryNumbering: e.target.value as 'auto' | 'manual' })} />
              </Field>
              <Field label={t('settings.quotationNumbering')}>
                <Select options={[{ value: 'auto', label: t('settings.numberingAuto') }, { value: 'manual', label: t('settings.numberingManual') }]}
                  value={s.quotationNumbering || 'auto'} disabled={!canGeneral} onChange={e => setS({ ...s, quotationNumbering: e.target.value as 'auto' | 'manual' })} />
              </Field>
              {s.inquiryNumbering !== 'manual' && (
                <Field label={t('settings.inquiryPrefix')}><Input value={s.inquiryPrefix} disabled={!canGeneral} onChange={e => setS({ ...s, inquiryPrefix: e.target.value.toUpperCase() })} dir="ltr" /></Field>
              )}
              {s.quotationNumbering !== 'manual' && (
                <Field label={t('settings.quotationPrefix')}><Input value={s.quotationPrefix} disabled={!canGeneral} onChange={e => setS({ ...s, quotationPrefix: e.target.value.toUpperCase() })} dir="ltr" /></Field>
              )}
            </div>
          </Card>
        </>}
        {tab === 'sla' && <>
          <Card title={t('settings.sla')}>
            <div className="space-y-3">
              {PRIORITIES.map(p => (
                <Field key={p.key} label={`${t(`priority.${p.key}`)} — ${t('common.hours')}`}>
                  <Input type="number" min={1} value={s.slaHours[p.key as Priority]} disabled={!canSla} onChange={e => setS({ ...s, slaHours: { ...s.slaHours, [p.key]: Number(e.target.value) } })} />
                </Field>
              ))}
              <Field label={t('settings.autoConfirm')}><Input type="number" min={0} value={s.priorityAutoConfirmHours} disabled={!canSla} onChange={e => setS({ ...s, priorityAutoConfirmHours: Number(e.target.value) })} /></Field>
            </div>
          </Card>
          <Card title={t('settings.workingHours')}>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label={t('settings.workStart')}><Input type="time" value={s.workingHours.start} disabled={!canSla} onChange={e => setS({ ...s, workingHours: { ...s.workingHours, start: e.target.value } })} /></Field>
                <Field label={t('settings.workEnd')}><Input type="time" value={s.workingHours.end} disabled={!canSla} onChange={e => setS({ ...s, workingHours: { ...s.workingHours, end: e.target.value } })} /></Field>
              </div>
              <Field label={t('settings.workDays')}>
                <div className="flex flex-wrap gap-3">
                  {[0, 1, 2, 3, 4, 5, 6].map(d => <Checkbox key={d} label={t(`settings.days.${d}`)} checked={s.workingHours.workDays.includes(d)} disabled={!canSla} onChange={e => setS({ ...s, workingHours: { ...s.workingHours, workDays: e.target.checked ? [...s.workingHours.workDays, d].sort() : s.workingHours.workDays.filter(x => x !== d) } })} />)}
                </div>
              </Field>
              <Field label={t('settings.holidays')} hint="YYYY-MM-DD"><Textarea value={s.holidays.join('\n')} disabled={!canSla} dir="ltr" onChange={e => setS({ ...s, holidays: e.target.value.split('\n').map(x => x.trim()).filter(Boolean) })} /></Field>
            </div>
          </Card>
        </>}
        {tab === 'theme' && <>
          <Card title={t('settings.themes')} actions={canTheme && <button className="btn-primary btn-sm" onClick={newTheme}><Plus size={14} />{t('settings.createTheme')}</button>}>
            <div className="grid sm:grid-cols-2 gap-2">
              {themes.map(th => (
                <div key={th.id} className="flex items-center gap-3 p-2 rounded border border-border">
                  <div className="flex gap-1">{[th.colors.primary, th.colors.secondary, th.colors.accent].map((c, i) => <span key={i} className="h-6 w-6 rounded" style={{ background: c }} />)}</div>
                  <div className="flex-1 text-sm">{lang === 'ar' ? th.nameAr : th.nameEn}{th.isSystem && <span className="text-[10px] text-muted ms-1">({t('role.system')})</span>}</div>
                  {!th.isSystem && canTheme && <><button className="btn-ghost btn-sm" onClick={() => setTheme({ ...th, colors: { ...th.colors }, dark: { ...th.dark } })}>{t('common.edit')}</button><button className="btn-ghost btn-sm text-danger" onClick={() => setDelTheme(th)}><Trash2 size={13} /></button></>}
                  {th.isSystem && canTheme && <button className="btn-ghost btn-sm" onClick={() => setTheme({ ...th, id: `custom_${Date.now().toString(36)}`, nameAr: th.nameAr + ' (نسخة)', nameEn: th.nameEn + ' (copy)', isSystem: false, colors: { ...th.colors }, dark: { ...th.dark } })}>{t('common.add')}</button>}
                </div>
              ))}
            </div>
          </Card>
          {theme && (
            <Card title={theme.nameEn} actions={<><button className="btn-secondary btn-sm" onClick={() => setTheme(null)}>{t('common.cancel')}</button><button className="btn-primary btn-sm" onClick={doSaveTheme} disabled={busy}>{t('common.save')}</button></>}>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <Field label={t('common.nameAr')}><Input value={theme.nameAr} onChange={e => setTheme({ ...theme, nameAr: e.target.value })} dir="rtl" /></Field>
                <Field label={t('common.nameEn')}><Input value={theme.nameEn} onChange={e => setTheme({ ...theme, nameEn: e.target.value })} dir="ltr" /></Field>
              </div>
              <div className="label">{t('settings.colors')}</div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
                {colorKeys.map(k => <label key={k} className="flex items-center gap-2 text-xs"><input type="color" value={theme.colors[k]} onChange={e => setTheme({ ...theme, colors: { ...theme.colors, [k]: e.target.value } })} className="h-7 w-9 rounded border border-border" />{k}</label>)}
              </div>
              <div className="label">{t('settings.darkColors')}</div>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {darkKeys.map(k => <label key={k} className="flex items-center gap-2 text-xs"><input type="color" value={theme.dark[k]} onChange={e => setTheme({ ...theme, dark: { ...theme.dark, [k]: e.target.value } })} className="h-7 w-9 rounded border border-border" />{k}</label>)}
              </div>
            </Card>
          )}
        </>}
      </div>
      <Confirm open={confirmClean} onClose={() => setConfirmClean(false)} danger busy={busy} text={t('settings.cleanupConfirm')} onConfirm={doCleanup} />
      <Confirm open={!!delTheme} onClose={() => setDelTheme(null)} danger onConfirm={async () => { if (delTheme) { await deleteTheme(delTheme); setDelTheme(null); toast(t('common.deleted')); } }} />
    </div>
  );
}
