import { collection, deleteDoc, doc, getDocs, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import type { AppUser, Role } from '@/types';
import { DEFAULT_ROLES } from '@/constants/roles';
import { computeEffective } from '@/constants/permissions';
import { logActivity } from './activityLog';

/**
 * Pushes each role's current permission set into the denormalized
 * `effectivePermissions` of the users holding that role. There are no Cloud
 * Functions on the Spark plan, so the client keeps the copy fresh whenever a
 * role changes — otherwise existing users would never receive new role keys.
 * The acting admin's own document is skipped (rules forbid touching your own
 * privilege fields) and super admins bypass permissions anyway.
 */
export async function refreshUsersEffective(roleIds?: string[]): Promise<number> {
  const rolesNow = await listRoles();
  const byId = new Map(rolesNow.map(r => [r.id, r]));
  const snap = await getDocs(collection(db, 'users'));
  const me = auth.currentUser?.uid;
  const batch = writeBatch(db);
  let n = 0;
  snap.docs.forEach(d => {
    if (d.id === me) return;
    const u = d.data() as AppUser;
    if (u.isSuperAdmin || u.status === 'deleted') return;
    if (roleIds && roleIds.length && !roleIds.includes(u.roleId)) return;
    const eff = computeEffective(byId.get(u.roleId)?.permissions || [], u.permissionOverrides);
    const cur = u.effectivePermissions || [];
    if (JSON.stringify([...eff].sort()) !== JSON.stringify([...cur].sort())) {
      batch.update(d.ref, { effectivePermissions: eff, updatedAt: serverTimestamp() });
      n++;
    }
  });
  if (n) await batch.commit();
  return n;
}

export async function listRoles(): Promise<Role[]> {
  const snap = await getDocs(collection(db, 'roles'));
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Role, 'id'>) }));
}

export async function seedDefaultRoles() {
  const existing = await listRoles();
  if (existing.length) return;
  const batch = writeBatch(db);
  DEFAULT_ROLES.forEach(r => batch.set(doc(db, 'roles', r.id), { ...r, createdAt: serverTimestamp() }));
  await batch.commit();
}

/**
 * Brings the live roles collection in step with DEFAULT_ROLES after the app gains new
 * permission modules. Missing system roles are created; existing ones get the new keys added.
 * Permissions an admin deliberately removed stay removed — only genuinely new keys are added,
 * and custom (non-system) roles are never touched.
 */
export async function syncDefaultRoles(): Promise<{ created: number; updated: number }> {
  const existing = await listRoles();
  const byId = new Map(existing.map(r => [r.id, r]));
  const known = new Set(existing.flatMap(r => r.permissions || []));
  const batch = writeBatch(db);
  let created = 0, updated = 0;

  for (const def of DEFAULT_ROLES) {
    const cur = byId.get(def.id);
    if (!cur) {
      batch.set(doc(db, 'roles', def.id), { ...def, createdAt: serverTimestamp() });
      created++;
      continue;
    }
    // only keys that no role in the database has ever seen count as "new to the system"
    const missing = def.permissions.filter(k => !known.has(k) && !(cur.permissions || []).includes(k));
    const renamed = cur.nameAr !== def.nameAr || cur.nameEn !== def.nameEn;
    if (def.id === 'super_admin') {
      // the super admin always holds everything
      const all = def.permissions;
      if (all.length !== (cur.permissions || []).length || renamed) {
        batch.update(doc(db, 'roles', def.id), { permissions: all, nameAr: def.nameAr, nameEn: def.nameEn, updatedAt: serverTimestamp() });
        updated++;
      }
      continue;
    }
    if (missing.length || renamed) {
      batch.update(doc(db, 'roles', def.id), {
        permissions: [...(cur.permissions || []), ...missing],
        nameAr: def.nameAr, nameEn: def.nameEn, isSystem: true, updatedAt: serverTimestamp()
      });
      updated++;
    }
  }
  if (created || updated) {
    await batch.commit();
    // propagate the refreshed role permissions to the users holding them
    await refreshUsersEffective().catch(e => console.error('Failed to refresh user permissions:', e));
    await logActivity({
      action: 'PERMISSION_CHANGE', module: 'roles', recordLabel: 'defaults',
      newValue: `${created}/${updated}`,
      descriptionAr: `تحديث الأدوار الافتراضية — ${created} دور جديد و${updated} دور محدَّث`,
      descriptionEn: `Synced default roles — ${created} created, ${updated} updated`
    });
  }
  return { created, updated };
}

export async function saveRole(role: Omit<Role, 'createdAt'>, isNew: boolean, prev?: Role) {
  const ref = doc(db, 'roles', role.id);
  if (isNew) await setDoc(ref, { ...role, createdAt: serverTimestamp() });
  else await updateDoc(ref, { nameAr: role.nameAr, nameEn: role.nameEn, descriptionAr: role.descriptionAr || '', descriptionEn: role.descriptionEn || '', permissions: role.permissions, updatedAt: serverTimestamp() });
  // keep every holder of this role in sync with the new permission set
  await refreshUsersEffective([role.id]).catch(e => console.error('Failed to refresh user permissions:', e));
  const added = role.permissions.filter(p => !(prev?.permissions || []).includes(p));
  const removed = (prev?.permissions || []).filter(p => !role.permissions.includes(p));
  await logActivity({
    action: isNew ? 'CREATE' : 'PERMISSION_CHANGE', module: 'roles', recordId: role.id, recordLabel: role.nameEn,
    field: 'permissions', oldValue: prev?.permissions?.length ?? 0, newValue: role.permissions.length,
    descriptionAr: isNew ? `إنشاء دور ${role.nameAr}` : `تعديل صلاحيات الدور ${role.nameAr} (+${added.length} / −${removed.length})`,
    descriptionEn: isNew ? `Created role ${role.nameEn}` : `Role ${role.nameEn} permissions changed (+${added.length} / −${removed.length})`
  });
}

export async function deleteRole(role: Role) {
  if (role.isSystem) throw new Error('system_role');
  await deleteDoc(doc(db, 'roles', role.id));
  await logActivity({ action: 'DELETE', module: 'roles', recordId: role.id, recordLabel: role.nameEn, descriptionAr: `حذف الدور ${role.nameAr}`, descriptionEn: `Deleted role ${role.nameEn}` });
}
