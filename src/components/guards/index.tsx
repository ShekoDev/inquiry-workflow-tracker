import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/i18n/I18nProvider';
import { Loading } from '@/components/ui';
import { ShieldOff } from 'lucide-react';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { fbUser, user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="h-full flex items-center justify-center"><Loading /></div>;
  if (!fbUser) return <Navigate to="/login" state={{ from: loc }} replace />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.status !== 'active') return <Navigate to="/login" replace />;
  if (user.mustChangePassword && loc.pathname !== '/change-password') return <Navigate to="/change-password" replace />;
  return <>{children}</>;
}

export function Denied() {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center justify-center py-20 text-muted gap-3">
      <ShieldOff size={40} /><div>{t('common.permissionDenied')}</div>
    </div>
  );
}

/** Renders children only if the user holds ANY of the given permissions. */
export function Gate({ perms, children, fallback = null }: { perms: string[]; children: React.ReactNode; fallback?: React.ReactNode }) {
  const { canAny } = useAuth();
  return canAny(...perms) ? <>{children}</> : <>{fallback}</>;
}

/** Route-level guard: shows the Denied screen if no permission. */
export function RequirePerm({ perms, children }: { perms: string[]; children: React.ReactNode }) {
  const { canAny } = useAuth();
  return canAny(...perms) ? <>{children}</> : <Denied />;
}
