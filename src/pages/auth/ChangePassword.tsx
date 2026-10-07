import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/i18n/I18nProvider';
import { useToast } from '@/contexts/ToastContext';
import { Field, Input, Spinner } from '@/components/ui';

export const strongPassword = (p: string) => p.length >= 8 && /[A-Z]/.test(p) && /\d/.test(p);

export default function ChangePassword() {
  const { changePassword, user, logout } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
  const nav = useNavigate();
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr('');
    if (p1 !== p2) return setErr(t('auth.mismatch'));
    if (!strongPassword(p1)) return setErr(t('auth.weak'));
    setBusy(true);
    try { await changePassword(p1); toast(t('common.saved')); nav('/'); }
    catch (ex: any) { setErr(ex?.code === 'auth/requires-recent-login' ? t('auth.invalid') : (ex?.message || t('common.error'))); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-full flex items-center justify-center bg-bg p-4">
      <form onSubmit={submit} className="card w-full max-w-sm p-6 space-y-4">
        <div className="font-semibold text-lg">{t('auth.changePassword')}</div>
        {user?.mustChangePassword && <div className="text-sm text-warning">{t('auth.mustChange')}</div>}
        <Field label={t('auth.newPassword')} required><Input type="password" value={p1} onChange={e => setP1(e.target.value)} dir="ltr" /></Field>
        <Field label={t('auth.confirmPassword')} required><Input type="password" value={p2} onChange={e => setP2(e.target.value)} dir="ltr" /></Field>
        {err && <div className="text-sm text-danger">{err}</div>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? <Spinner className="text-white" /> : t('common.save')}</button>
        <button type="button" className="text-xs text-muted w-full" onClick={logout}>{t('common.logout')}</button>
      </form>
    </div>
  );
}
