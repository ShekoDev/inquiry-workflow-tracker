import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, updatePassword, type User
} from 'firebase/auth';
import { doc, onSnapshot, serverTimestamp, updateDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import type { AppUser, Role } from '@/types';
import { computeEffective } from '@/constants/permissions';
import { logActivity, setLogContext } from '@/services/activityLog';

interface AuthCtx {
  fbUser: User | null;
  user: AppUser | null;
  role: Role | null;
  loading: boolean;
  can: (perm: string) => boolean;
  canAny: (...perms: string[]) => boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [fbUser, setFbUser] = useState<User | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const unsubUser = useRef<() => void>();
  const unsubRole = useRef<() => void>();

  useEffect(() => {
    const off = onAuthStateChanged(auth, async (u) => {
      unsubUser.current?.(); unsubRole.current?.();
      setFbUser(u);
      if (!u) { setUser(null); setRole(null); setLogContext(null); setLoading(false); return; }
      unsubUser.current = onSnapshot(doc(db, 'users', u.uid), (snap) => {
        if (!snap.exists()) { setUser(null); setLoading(false); return; }
        const data = { uid: snap.id, ...(snap.data() as Omit<AppUser, 'uid'>) };
        setUser(data);
        setLogContext(data);
        unsubRole.current?.();
        unsubRole.current = onSnapshot(doc(db, 'roles', data.roleId), (rs) => {
          setRole(rs.exists() ? ({ id: rs.id, ...(rs.data() as Omit<Role, 'id'>) }) : null);
          setLoading(false);
        }, () => setLoading(false));
      }, () => setLoading(false));
    });
    return () => { off(); unsubUser.current?.(); unsubRole.current?.(); };
  }, []);

  // Effective permissions: prefer the server-maintained list; fall back to a client computation from role + overrides.
  const effective = useMemo(() => {
    if (!user) return new Set<string>();
    if (user.effectivePermissions?.length) return new Set(user.effectivePermissions);
    return new Set(computeEffective(role?.permissions || [], user.permissionOverrides));
  }, [user, role]);

  const can = useCallback((perm: string) => {
    if (!user || user.status !== 'active') return false;
    if (user.isSuperAdmin) return true;
    return effective.has(perm);
  }, [user, effective]);
  const canAny = useCallback((...perms: string[]) => perms.some(can), [can]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const snap = await getDoc(doc(db, 'users', cred.user.uid));
      if (snap.exists()) {
        const d = snap.data() as AppUser;
        if (d.status !== 'active') { await signOut(auth); throw new Error('auth/inactive'); }
        await updateDoc(doc(db, 'users', cred.user.uid), { lastLoginAt: serverTimestamp() });
        await logActivity({ action: 'LOGIN', module: 'auth', descriptionAr: 'تسجيل دخول', descriptionEn: 'Signed in' },
          { uid: cred.user.uid, email, nameAr: d.nameAr, nameEn: d.nameEn, roleId: d.roleId });
      }
    } catch (e: any) {
      throw e;
    }
  }, []);

  const logout = useCallback(async () => {
    await logActivity({ action: 'LOGOUT', module: 'auth', descriptionAr: 'تسجيل خروج', descriptionEn: 'Signed out' });
    await signOut(auth);
  }, []);

  const resetPassword = useCallback(async (email: string) => { await sendPasswordResetEmail(auth, email); }, []);

  const changePassword = useCallback(async (newPassword: string) => {
    if (!auth.currentUser) throw new Error('no user');
    await updatePassword(auth.currentUser, newPassword);
    await updateDoc(doc(db, 'users', auth.currentUser.uid), { mustChangePassword: false, updatedAt: serverTimestamp() });
    await logActivity({ action: 'UPDATE', module: 'auth', descriptionAr: 'تغيير كلمة المرور', descriptionEn: 'Password changed' });
  }, []);

  const value = useMemo(() => ({ fbUser, user, role, loading, can, canAny, login, logout, resetPassword, changePassword }),
    [fbUser, user, role, loading, can, canAny, login, logout, resetPassword, changePassword]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth outside provider');
  return c;
}
