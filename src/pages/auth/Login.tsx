import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { Languages } from 'lucide-react';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/i18n/I18nProvider';
import { Field, Input, Spinner } from '@/components/ui';

export default function Login() {
  const { login, resetPassword, fbUser, user, loading } = useAuth();
  const { t, lang, setLang } = useI18n();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [forgot, setForgot] = useState(false);
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [dbError, setDbError] = useState(false);

  const probe = () => {
    getDoc(doc(db, 'system', 'bootstrap'))
      .then(s => { setNeedsSetup(!s.exists() || !s.data()?.done); setDbError(false); })
      .catch(() => { setNeedsSetup(false); setDbError(true); });
  };
  useEffect(probe, []);

  if (!loading && fbUser && user?.status === 'active') return <Navigate to={(loc.state as any)?.from?.pathname || '/'} replace />;
  if (needsSetup) return <Navigate to="/setup" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(''); setInfo(''); setBusy(true);
    try {
      if (forgot) { await resetPassword(email); setInfo(t('auth.resetSent')); setForgot(false); }
      else { await login(email, password); nav('/'); }
    } catch (ex: any) {
      const code = ex?.code || ex?.message || '';
      setErr(code.includes('inactive') ? t('auth.inactive') : code.includes('too-many') ? t('auth.tooMany') : t('auth.invalid'));
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-full flex items-center justify-center bg-bg p-4">
      <div className="card w-full max-w-sm">
        <div className="bg-primary text-white rounded-t-lg px-6 py-6 text-center">
          <div className="text-3xl font-bold">PIQCS</div>
          <div className="text-xs text-white/80 mt-1">{t('app.fullName')}</div>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="font-semibold">{forgot ? t('auth.forgot') : t('auth.login')}</div>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}><Languages size={14} />{lang === 'ar' ? 'English' : 'عربي'}</button>
          </div>
          <Field label={t('common.email')} required><Input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus dir="ltr" /></Field>
          {!forgot && <Field label={t('auth.password')} required><Input type="password" value={password} onChange={e => setPassword(e.target.value)} required dir="ltr" /></Field>}
          {dbError && (
            <div className="text-xs text-warning border border-warning/40 bg-warning/10 rounded p-2">
              {t('auth.dbUnreachable')}
              <button type="button" className="underline ms-1" onClick={probe}>{t('auth.retry')}</button>
            </div>
          )}
          {err && <div className="text-sm text-danger">{err}</div>}
          {info && <div className="text-sm text-success">{info}</div>}
          <button className="btn-primary w-full" disabled={busy}>{busy ? <Spinner className="text-white" /> : forgot ? t('auth.sendReset') : t('auth.signIn')}</button>
          <button type="button" className="text-xs text-primary w-full text-center" onClick={() => { setForgot(f => !f); setErr(''); }}>{forgot ? t('auth.login') : t('auth.forgot')}</button>
        </form>
        <div className="px-6 pb-4 text-center text-[11px] text-muted">{t('app.copyright')}</div>
      </div>
    </div>
  );
}
