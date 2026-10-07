/**
 * PIQCS — Cloud Functions
 * - bootstrapSuperAdmin : first-run creation of the single Super Admin + default roles
 * - createUser          : admin creates a user (Auth + Firestore) without replacing his own session
 * - deleteUser          : hard delete with reassignment of open inquiries
 * - sendPasswordReset   : admin-triggered reset link
 * - syncUserPermissions : keeps users.effectivePermissions in sync with role + overrides (authoritative)
 * - syncRolePermissions : when a role changes, recompute every user holding it
 * - auditInquiries / auditQuotations / auditUsers : server-side audit entries (cannot be bypassed by the client)
 * - eodReport           : daily 16:30 Asia/Riyadh — pending inquiries per salesperson → notifications
 * - overdueSweep        : hourly — flags overdue inquiries and notifies engineer + managers
 * - retentionSweep      : daily — archives activity_log older than settings.logRetentionMonths
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { setGlobalOptions } from 'firebase-functions/v2';
import * as admin from 'firebase-admin';

admin.initializeApp();
setGlobalOptions({ region: 'us-central1', maxInstances: 10 });
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

// ---------------- permission catalogue (mirror of src/constants) ----------------
const M = (m: string, a: string[]) => a.map(x => `${m}.${x}`);
const ALL_PERMS = [
  ...M('inquiries', ['view.own', 'view.all', 'create', 'edit', 'delete', 'assign', 'set_priority', 'change_status']),
  ...M('costing', ['view', 'create', 'edit', 'delete']),
  ...M('quotations', ['view', 'create', 'edit', 'delete', 'submit_for_approval', 'approve', 'reject', 'send_to_sales', 'send_to_client', 'create_revision']),
  ...M('extensions', ['request', 'approve', 'reject']),
  ...M('follow_ups', ['view', 'create', 'edit', 'close_won', 'close_lost']),
  ...M('clients', ['view', 'create', 'edit', 'delete']),
  ...M('projects', ['view', 'create', 'edit', 'delete']),
  ...M('users', ['view', 'create', 'edit', 'deactivate', 'delete', 'reset_password', 'assign_role']),
  ...M('roles', ['view', 'create', 'edit', 'delete', 'manage_permissions']),
  ...M('activity_log', ['view', 'export', 'delete', 'purge']),
  ...M('reports', ['view', 'export_pdf', 'export_excel', 'view_financials']),
  ...M('dashboards', ['view.personal', 'view.team', 'view.company', 'view.performance']),
  ...M('settings', ['view', 'edit_general', 'edit_theme', 'edit_workflow', 'edit_sla'])
];
const pick = (...k: string[]) => k;
const DEFAULT_ROLES = [
  { id: 'super_admin', nameAr: 'المدير الأعلى', nameEn: 'Super Admin', isSystem: true, permissions: ALL_PERMS },
  { id: 'admin', nameAr: 'مدير النظام', nameEn: 'Admin', isSystem: true, permissions: ALL_PERMS.filter(k => k !== 'activity_log.purge') },
  { id: 'branch_manager', nameAr: 'مدير الفرع', nameEn: 'Branch Manager', isSystem: true, permissions: pick('inquiries.view.all', 'inquiries.create', 'inquiries.edit', 'inquiries.assign', 'inquiries.set_priority', 'inquiries.change_status', 'costing.view', 'quotations.view', 'quotations.approve', 'quotations.reject', 'extensions.approve', 'extensions.reject', 'follow_ups.view', 'follow_ups.create', 'follow_ups.edit', 'follow_ups.close_won', 'follow_ups.close_lost', 'clients.view', 'clients.create', 'clients.edit', 'projects.view', 'projects.create', 'projects.edit', 'users.view', 'reports.view', 'reports.export_pdf', 'reports.export_excel', 'reports.view_financials', 'dashboards.view.personal', 'dashboards.view.team', 'dashboards.view.company', 'dashboards.view.performance', 'settings.view') },
  { id: 'priority_engineer', nameAr: 'مهندس الأولويات', nameEn: 'Priority Engineer', isSystem: true, permissions: pick('inquiries.view.all', 'inquiries.set_priority', 'inquiries.assign', 'inquiries.change_status', 'clients.view', 'projects.view', 'reports.view', 'dashboards.view.personal', 'dashboards.view.team') },
  { id: 'estimation_engineer', nameAr: 'مهندس التسعير', nameEn: 'Estimation Engineer', isSystem: true, permissions: pick('inquiries.view.own', 'inquiries.edit', 'inquiries.change_status', 'costing.view', 'costing.create', 'costing.edit', 'quotations.view', 'quotations.create', 'quotations.edit', 'quotations.submit_for_approval', 'quotations.create_revision', 'extensions.request', 'clients.view', 'projects.view', 'dashboards.view.personal') },
  { id: 'salesperson', nameAr: 'مسوق', nameEn: 'Salesperson', isSystem: true, permissions: pick('inquiries.view.own', 'inquiries.create', 'inquiries.edit', 'quotations.view', 'quotations.send_to_client', 'follow_ups.view', 'follow_ups.create', 'follow_ups.edit', 'follow_ups.close_won', 'follow_ups.close_lost', 'clients.view', 'clients.create', 'projects.view', 'projects.create', 'dashboards.view.personal') },
  { id: 'management', nameAr: 'الإدارة العليا', nameEn: 'Management', isSystem: true, permissions: pick('inquiries.view.all', 'costing.view', 'quotations.view', 'quotations.approve', 'quotations.reject', 'extensions.approve', 'extensions.reject', 'follow_ups.view', 'clients.view', 'projects.view', 'users.view', 'reports.view', 'reports.export_pdf', 'reports.export_excel', 'reports.view_financials', 'dashboards.view.personal', 'dashboards.view.team', 'dashboards.view.company', 'dashboards.view.performance', 'settings.view') },
  { id: 'viewer', nameAr: 'مشاهد', nameEn: 'Viewer', isSystem: true, permissions: pick('inquiries.view.all', 'quotations.view', 'follow_ups.view', 'clients.view', 'projects.view', 'dashboards.view.company') }
];

function effective(rolePerms: string[], ov?: { granted?: string[]; denied?: string[] }) {
  const s = new Set(rolePerms || []);
  (ov?.granted || []).forEach(p => s.add(p));
  (ov?.denied || []).forEach(p => s.delete(p));
  return Array.from(s);
}

async function callerCan(uid: string | undefined, perm: string) {
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in required');
  const u = await db.doc(`users/${uid}`).get();
  const d = u.data();
  if (!d || d.status !== 'active') throw new HttpsError('permission-denied', 'Inactive user');
  if (d.isSuperAdmin) return d;
  if (!(d.effectivePermissions || []).includes(perm)) throw new HttpsError('permission-denied', `Missing ${perm}`);
  return d;
}

async function audit(entry: Record<string, unknown>) {
  await db.collection('activity_log').add({ timestamp: FieldValue.serverTimestamp(), sessionId: 'server', userAgent: 'cloud-function', ...entry });
}

// ---------------- bootstrap ----------------
export const bootstrapSuperAdmin = onCall(async (req) => {
  const flag = await db.doc('system/bootstrap').get();
  if (flag.exists && flag.data()?.done) throw new HttpsError('already-exists', 'System already initialised');
  const { email, password, nameAr, nameEn } = req.data as Record<string, string>;
  if (!email || !password || !nameAr) throw new HttpsError('invalid-argument', 'Missing fields');
  const batch = db.batch();
  DEFAULT_ROLES.forEach(r => batch.set(db.doc(`roles/${r.id}`), { ...r, createdAt: FieldValue.serverTimestamp() }, { merge: true }));
  await batch.commit();
  const user = await admin.auth().createUser({ email, password, displayName: nameEn || nameAr });
  await db.doc(`users/${user.uid}`).set({
    email, nameAr, nameEn: nameEn || nameAr, roleId: 'super_admin', language: 'ar', themeId: 'corporate_navy', darkMode: 'light', status: 'active',
    isSuperAdmin: true, mustChangePassword: false, permissionOverrides: { granted: [], denied: [] }, effectivePermissions: ALL_PERMS,
    createdAt: FieldValue.serverTimestamp(), createdBy: 'bootstrap'
  });
  await db.doc('system/bootstrap').set({ done: true, at: FieldValue.serverTimestamp(), superAdmin: user.uid });
  await audit({ userId: user.uid, userName: nameAr, userEmail: email, roleId: 'super_admin', action: 'CREATE', module: 'users', recordId: user.uid, recordLabel: email, descriptionAr: 'إنشاء المدير الأعلى (الإعداد الأولي)', descriptionEn: 'Super Admin created (bootstrap)' });
  return { uid: user.uid };
});

// ---------------- users ----------------
export const createUser = onCall(async (req) => {
  const caller = await callerCan(req.auth?.uid, 'users.create');
  const d = req.data as Record<string, string>;
  if (!d.email || !d.password || !d.nameAr || !d.roleId) throw new HttpsError('invalid-argument', 'Missing fields');
  if (d.roleId === 'super_admin') throw new HttpsError('permission-denied', 'Only one Super Admin is allowed');
  const role = await db.doc(`roles/${d.roleId}`).get();
  if (!role.exists) throw new HttpsError('not-found', 'Role not found');
  const user = await admin.auth().createUser({ email: d.email, password: d.password, displayName: d.nameEn || d.nameAr });
  await db.doc(`users/${user.uid}`).set({
    email: d.email, nameAr: d.nameAr, nameEn: d.nameEn || d.nameAr, phone: d.phone || '', roleId: d.roleId, department: d.department || '', branch: d.branch || '',
    language: d.language || 'ar', themeId: '', darkMode: 'light', status: 'active', isSuperAdmin: false, mustChangePassword: true,
    permissionOverrides: { granted: [], denied: [] }, effectivePermissions: effective(role.data()!.permissions),
    createdAt: FieldValue.serverTimestamp(), createdBy: req.auth!.uid
  });
  await audit({ userId: req.auth!.uid, userName: caller.nameAr, userEmail: caller.email, roleId: caller.roleId, action: 'CREATE', module: 'users', recordId: user.uid, recordLabel: d.email, descriptionAr: `إنشاء مستخدم ${d.nameAr} (server)`, descriptionEn: `Created user ${d.nameEn || d.nameAr} (server)` });
  return { uid: user.uid };
});

export const deleteUser = onCall(async (req) => {
  const caller = await callerCan(req.auth?.uid, 'users.delete');
  const { uid, reassignTo } = req.data as { uid: string; reassignTo: string };
  if (!uid) throw new HttpsError('invalid-argument', 'uid required');
  const target = await db.doc(`users/${uid}`).get();
  if (!target.exists) throw new HttpsError('not-found', 'User not found');
  if (target.data()?.isSuperAdmin) throw new HttpsError('permission-denied', 'Super Admin cannot be deleted');
  if (uid === req.auth!.uid) throw new HttpsError('permission-denied', 'Cannot delete yourself');
  const finals = ['WON', 'LOST', 'NO_BID', 'CANCELLED'];
  let reassigned = 0;
  if (reassignTo) {
    const repl = await db.doc(`users/${reassignTo}`).get();
    const rd = repl.data();
    if (!rd) throw new HttpsError('not-found', 'Replacement user not found');
    for (const field of ['assignedEngineerId', 'salespersonId'] as const) {
      const snap = await db.collection('inquiries').where(field, '==', uid).get();
      const batch = db.batch();
      snap.docs.forEach(d => { if (!finals.includes(d.data().status)) { batch.update(d.ref, { [field]: reassignTo, [field === 'assignedEngineerId' ? 'assignedEngineerName' : 'salespersonName']: rd.nameAr || rd.nameEn, updatedAt: FieldValue.serverTimestamp() }); reassigned++; } });
      await batch.commit();
    }
  }
  try { await admin.auth().deleteUser(uid); } catch { /* auth user may already be gone */ }
  await db.doc(`users/${uid}`).delete();
  await audit({ userId: req.auth!.uid, userName: caller.nameAr, userEmail: caller.email, roleId: caller.roleId, action: 'DELETE', module: 'users', recordId: uid, recordLabel: target.data()?.email, descriptionAr: `حذف نهائي للمستخدم ${target.data()?.nameAr} (server) — أُعيد إسناد ${reassigned}`, descriptionEn: `Hard-deleted ${target.data()?.nameEn} (server) — reassigned ${reassigned}` });
  return { reassigned };
});

export const sendPasswordReset = onCall(async (req) => {
  await callerCan(req.auth?.uid, 'users.reset_password');
  const { uid } = req.data as { uid: string };
  const u = await admin.auth().getUser(uid);
  const link = await admin.auth().generatePasswordResetLink(u.email!);
  // Delivery: Firebase's built-in email template is used when the client calls sendPasswordResetEmail;
  // here we store the link as a notification for the admin to forward if email delivery is not configured.
  await db.collection('notifications').add({ userId: req.auth!.uid, titleAr: `رابط إعادة تعيين كلمة المرور — ${u.email}`, titleEn: `Password reset link — ${u.email}`, bodyAr: link, bodyEn: link, read: false, level: 'info', createdAt: FieldValue.serverTimestamp() });
  return { ok: true };
});

// ---------------- permission sync (authoritative) ----------------
export const syncUserPermissions = onDocumentWritten('users/{uid}', async (event) => {
  const after = event.data?.after.data();
  if (!after) return;
  const before = event.data?.before.data();
  if (before && before.roleId === after.roleId && JSON.stringify(before.permissionOverrides) === JSON.stringify(after.permissionOverrides) && after.effectivePermissions?.length) return;
  const role = await db.doc(`roles/${after.roleId}`).get();
  const eff = after.isSuperAdmin ? ALL_PERMS : effective(role.data()?.permissions || [], after.permissionOverrides);
  if (JSON.stringify([...eff].sort()) !== JSON.stringify([...(after.effectivePermissions || [])].sort())) {
    await event.data!.after.ref.update({ effectivePermissions: eff });
  }
});

export const syncRolePermissions = onDocumentWritten('roles/{roleId}', async (event) => {
  const after = event.data?.after.data();
  const roleId = event.params.roleId;
  const users = await db.collection('users').where('roleId', '==', roleId).get();
  const batch = db.batch();
  users.docs.forEach(u => {
    const d = u.data();
    const eff = d.isSuperAdmin ? ALL_PERMS : effective(after?.permissions || [], d.permissionOverrides);
    batch.update(u.ref, { effectivePermissions: eff });
  });
  await batch.commit();
});

// ---------------- server-side audit (cannot be bypassed) ----------------
function diff(before: any, after: any, ignore: string[] = ['updatedAt', 'updatedBy']) {
  const out: { field: string; oldValue: unknown; newValue: unknown }[] = [];
  const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
  keys.forEach(k => { if (ignore.includes(k)) return; const a = JSON.stringify(before?.[k]), b = JSON.stringify(after?.[k]); if (a !== b) out.push({ field: k, oldValue: before?.[k], newValue: after?.[k] }); });
  return out;
}
const fmt = (v: unknown) => v === undefined || v === null ? undefined : typeof v === 'object' ? ((v as any).toDate ? (v as any).toDate().toISOString() : JSON.stringify(v).slice(0, 300)) : String(v).slice(0, 300);

async function serverAudit(module: string, label: string, event: any, importantFields: string[]) {
  const before = event.data?.before.data(), after = event.data?.after.data();
  const actor = after?.updatedBy || after?.createdBy || before?.updatedBy || 'system';
  const base = { userId: actor, userName: 'server-audit', userEmail: '', roleId: '', module, recordId: event.params.id, recordLabel: label };
  if (!before && after) return; // client already logs CREATE with richer context
  if (before && !after) { await audit({ ...base, action: 'DELETE', descriptionAr: `حذف ${label} (server)`, descriptionEn: `Deleted ${label} (server)` }); return; }
  const changes = diff(before, after).filter(c => importantFields.includes(c.field));
  for (const c of changes) {
    await audit({ ...base, action: c.field === 'status' ? 'STATUS_CHANGE' : 'UPDATE', field: c.field, oldValue: fmt(c.oldValue), newValue: fmt(c.newValue), descriptionAr: `[server] ${label}: ${c.field} تغيّر`, descriptionEn: `[server] ${label}: ${c.field} changed` });
  }
}
export const auditInquiries = onDocumentWritten('inquiries/{id}', (e) => serverAudit('inquiries', e.data?.after.data()?.inquiryNo || e.data?.before.data()?.inquiryNo || e.params.id, e, ['status', 'priority', 'deadlineAt', 'assignedEngineerId', 'salespersonId', 'isDeleted', 'outcome', 'finalQuotationValue']));
export const auditQuotations = onDocumentWritten('quotations/{id}', (e) => serverAudit('quotations', e.data?.after.data()?.quotationNo || e.data?.before.data()?.quotationNo || e.params.id, e, ['status', 'total', 'revision']));
export const auditUsers = onDocumentWritten('users/{id}', (e) => serverAudit('users', e.data?.after.data()?.email || e.data?.before.data()?.email || e.params.id, e, ['roleId', 'status', 'permissionOverrides', 'isSuperAdmin']));

// ---------------- schedules ----------------
const FINAL = ['WON', 'LOST', 'NO_BID', 'CANCELLED'];
const PENDING_QUOTE_EXCLUDED = ['SENT_TO_CLIENT', 'FOLLOW_UP', ...FINAL];

export const eodReport = onSchedule({ schedule: '30 16 * * 0-4', timeZone: 'Asia/Riyadh' }, async () => {
  const snap = await db.collection('inquiries').where('status', 'not-in', PENDING_QUOTE_EXCLUDED).get();
  const bySales: Record<string, { name: string; items: string[] }> = {};
  snap.docs.forEach(d => { const i = d.data(); if (i.isDeleted) return; (bySales[i.salespersonId] ||= { name: i.salespersonName, items: [] }).items.push(`${i.inquiryNo} — ${i.status}`); });
  const batch = db.batch();
  Object.entries(bySales).forEach(([uid, v]) => {
    batch.set(db.collection('notifications').doc(), { userId: uid, titleAr: `تقرير نهاية اليوم: ${v.items.length} استفسار معلّق`, titleEn: `End of day: ${v.items.length} pending inquiries`, bodyAr: v.items.slice(0, 10).join(' | '), bodyEn: v.items.slice(0, 10).join(' | '), link: '/inquiries?pending=1', read: false, level: 'warning', createdAt: FieldValue.serverTimestamp() });
  });
  const managers = await db.collection('users').where('effectivePermissions', 'array-contains', 'dashboards.view.company').get();
  const total = Object.values(bySales).reduce((a, v) => a + v.items.length, 0);
  managers.docs.forEach(m => { if (m.data().status === 'active') batch.set(db.collection('notifications').doc(), { userId: m.id, titleAr: `ملخص نهاية اليوم: ${total} استفسار لم يُسعَّر`, titleEn: `EOD summary: ${total} inquiries not yet quoted`, bodyAr: Object.values(bySales).map(v => `${v.name}: ${v.items.length}`).join(' | '), bodyEn: Object.values(bySales).map(v => `${v.name}: ${v.items.length}`).join(' | '), link: '/reports', read: false, level: 'info', createdAt: FieldValue.serverTimestamp() }); });
  await batch.commit();
});

export const overdueSweep = onSchedule({ schedule: 'every 60 minutes', timeZone: 'Asia/Riyadh' }, async () => {
  const now = admin.firestore.Timestamp.now();
  const snap = await db.collection('inquiries').where('deadlineAt', '<=', now).get();
  const batch = db.batch(); let n = 0;
  for (const d of snap.docs) {
    const i = d.data();
    if (i.isDeleted || FINAL.includes(i.status) || ['SENT_TO_CLIENT', 'FOLLOW_UP', 'WAITING_INFO', 'ON_HOLD'].includes(i.status)) continue;
    if (i.overdueNotifiedAt && (now.toMillis() - i.overdueNotifiedAt.toMillis()) < 24 * 3600 * 1000) continue;
    batch.update(d.ref, { isOverdue: true, overdueNotifiedAt: now });
    if (i.assignedEngineerId) batch.set(db.collection('notifications').doc(), { userId: i.assignedEngineerId, titleAr: `تجاوز الموعد النهائي: ${i.inquiryNo}`, titleEn: `Deadline passed: ${i.inquiryNo}`, bodyAr: i.clientName, bodyEn: i.clientName, link: `/inquiries/${d.id}`, read: false, level: 'danger', createdAt: FieldValue.serverTimestamp() });
    n++;
  }
  if (n) {
    const managers = await db.collection('users').where('effectivePermissions', 'array-contains', 'extensions.approve').get();
    managers.docs.forEach(m => { if (m.data().status === 'active') batch.set(db.collection('notifications').doc(), { userId: m.id, titleAr: `${n} استفسار تجاوز موعده`, titleEn: `${n} inquiries are overdue`, link: '/inquiries?overdue=1', read: false, level: 'danger', createdAt: FieldValue.serverTimestamp() }); });
  }
  await batch.commit();
});

export const retentionSweep = onSchedule({ schedule: '0 3 * * *', timeZone: 'Asia/Riyadh' }, async () => {
  const s = await db.doc('settings/general').get();
  const months = s.data()?.logRetentionMonths || 12;
  const cutoff = new Date(); cutoff.setMonth(cutoff.getMonth() - months);
  const old = await db.collection('activity_log').where('timestamp', '<=', admin.firestore.Timestamp.fromDate(cutoff)).limit(400).get();
  if (old.empty) return;
  const batch = db.batch();
  old.docs.forEach(d => { batch.set(db.doc(`activity_log_archive/${d.id}`), { ...d.data(), archivedAt: FieldValue.serverTimestamp(), archivedBy: 'retention' }); batch.delete(d.ref); });
  await batch.commit();
});
