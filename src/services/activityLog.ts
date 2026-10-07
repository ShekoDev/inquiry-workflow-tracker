import {
  addDoc, collection, deleteDoc, doc, getDocs, limit, orderBy, query, serverTimestamp,
  startAfter, where, writeBatch, Timestamp, type QueryConstraint, type DocumentSnapshot
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { setDoc, updateDoc } from 'firebase/firestore';
import type { ActivityAction, ActivityLog, AppUser, UndoPayload } from '@/types';

let currentUser: AppUser | null = null;
let sessionId = '';
export function setLogContext(u: AppUser | null) {
  currentUser = u;
  if (u && !sessionId) sessionId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  if (!u) sessionId = '';
}

export interface LogInput {
  action: ActivityAction;
  module: string;
  recordId?: string;
  recordLabel?: string;
  field?: string;
  oldValue?: unknown;
  newValue?: unknown;
  descriptionAr: string;
  descriptionEn: string;
  /** makes this entry reversible from the activity log */
  undo?: UndoPayload;
}

const str = (v: unknown) => (v === undefined || v === null ? undefined : typeof v === 'object' ? JSON.stringify(v) : String(v));

/**
 * Writes one activity entry. The timestamp is a server timestamp — the client never supplies it.
 * Every mutation in the services layer calls this; Cloud Functions also log critical writes independently.
 */
export async function logActivity(input: LogInput, userOverride?: Partial<AppUser>) {
  const u = userOverride ? { ...(currentUser || {}), ...userOverride } : currentUser;
  if (!u || !u.uid) return;
  const entry: Record<string, unknown> = {
    timestamp: serverTimestamp(),
    userId: u.uid,
    userName: u.nameAr || u.nameEn || u.email || '',
    userEmail: u.email || '',
    roleId: u.roleId || '',
    action: input.action,
    module: input.module,
    descriptionAr: input.descriptionAr,
    descriptionEn: input.descriptionEn,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 200) : '',
    sessionId
  };
  if (input.recordId) entry.recordId = input.recordId;
  if (input.recordLabel) entry.recordLabel = input.recordLabel;
  if (input.field) entry.field = input.field;
  const ov = str(input.oldValue), nv = str(input.newValue);
  if (ov !== undefined) entry.oldValue = ov;
  if (nv !== undefined) entry.newValue = nv;
  if (input.undo) entry.undo = input.undo;
  try { await addDoc(collection(db, 'activity_log'), entry); } catch (e) { console.warn('activity log failed', e); }
}

/**
 * Reverses one logged action. Deletions are restored from the trash bundle;
 * field changes are written back to their previous values.
 */
export async function undoLogEntry(entry: ActivityLog, me: AppUser) {
  if (!entry.undo) throw new Error('not_undoable');
  if (entry.undoneAt) throw new Error('already_undone');

  if (entry.undo.kind === 'restore') {
    const { getTrashItem, restoreFromTrash } = await import('./trash');
    const item = await getTrashItem(entry.undo.trashId);
    if (!item) throw new Error('trash_expired');
    await restoreFromTrash(item, me);
  } else {
    await updateDoc(doc(db, entry.undo.path), { ...entry.undo.values, updatedAt: serverTimestamp() });
    await logActivity({
      action: 'UPDATE', module: entry.module, recordId: entry.recordId, recordLabel: entry.recordLabel,
      field: entry.field, newValue: Object.values(entry.undo.values).join(', '),
      descriptionAr: `تراجع عن: ${entry.descriptionAr}`,
      descriptionEn: `Undo: ${entry.descriptionEn}`
    });
  }
  await updateDoc(doc(db, 'activity_log', entry.id), {
    undoneAt: serverTimestamp(), undoneBy: me.uid, undoneByName: me.nameEn || me.nameAr || me.email
  });
}

export interface LogFilter {
  userId?: string;
  module?: string;
  action?: string;
  recordId?: string;
  from?: Date;
  to?: Date;
  pageSize?: number;
  after?: DocumentSnapshot;
}

export async function fetchLogs(f: LogFilter): Promise<{ rows: ActivityLog[]; last?: DocumentSnapshot }> {
  const c: QueryConstraint[] = [];
  if (f.userId) c.push(where('userId', '==', f.userId));
  if (f.module) c.push(where('module', '==', f.module));
  if (f.action) c.push(where('action', '==', f.action));
  if (f.recordId) c.push(where('recordId', '==', f.recordId));
  if (f.from) c.push(where('timestamp', '>=', Timestamp.fromDate(f.from)));
  if (f.to) c.push(where('timestamp', '<=', Timestamp.fromDate(f.to)));
  c.push(orderBy('timestamp', 'desc'));
  if (f.after) c.push(startAfter(f.after));
  c.push(limit(f.pageSize || 100));
  const snap = await getDocs(query(collection(db, 'activity_log'), ...c));
  const rows = snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<ActivityLog, 'id'>) }));
  return { rows, last: snap.docs[snap.docs.length - 1] };
}

/** Deletes entries by id. The deleted entries are archived and the deletion itself is recorded in log_deletions. */
export async function deleteLogEntries(entries: ActivityLog[], reason: string) {
  if (!currentUser) throw new Error('no user');
  const chunks: ActivityLog[][] = [];
  for (let i = 0; i < entries.length; i += 200) chunks.push(entries.slice(i, i + 200));
  for (const chunk of chunks) {
    const batch = writeBatch(db);
    for (const e of chunk) {
      const { id, ...rest } = e;
      batch.set(doc(db, 'activity_log_archive', id), { ...rest, archivedAt: serverTimestamp(), archivedBy: currentUser.uid });
      batch.delete(doc(db, 'activity_log', id));
    }
    await batch.commit();
  }
  const times = entries.map(e => e.timestamp?.toMillis?.() || 0).filter(Boolean);
  await addDoc(collection(db, 'log_deletions'), {
    deletedBy: currentUser.uid,
    deletedByName: currentUser.nameAr || currentUser.email,
    deletedAt: serverTimestamp(),
    count: entries.length,
    rangeFrom: times.length ? Timestamp.fromMillis(Math.min(...times)) : null,
    rangeTo: times.length ? Timestamp.fromMillis(Math.max(...times)) : null,
    reason
  });
}

export async function fetchLogDeletions() {
  const snap = await getDocs(query(collection(db, 'log_deletions'), orderBy('deletedAt', 'desc'), limit(200)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
}

export async function purgeArchive(olderThan: Date) {
  const snap = await getDocs(query(collection(db, 'activity_log_archive'), where('archivedAt', '<=', Timestamp.fromDate(olderThan)), limit(400)));
  await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
  return snap.size;
}
