import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, MinusCircle, Circle } from 'lucide-react';
import clsx from 'clsx';
import { useI18n } from '@/i18n/I18nProvider';
import { useToast } from '@/contexts/ToastContext';
import { useLookups } from '@/hooks/useLookups';
import { useDoc } from '@/hooks/useCollection';
import type { AppUser } from '@/types';
import { PERMISSIONS, PERMISSION_MODULES, computeEffective } from '@/constants/permissions';
import { updateUser } from '@/services/users';
import { PageHeader, Card, Loading, Spinner } from '@/components/ui';

type State = 'inherit' | 'grant' | 'deny';

export default function UserPermissions() {
  const { uid } = useParams();
  const { t, lang } = useI18n();
  const { toast } = useToast();
  const nav = useNavigate();
  const { roles } = useLookups();
  const { data: user, loading } = useDoc<AppUser>('users', uid);
  const [granted, setGranted] = useState<string[]>([]);
  const [denied, setDenied] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  // seed the local override state once the doc arrives — keyed on the snapshot id,
  // because the stored user document may not carry a `uid` field of its own
  useEffect(() => { if (user) { setGranted(user.permissionOverrides?.granted || []); setDenied(user.permissionOverrides?.denied || []); } }, [(user as any)?.id ?? user?.uid]);
  if (loading || !user) return <Loading />;
  const role = roles.find(r => r.id === user.roleId);
  const rolePerms = role?.permissions || [];
  const effective = new Set(computeEffective(rolePerms, { granted, denied }));

  const stateOf = (p: string): State => denied.includes(p) ? 'deny' : granted.includes(p) ? 'grant' : 'inherit';
  const cycle = (p: string) => {
    const s = stateOf(p);
    if (s === 'inherit') { setGranted([...granted, p]); }
    else if (s === 'grant') { setGranted(granted.filter(x => x !== p)); setDenied([...denied, p]); }
    else { setDenied(denied.filter(x => x !== p)); }
  };
  const save = async () => {
    setBusy(true);
    try { await updateUser({ ...user, uid: user.uid || (uid as string) }, { permissionOverrides: { granted, denied } }, roles); toast(t('role.saved')); }
    catch (e: any) { toast(e?.message || t('common.error'), 'error'); } finally { setBusy(false); }
  };

  return (
    <div>
      <PageHeader title={`${t('user.permissions')} — ${lang === 'ar' ? user.nameAr : user.nameEn}`} subtitle={<span>{t('user.role')}: <b>{role ? (lang === 'ar' ? role.nameAr : role.nameEn) : user.roleId}</b> — {t('user.effective')}: <b>{effective.size}</b></span>}
        actions={<><button className="btn-secondary" onClick={() => nav('/admin/users')}>{t('common.cancel')}</button><button className="btn-primary" onClick={save} disabled={busy || !!user.isSuperAdmin}>{busy ? <Spinner className="text-white" /> : t('common.save')}</button></>} />
      <div className="text-xs text-muted mb-3 flex flex-wrap gap-4">
        <span className="flex items-center gap-1"><Circle size={13} className="text-info" />{t('user.inherited')}</span>
        <span className="flex items-center gap-1"><CheckCircle2 size={13} className="text-success" />{t('user.granted')}</span>
        <span className="flex items-center gap-1"><MinusCircle size={13} className="text-danger" />{t('user.denied')}</span>
        <span>— {t('user.overrideHint')}</span>
      </div>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        {PERMISSION_MODULES.map(m => (
          <Card key={m} title={t(`perm.modules.${m}`)} bodyClass="p-2">
            {PERMISSIONS.filter(p => p.module === m).map(p => {
              const s = stateOf(p.key); const inRole = rolePerms.includes(p.key); const eff = effective.has(p.key);
              const action = p.key.slice(m.length + 1);
              return (
                <button key={p.key} onClick={() => cycle(p.key)} disabled={!!user.isSuperAdmin}
                  className={clsx('w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-start hover:bg-bg', eff ? 'text-txt' : 'text-muted line-through')}>
                  {s === 'grant' ? <CheckCircle2 size={15} className="text-success" /> : s === 'deny' ? <MinusCircle size={15} className="text-danger" /> : <Circle size={15} className={inRole ? 'text-info' : 'text-border'} />}
                  <span className="flex-1">{t(`perm.actions.${action.replace(/\./g, '_')}`)}</span>
                  <span className="text-[10px] font-mono text-muted">{p.key}</span>
                </button>
              );
            })}
          </Card>
        ))}
      </div>
    </div>
  );
}
