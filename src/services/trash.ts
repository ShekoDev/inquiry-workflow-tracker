import { addDoc, collection, deleteDoc, doc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, Timestamp, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { AppUser, TrashItem } from '@/types';
import { logActivity } from './activityLog';

/** how long a deleted record stays recoverable */
export const RETENTION_DAYS = 30;

export interface TrashDoc { path: string; data: Record<string, unknown> }

/**
 * Nothing is deleted outright — the documents are copied into `trash` first, so the
 * activity log can offer a one-click restore for the next 30 days.
 */
export async function moveToTrash(
  docs: TrashDoc[],
  meta: { module: string; label: string; recordId?: string },
  me: AppUser
): Promise<string> {
  const now = Date.now();
  const ref = await addDoc(collection(db, 'trash'), {
    module: meta.module,
    label: meta.label,
    recordId: meta.recordId || '',
    docCount: docs.length,
    docs,
    deletedAt: serverTimestamp(),
    deletedBy: me.uid,
    deletedByName: me.nameEn || me.nameAr || me.email,
    expiresAt: Timestamp.fromMillis(now + RETENTION_DAYS * 86400000)
  });
  return ref.id;
}

/** Puts every document in the bundle back exactly where it came from. */
export async function restoreFromTrash(item: TrashItem, me: AppUser) {
  for (const d of item.docs) {
    await setDoc(doc(db, d.path), d.data);
  }
  await deleteDoc(doc(db, 'trash', item.id));
  await logActivity({
    action: 'CREATE', module: item.module, recordId: item.recordId, recordLabel: item.label,
    newValue: item.docs.length,
    descriptionAr: `استرجاع ${item.label} من سلة المحذوفات (${item.docs.length} سجل) — ${me.nameAr || me.email}`,
    descriptionEn: `Restored ${item.label} from trash (${item.docs.length} records) — ${me.nameEn || me.email}`
  });
}

export async function listTrash(): Promise<TrashItem[]> {
  const snap = await getDocs(query(collection(db, 'trash'), orderBy('deletedAt', 'desc'), limit(300)));
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<TrashItem, 'id'>) }));
}

export async function getTrashItem(id: string): Promise<TrashItem | null> {
  const snap = await getDocs(query(collection(db, 'trash'), where('__name__', '==', id), limit(1)));
  const d = snap.docs[0];
  return d ? ({ id: d.id, ...(d.data() as Omit<TrashItem, 'id'>) }) : null;
}

/** Empties a single bundle for good. */
export async function purgeTrashItem(item: TrashItem) {
  await deleteDoc(doc(db, 'trash', item.id));
  await logActivity({
    action: 'DELETE', module: 'settings', recordLabel: item.label,
    descriptionAr: `حذف نهائي من سلة المحذوفات: ${item.label}`,
    descriptionEn: `Permanently removed from trash: ${item.label}`
  });
}

/**
 * Drops anything past its 30 days. There is no server cron on the free plan, so this runs
 * whenever an admin opens the trash page — which is often enough for a 30-day window.
 */
export async function purgeExpiredTrash(): Promise<number> {
  const snap = await getDocs(query(collection(db, 'trash'), where('expiresAt', '<=', Timestamp.now()), limit(300)));
  await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
  return snap.size;
}
