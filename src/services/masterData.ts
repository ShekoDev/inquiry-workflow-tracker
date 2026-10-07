import { addDoc, collection, deleteDoc, doc, getDocs, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { Client, Project, TeamMember } from '@/types';
import { logActivity } from './activityLog';

export async function saveClient(data: Omit<Client, 'id' | 'createdAt'>, id?: string, prev?: Client) {
  if (id) {
    await updateDoc(doc(db, 'clients', id), { ...data, updatedAt: serverTimestamp() });
    await logActivity({ action: 'UPDATE', module: 'clients', recordId: id, recordLabel: data.nameEn, oldValue: prev?.nameEn, newValue: data.nameEn, descriptionAr: `تعديل العميل ${data.nameAr}`, descriptionEn: `Updated client ${data.nameEn}` });
    return id;
  }
  const ref = await addDoc(collection(db, 'clients'), { ...data, createdAt: serverTimestamp() });
  await logActivity({ action: 'CREATE', module: 'clients', recordId: ref.id, recordLabel: data.nameEn, descriptionAr: `إضافة العميل ${data.nameAr}`, descriptionEn: `Added client ${data.nameEn}` });
  return ref.id;
}

export async function deleteClient(c: Client) {
  await deleteDoc(doc(db, 'clients', c.id));
  await logActivity({ action: 'DELETE', module: 'clients', recordId: c.id, recordLabel: c.nameEn, descriptionAr: `حذف العميل ${c.nameAr}`, descriptionEn: `Deleted client ${c.nameEn}` });
}

export async function saveProject(data: Omit<Project, 'id' | 'createdAt'>, id?: string) {
  if (id) {
    await updateDoc(doc(db, 'projects', id), { ...data, updatedAt: serverTimestamp() });
    await logActivity({ action: 'UPDATE', module: 'projects', recordId: id, recordLabel: data.nameEn, descriptionAr: `تعديل المشروع ${data.nameAr}`, descriptionEn: `Updated project ${data.nameEn}` });
    return id;
  }
  const ref = await addDoc(collection(db, 'projects'), { ...data, createdAt: serverTimestamp() });
  await logActivity({ action: 'CREATE', module: 'projects', recordId: ref.id, recordLabel: data.nameEn, descriptionAr: `إضافة المشروع ${data.nameAr}`, descriptionEn: `Added project ${data.nameEn}` });
  return ref.id;
}

export async function deleteProject(p: Project) {
  await deleteDoc(doc(db, 'projects', p.id));
  await logActivity({ action: 'DELETE', module: 'projects', recordId: p.id, recordLabel: p.nameEn, descriptionAr: `حذف المشروع ${p.nameAr}`, descriptionEn: `Deleted project ${p.nameEn}` });
}

// ---------------- Team roster (people without login accounts) ----------------
export async function saveTeamMember(data: Omit<TeamMember, 'id' | 'createdAt'>, id?: string) {
  if (id) {
    await updateDoc(doc(db, 'team_members', id), { ...data, updatedAt: serverTimestamp() });
    await logActivity({ action: 'UPDATE', module: 'team', recordId: id, recordLabel: data.name, descriptionAr: `تعديل عضو الفريق ${data.name}`, descriptionEn: `Updated team member ${data.name}` });
    return id;
  }
  const ref = await addDoc(collection(db, 'team_members'), { ...data, createdAt: serverTimestamp() });
  await logActivity({ action: 'CREATE', module: 'team', recordId: ref.id, recordLabel: data.name, descriptionAr: `إضافة عضو الفريق ${data.name}`, descriptionEn: `Added team member ${data.name}` });
  return ref.id;
}

export async function deleteTeamMember(m: TeamMember) {
  await deleteDoc(doc(db, 'team_members', m.id));
  await logActivity({ action: 'DELETE', module: 'team', recordId: m.id, recordLabel: m.name, descriptionAr: `حذف عضو الفريق ${m.name}`, descriptionEn: `Deleted team member ${m.name}` });
}

/** Sample roster — inserted once, only when the collection is still empty. */
export const DEFAULT_TEAM: Omit<TeamMember, 'id' | 'createdAt' | 'isActive'>[] = [
  { name: 'Sample Engineer 1', type: 'both', country: 'AE' },
  { name: 'Sample Engineer 2', type: 'both', country: 'AE' },
  { name: 'Sample Engineer 3', type: 'both', country: 'AE' },
  { name: 'Sample Engineer 4', type: 'both', country: 'AE' },
  { name: 'Sample Engineer 5', type: 'both', country: 'AE' },
  { name: 'Sample Engineer 10', type: 'both', country: 'SA' },
  { name: 'Sample Engineer 6', type: 'both', country: 'SA' },
  { name: 'Sample Engineer 7', type: 'both', country: 'SA' },
  { name: 'Sample Engineer 8', type: 'both', country: 'SA' },
  { name: 'Sample Engineer 9', type: 'both', country: 'SA' }
];

export async function seedTeam(createdBy: string) {
  const snap = await getDocs(collection(db, 'team_members'));
  if (!snap.empty) return 0;
  const batch = writeBatch(db);
  DEFAULT_TEAM.forEach(m => batch.set(doc(collection(db, 'team_members')), { ...m, isActive: true, createdBy, createdAt: serverTimestamp() }));
  await batch.commit();
  await logActivity({ action: 'CREATE', module: 'team', descriptionAr: `إضافة ${DEFAULT_TEAM.length} عضو للفريق (قائمة افتراضية)`, descriptionEn: `Seeded ${DEFAULT_TEAM.length} team members` });
  return DEFAULT_TEAM.length;
}
