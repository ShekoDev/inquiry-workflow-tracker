import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from '@/config/firebase';
import { useI18n } from '@/i18n/I18nProvider';
import { Field, Input, Spinner } from '@/components/ui';
import { strongPassword } from './ChangePassword';
import { DEFAULT_ROLES } from '@/constants/roles';
import { ALL_PERMISSION_KEYS } from '@/constants/permissions';

/**
 * First-run screen. Preferred path: `bootstrapSuperAdmin` Cloud Function.
 * Fallback (free plan, no functions): create the Auth user client-side, then — as that user — seed roles,
 * write the Super Admin doc and the bootstrap flag. Firestore rules allow this only while system/bootstrap is absent.
 */
export default function Setup() {
  const { t } = useI18n();
  const nav = useNavigate();
  const [ready, setReady] = useState<boolean | null>(null);
  const [f, setF] = useState({ email: '', password: '', nameAr: '', nameEn: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getDoc(doc(db, 'system', 'bootstrap')).then(s => { if (s.exists() && s.data()?.done) nav('/login', { replace: true }); else setReady(true); }).catch(() => setReady(true));
  }, [nav]);

  const clientBootstrap = async () => {
    const cred = await createUserWithEmailAndPassword(auth, f.email, f.password);
    const uid = cred.user.uid;
    await setDoc(doc(db, 'users', uid), {
      email: f.email, nameAr: f.nameAr, nameEn: f.nameEn || f.nameAr, roleId: 'super_admin', language: 'ar', themeId: 'corporate_navy', darkMode: 'light',
      status: 'active', isSuperAdmin: true, mustChangePassword: false, permissionOverrides: { granted: [], denied: [] },
      effectivePermissions: ALL_PERMISSION_KEYS, createdAt: serverTimestamp(), createdBy: 'bootstrap'
    });
    const batch = writeBatch(db);
    DEFAULT_ROLES.forEach(r => batch.set(doc(db, 'roles', r.id), { ...r, createdAt: serverTimestamp() }, { merge: true }));
    batch.set(doc(db, 'system', 'bootstrap'), { done: true, at: serverTimestamp(), superAdmin: uid, mode: 'client' });
    await batch.commit();
    await signOut(auth);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr('');
    if (!strongPassword(f.password)) return setErr(t('auth.weak'));
    setBusy(true);
    try {
      try { await httpsCallable(functions, 'bootstrapSuperAdmin')(f); }
      catch (ex: any) {
        const code = ex?.code || '';
        if (['functions/not-found', 'functions/unavailable', 'functions/internal', 'functions/deadline-exceeded'].includes(code) || /not found|failed to fetch|CORS|network/i.test(ex?.message || '')) await clientBootstrap();
        else throw ex;
      }
      alert(t('auth.setupDone'));
      nav('/login', { replace: true });
    } catch (ex: any) { setErr(ex?.message || t('common.error')); }
    finally { setBusy(false); }
  };

  if (ready === null) return <div className="h-full flex items-center justify-center"><Spinner /></div>;
  return (
    <div className="min-h-full flex items-center justify-center bg-bg p-4">
      <form onSubmit={submit} className="card w-full max-w-md p-6 space-y-4">
        <div className="text-lg font-bold">{t('auth.setupTitle')}</div>
        <p className="text-sm text-muted">{t('auth.setupDesc')}</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('common.nameAr')} required><Input value={f.nameAr} onChange={e => setF({ ...f, nameAr: e.target.value })} required /></Field>
          <Field label={t('common.nameEn')} required><Input value={f.nameEn} onChange={e => setF({ ...f, nameEn: e.target.value })} required dir="ltr" /></Field>
        </div>
        <Field label={t('common.email')} required><Input type="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} required dir="ltr" /></Field>
        <Field label={t('auth.password')} required hint={t('auth.weak')}><Input type="password" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} required dir="ltr" /></Field>
        {err && <div className="text-sm text-danger">{err}</div>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? <Spinner className="text-white" /> : t('common.create')}</button>
        <div className="text-center text-[11px] text-muted">{t('app.copyright')}</div>
      </form>
    </div>
  );
}
