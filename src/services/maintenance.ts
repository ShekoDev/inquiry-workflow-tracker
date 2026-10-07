import { collection, deleteDoc, doc, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { ref as sRef, deleteObject } from 'firebase/storage';
import { db, storage } from '@/config/firebase';
import type { AppUser, Inquiry } from '@/types';
import { logActivity } from './activityLog';
import { moveToTrash, type TrashDoc } from './trash';

/** every collection that hangs off an inquiry through an `inquiryId` field */
const LINKED_COLLECTIONS = ['quotations', 'issues', 'tasks', 'extension_requests'] as const;
/** every subcollection stored under the inquiry document itself */
const SUBCOLLECTIONS = ['history', 'remarks', 'attachments', 'followups'] as const;

/** Firestore batches cap at 500 writes — commit in chunks. */
async function deleteRefs(refs: { path: string }[]) {
  const all = refs.map(r => doc(db, r.path));
  for (let i = 0; i < all.length; i += 400) {
    const batch = writeBatch(db);
    all.slice(i, i + 400).forEach(r => batch.delete(r));
    await batch.commit();
  }
  return all.length;
}

/**
 * Hard-deletes an inquiry and everything attached to it: its quotations (with their
 * revisions), issues, tasks, extension requests, history, remarks, follow-ups and
 * attachments — including the stored files. Nothing is left behind to haunt the dashboard.
 */
export async function purgeInquiry(inq: Inquiry, me?: AppUser, options?: { keepCopy?: boolean }): Promise<{ removed: number; trashId?: string }> {
  const keep = options?.keepCopy !== false && !!me;
  const bundle: TrashDoc[] = [];
  const refs: { path: string }[] = [];
  const storagePaths: string[] = [];

  // 1) subcollections under the inquiry
  for (const sub of SUBCOLLECTIONS) {
    const snap = await getDocs(collection(db, 'inquiries', inq.id, sub));
    snap.docs.forEach(d => {
      if (sub === 'attachments' && d.data().path) storagePaths.push(d.data().path as string);
      bundle.push({ path: d.ref.path, data: d.data() });
      refs.push({ path: d.ref.path });
    });
  }

  // 2) linked top-level collections
  for (const col of LINKED_COLLECTIONS) {
    const snap = await getDocs(query(collection(db, col), where('inquiryId', '==', inq.id)));
    for (const d of snap.docs) {
      if (col === 'quotations') {
        const revs = await getDocs(collection(db, 'quotations', d.id, 'revisions'));
        revs.docs.forEach(r => { bundle.push({ path: r.ref.path, data: r.data() }); refs.push({ path: r.ref.path }); });
      }
      bundle.push({ path: d.ref.path, data: d.data() });
      refs.push({ path: d.ref.path });
    }
  }

  // 3) the inquiry itself
  const { id, ...inqData } = inq;
  bundle.push({ path: `inquiries/${inq.id}`, data: inqData as Record<string, unknown> });

  // keep a recoverable copy before anything disappears
  let trashId: string | undefined;
  if (keep) {
    trashId = await moveToTrash(bundle, { module: 'inquiries', label: `${inq.inquiryNo} — ${inq.clientName}`, recordId: inq.id }, me!);
  } else {
    // permanent removal: the stored attachment files go too
    for (const p of storagePaths) { try { await deleteObject(sRef(storage, p)); } catch { /* gone or Storage off */ } }
  }

  const removed = (await deleteRefs(refs)) + 1;
  await deleteDoc(doc(db, 'inquiries', inq.id));

  await logActivity({
    action: 'DELETE', module: 'inquiries', recordId: inq.id, recordLabel: inq.inquiryNo,
    newValue: removed,
    descriptionAr: `حذف الاستفسار ${inq.inquiryNo} وكل بياناته (${removed} سجل)${keep ? ' — قابل للاسترجاع 30 يوم' : ''}`,
    descriptionEn: `Deleted inquiry ${inq.inquiryNo} and all its data (${removed} records)${keep ? ' — recoverable for 30 days' : ''}`,
    ...(trashId ? { undo: { kind: 'restore' as const, trashId } } : {})
  });
  return { removed, trashId };
}

export interface CleanupResult { purgedInquiries: number; orphans: number; total: number }

/**
 * Housekeeping for data left over from the old soft-delete: inquiries flagged `isDeleted`
 * are purged for real, and any quotation / issue / task / extension whose inquiry no longer
 * exists is removed. Safe to run repeatedly.
 */
export async function cleanupOrphans(): Promise<CleanupResult> {
  const snap = await getDocs(collection(db, 'inquiries'));
  const live = new Set<string>();
  const dead: Inquiry[] = [];
  snap.docs.forEach(d => {
    const data = { id: d.id, ...(d.data() as Omit<Inquiry, 'id'>) };
    if (data.isDeleted) dead.push(data); else live.add(d.id);
  });

  let purgedInquiries = 0, orphans = 0;
  for (const inq of dead) { await purgeInquiry(inq, undefined, { keepCopy: false }); purgedInquiries++; }

  for (const col of LINKED_COLLECTIONS) {
    const all = await getDocs(collection(db, col));
    const stray = all.docs.filter(d => {
      const iid = d.data().inquiryId as string | undefined;
      // tasks may legitimately have no inquiry attached — only kill the ones pointing at a ghost
      return iid ? !live.has(iid) : false;
    });
    orphans += await deleteRefs(stray.map(d => ({ path: d.ref.path })));
  }

  if (purgedInquiries || orphans) {
    await logActivity({
      action: 'DELETE', module: 'settings', recordLabel: 'cleanup', newValue: purgedInquiries + orphans,
      descriptionAr: `تنظيف البيانات: حذف ${purgedInquiries} استفسار محذوف و${orphans} سجل يتيم`,
      descriptionEn: `Cleanup: purged ${purgedInquiries} deleted inquiries and ${orphans} orphan records`
    });
  }
  return { purgedInquiries, orphans, total: purgedInquiries + orphans };
}
