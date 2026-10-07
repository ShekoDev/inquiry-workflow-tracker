import { collection, doc, getDocs, query, serverTimestamp, setDoc, updateDoc, where, orderBy, writeBatch } from 'firebase/firestore';
import { createUserWithEmailAndPassword, sendPasswordResetEmail, signOut } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions, secondaryAuth } from '@/config/firebase';
import type { AppUser, Role, UserStatus } from '@/types';
import { logActivity } from './activityLog';
import { computeEffective } from '@/constants/permissions';

export interface CreateUserInput {
  email: string; password: string; nameAr: string; nameEn: string; phone?: string;
  roleId: string; department?: string; branch?: string; language: 'ar' | 'en';
}

const FINALS = ['WON', 'LOST', 'NO_BID', 'CANCELLED'];
/** Cloud Functions are optional (Blaze plan). These error codes mean "function not deployed / unreachable". */
const fnUnavailable = (e: any) => ['functions/not-found', 'functions/unavailable', 'functions/internal', 'functions/deadline-exceeded'].includes(e?.code) || /not found|failed to fetch|CORS|network/i.test(e?.message || '');

/**
 * Creates a user. Preferred path: Cloud Function (server-side, audited). Fallback (free plan):
 * a secondary Auth instance creates the account so the admin's own session is untouched.
 */
export async function createUser(input: CreateUserInput, roles: Role[], me: AppUser) {
  let uid: string;
  try {
    const fn = httpsCallable<CreateUserInput, { uid: string }>(functions, 'createUser');
    uid = (await fn(input)).data.uid;
  } catch (e: any) {
    if (!fnUnavailable(e)) throw e;
    const auth2 = secondaryAuth();
    const cred = await createUserWithEmailAndPassword(auth2, input.email, input.password);
    uid = cred.user.uid;
    await signOut(auth2);
    const role = roles.find(r => r.id === input.roleId);
    await setDoc(doc(db, 'users', uid), {
      email: input.email, nameAr: input.nameAr, nameEn: input.nameEn || input.nameAr, phone: input.phone || '', roleId: input.roleId,
      department: input.department || '', branch: input.branch || '', language: input.language || 'ar', themeId: '', darkMode: 'light',
      status: 'active', isSuperAdmin: false, mustChangePassword: true, permissionOverrides: { granted: [], denied: [] },
      effectivePermissions: computeEffective(role?.permissions || []), createdAt: serverTimestamp(), createdBy: me.uid
    });
  }
  await logActivity({
    action: 'CREATE', module: 'users', recordId: uid, recordLabel: input.email,
    descriptionAr: `إنشاء مستخدم ${input.nameAr} (${input.email})`, descriptionEn: `Created user ${input.nameEn} (${input.email})`
  });
  return uid;
}

export async function updateUser(u: AppUser, patch: Partial<AppUser>, roles: Role[]) {
  const ref = doc(db, 'users', u.uid);
  const clean: Record<string, unknown> = { ...patch, updatedAt: serverTimestamp() };
  const roleId = (patch.roleId as string) || u.roleId;
  const role = roles.find(r => r.id === roleId);
  if (patch.roleId || patch.permissionOverrides) {
    clean.effectivePermissions = computeEffective(role?.permissions || [], patch.permissionOverrides || u.permissionOverrides);
  }
  await updateDoc(ref, clean);
  const changed = Object.keys(patch).filter(k => JSON.stringify((u as any)[k]) !== JSON.stringify((patch as any)[k]));
  for (const k of changed) {
    await logActivity({
      action: k === 'roleId' || k === 'permissionOverrides' ? 'PERMISSION_CHANGE' : 'UPDATE', module: 'users',
      recordId: u.uid, recordLabel: u.email, field: k, oldValue: (u as any)[k], newValue: (patch as any)[k],
      descriptionAr: `تعديل ${k} للمستخدم ${u.nameAr}`, descriptionEn: `Updated ${k} for user ${u.nameEn}`
    });
  }
}

export async function setUserStatus(u: AppUser, status: UserStatus) {
  if (u.isSuperAdmin) throw new Error('super_admin');
  await updateDoc(doc(db, 'users', u.uid), { status, updatedAt: serverTimestamp() });
  await logActivity({
    action: status === 'deleted' ? 'DELETE' : 'UPDATE', module: 'users', recordId: u.uid, recordLabel: u.email,
    field: 'status', oldValue: u.status, newValue: status,
    descriptionAr: `تغيير حالة المستخدم ${u.nameAr} إلى ${status}`, descriptionEn: `User ${u.nameEn} status changed to ${status}`
  });
}

async function reassignOpenInquiries(fromUid: string, toUid: string, toName: string) {
  let n = 0;
  for (const field of ['assignedEngineerId', 'salespersonId'] as const) {
    const snap = await getDocs(query(collection(db, 'inquiries'), where(field, '==', fromUid)));
    const batch = writeBatch(db);
    snap.docs.forEach(d => { if (!FINALS.includes(d.data().status)) { batch.update(d.ref, { [field]: toUid, [field === 'assignedEngineerId' ? 'assignedEngineerName' : 'salespersonName']: toName, updatedAt: serverTimestamp() }); n++; } });
    await batch.commit();
  }
  return n;
}

/**
 * Hard delete. Preferred: Cloud Function (removes the Auth account too). Fallback (free plan):
 * reassign open inquiries client-side and mark the user `deleted` (the Auth account is then removed from the Firebase console).
 */
export async function hardDeleteUser(u: AppUser, reassignToUid: string, users: AppUser[]) {
  if (u.isSuperAdmin) throw new Error('super_admin');
  let reassigned = 0; let mode = 'server';
  try {
    const fn = httpsCallable<{ uid: string; reassignTo: string }, { reassigned: number }>(functions, 'deleteUser');
    reassigned = (await fn({ uid: u.uid, reassignTo: reassignToUid })).data.reassigned;
  } catch (e: any) {
    if (!fnUnavailable(e)) throw e;
    mode = 'client';
    const to = users.find(x => x.uid === reassignToUid);
    if (to) reassigned = await reassignOpenInquiries(u.uid, to.uid, to.nameAr || to.nameEn);
    await updateDoc(doc(db, 'users', u.uid), { status: 'deleted', updatedAt: serverTimestamp() });
  }
  await logActivity({
    action: 'DELETE', module: 'users', recordId: u.uid, recordLabel: u.email,
    descriptionAr: `حذف نهائي للمستخدم ${u.nameAr} (${mode}) — أُعيد إسناد ${reassigned} استفسار`,
    descriptionEn: `Hard-deleted user ${u.nameEn} (${mode}) — ${reassigned} inquiries reassigned`
  });
  return { reassigned, mode };
}

export async function countOpenInquiriesFor(uid: string) {
  const q1 = await getDocs(query(collection(db, 'inquiries'), where('assignedEngineerId', '==', uid)));
  const q2 = await getDocs(query(collection(db, 'inquiries'), where('salespersonId', '==', uid)));
  const ids = new Set<string>();
  [...q1.docs, ...q2.docs].forEach(d => { if (!FINALS.includes(d.data().status)) ids.add(d.id); });
  return ids.size;
}

export async function listUsers(includeDeleted = false) {
  const snap = await getDocs(query(collection(db, 'users'), orderBy('nameAr')));
  return snap.docs.map(d => ({ uid: d.id, ...(d.data() as Omit<AppUser, 'uid'>) })).filter(u => includeDeleted || u.status !== 'deleted');
}

/** Sends Firebase's standard password-reset email to the user's address. Works on every plan. */
export async function adminResetPassword(u: AppUser) {
  await sendPasswordResetEmail(auth, u.email);
  await logActivity({ action: 'UPDATE', module: 'users', recordId: u.uid, recordLabel: u.email, descriptionAr: `إرسال إعادة تعيين كلمة المرور لـ ${u.nameAr}`, descriptionEn: `Password reset sent to ${u.nameEn}` });
}
