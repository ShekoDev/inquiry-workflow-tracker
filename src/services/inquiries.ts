import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit, query, serverTimestamp, Timestamp, updateDoc, where, increment
} from 'firebase/firestore';
import { ref as sRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '@/config/firebase';
import type { AppUser, CountryCode, GeneralSettings, Inquiry, InquiryStatus, Priority } from '@/types';
import { STATUSES, TRANSITIONS } from '@/constants/workflow';
import { logActivity } from './activityLog';
import { nextNumber } from './settings';
import { addWorkingHours, slaHoursFor, workingMinutesBetween, workClockStart } from '@/utils/sla';

export interface NewInquiryInput {
  clientId: string; clientName: string; projectId?: string; projectName?: string; country?: CountryCode;
  salespersonId: string; salespersonName: string; scopeAr: string; scopeEn: string; scopeType?: string;
  receivedAt: Date; requiredSubmissionDate?: Date; estimatedValue?: number; priority?: Priority; prioritySource?: 'auto' | 'manual';
  /** supplied by the user when settings.inquiryNumbering === 'manual' */
  inquiryNo?: string;
}

/** true when no other inquiry already carries this number */
export async function isInquiryNoFree(no: string, exceptId?: string): Promise<boolean> {
  const snap = await getDocs(query(collection(db, 'inquiries'), where('inquiryNo', '==', no.trim()), limit(2)));
  return snap.docs.every(d => d.id === exceptId);
}

export async function createInquiry(input: NewInquiryInput, me: AppUser, settings: GeneralSettings): Promise<string> {
  const manual = settings.inquiryNumbering === 'manual';
  let inquiryNo: string;
  if (manual) {
    inquiryNo = (input.inquiryNo || '').trim();
    if (!inquiryNo) throw new Error('inquiry_no_required');
    if (!(await isInquiryNoFree(inquiryNo))) throw new Error('inquiry_no_taken');
  } else {
    inquiryNo = await nextNumber('inquiry', settings.inquiryPrefix);
  }
  const data: Record<string, unknown> = {
    inquiryNo,
    inquiryNoSource: manual ? 'manual' : 'auto',
    clientId: input.clientId, clientName: input.clientName,
    country: input.country || settings.defaultCountry || 'SA',
    salespersonId: input.salespersonId, salespersonName: input.salespersonName,
    scopeAr: input.scopeAr, scopeEn: input.scopeEn,
    receivedAt: Timestamp.fromDate(input.receivedAt),
    status: 'NEW' as InquiryStatus,
    pausedMinutes: 0,
    createdBy: me.uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), isDeleted: false
  };
  if (input.projectId) { data.projectId = input.projectId; data.projectName = input.projectName || ''; }
  if (input.scopeType) data.scopeType = input.scopeType;
  if (input.requiredSubmissionDate) data.requiredSubmissionDate = Timestamp.fromDate(input.requiredSubmissionDate);
  if (input.estimatedValue !== undefined) data.estimatedValue = input.estimatedValue;
  if (input.priority) {
    data.priority = input.priority; data.prioritySource = input.prioritySource || 'auto';
    data.deadlineAt = Timestamp.fromDate(addWorkingHours(input.receivedAt, slaHoursFor(input.priority, settings), settings));
  }
  const ref = await addDoc(collection(db, 'inquiries'), data);
  await addDoc(collection(db, 'inquiries', ref.id, 'history'), { to: 'NEW', by: me.uid, byName: me.nameAr || me.email, at: serverTimestamp() });
  await logActivity({ action: 'CREATE', module: 'inquiries', recordId: ref.id, recordLabel: inquiryNo, descriptionAr: `تسجيل استفسار ${inquiryNo} — ${input.clientName}`, descriptionEn: `Registered inquiry ${inquiryNo} — ${input.clientName}` });
  return ref.id;
}

export async function updateInquiryFields(inq: Inquiry, patch: Record<string, unknown>, me: AppUser) {
  await updateDoc(doc(db, 'inquiries', inq.id), { ...patch, updatedBy: me.uid, updatedAt: serverTimestamp() });
  for (const [k, v] of Object.entries(patch)) {
    const old = (inq as any)[k];
    const same = JSON.stringify(old?.toMillis ? old.toMillis() : old) === JSON.stringify((v as any)?.toMillis ? (v as any).toMillis() : v);
    if (same) continue;
    await logActivity({ action: 'UPDATE', module: 'inquiries', recordId: inq.id, recordLabel: inq.inquiryNo, field: k, oldValue: old?.toDate ? old.toDate().toISOString() : old, newValue: (v as any)?.toDate ? (v as any).toDate().toISOString() : v, descriptionAr: `تعديل ${k} في ${inq.inquiryNo}`, descriptionEn: `Updated ${k} on ${inq.inquiryNo}` });
  }
}

/**
 * "استلمت الاستفسار" — the assigned engineer (or whoever picks it up) confirms receipt.
 * This is what starts the work clock; everything before it counts as queue / response time.
 * If the inquiry is sitting in ASSIGNED it is also moved to PROCESSING in the same action.
 */
export async function acknowledgeInquiry(inq: Inquiry, me: AppUser, settings: GeneralSettings) {
  if (inq.acknowledgedAt) return;
  const now = new Date();
  const received = inq.receivedAt?.toDate?.() || now;
  const patch: Record<string, unknown> = {
    acknowledgedAt: serverTimestamp(),
    acknowledgedBy: me.uid,
    acknowledgedByName: me.nameAr || me.nameEn || me.email,
    firstResponseMin: workingMinutesBetween(received, now, settings),
    updatedBy: me.uid,
    updatedAt: serverTimestamp()
  };
  // nobody was assigned yet — the person who picked it up owns it
  if (!inq.assignedEngineerId) {
    patch.assignedEngineerId = me.uid;
    patch.assignedEngineerName = me.nameAr || me.nameEn || me.email;
  }
  await updateDoc(doc(db, 'inquiries', inq.id), patch);
  await addDoc(collection(db, 'inquiries', inq.id, 'history'), {
    from: inq.status, to: inq.status, by: me.uid, byName: me.nameAr || me.email, at: serverTimestamp(),
    note: `ACKNOWLEDGED — ${me.nameAr || me.email}`
  });
  await logActivity({
    action: 'UPDATE', module: 'inquiries', recordId: inq.id, recordLabel: inq.inquiryNo, field: 'acknowledgedAt',
    newValue: now.toISOString(),
    descriptionAr: `استلام الاستفسار ${inq.inquiryNo} وبدء احتساب الوقت — ${me.nameAr || me.email}`,
    descriptionEn: `${inq.inquiryNo} acknowledged, work clock started — ${me.nameEn || me.email}`
  });
  // move it onto the processing track when it is simply waiting to be picked up
  const next: InquiryStatus | null = inq.status === 'ASSIGNED' ? 'PROCESSING' : null;
  if (next && canTransition(inq.status, next)) {
    await transition({ ...inq, acknowledgedAt: Timestamp.fromDate(now) }, next, me, settings);
  }
}

export function canTransition(from: InquiryStatus, to: InquiryStatus) {
  return (TRANSITIONS[from] || []).includes(to);
}

/**
 * The single entry point for moving an inquiry between statuses.
 * Enforces the transition table, mandatory notes, clock pause/resume, and writes history + activity log.
 */
export async function transition(inq: Inquiry, to: InquiryStatus, me: AppUser, settings: GeneralSettings, opts: { note?: string; extra?: Record<string, unknown> } = {}) {
  const from = inq.status;
  if (!canTransition(from, to)) throw new Error('invalid_transition');
  const def = STATUSES[to];
  if (def.requiresNote && !opts.note?.trim()) throw new Error('note_required');

  const now = new Date();
  const patch: Record<string, unknown> = { status: to, previousStatus: from, updatedBy: me.uid, updatedAt: serverTimestamp(), ...(opts.extra || {}) };

  // ---- clock handling ----
  const wasPaused = STATUSES[from]?.pausesClock;
  const willPause = def.pausesClock;
  if (wasPaused && inq.pausedAt) {
    patch.pausedMinutes = increment(workingMinutesBetween(inq.pausedAt.toDate(), now, settings));
    patch.pausedAt = null;
    if (from === 'WAITING_INFO') patch.missingInfoReceivedAt = serverTimestamp();
    // extend the deadline by the paused duration so the engineer isn't punished for the wait
    if (inq.deadlineAt) {
      const pausedH = workingMinutesBetween(inq.pausedAt.toDate(), now, settings) / 60;
      patch.deadlineAt = Timestamp.fromDate(addWorkingHours(inq.deadlineAt.toDate(), pausedH, settings));
    }
  }
  if (willPause) {
    patch.pausedAt = serverTimestamp();
    if (to === 'WAITING_INFO') patch.missingInfoRequestedAt = serverTimestamp();
  }
  if (to === 'PROCESSING' && !inq.processingStartedAt) {
    patch.processingStartedAt = serverTimestamp();
    // starting processing counts as acknowledging it, if nobody did so explicitly
    if (!inq.acknowledgedAt) {
      patch.acknowledgedAt = serverTimestamp();
      patch.acknowledgedBy = me.uid;
      patch.acknowledgedByName = me.nameAr || me.nameEn || me.email;
      patch.firstResponseMin = workingMinutesBetween(inq.receivedAt?.toDate?.() || now, now, settings);
    }
    if (!inq.deadlineAt) patch.deadlineAt = Timestamp.fromDate(addWorkingHours(now, slaHoursFor(inq.priority, settings), settings));
  }
  if (to === 'UNDER_REVIEW' && !inq.processingCompletedAt) patch.processingCompletedAt = serverTimestamp();
  if (def.isFinal) { patch.closedAt = serverTimestamp(); patch.outcome = to; }

  await updateDoc(doc(db, 'inquiries', inq.id), patch);
  await addDoc(collection(db, 'inquiries', inq.id, 'history'), { from, to, by: me.uid, byName: me.nameAr || me.email, at: serverTimestamp(), note: opts.note || '' });
  await logActivity({
    action: 'STATUS_CHANGE', module: 'inquiries', recordId: inq.id, recordLabel: inq.inquiryNo, field: 'status', oldValue: from, newValue: to,
    descriptionAr: `تغيير حالة ${inq.inquiryNo}: ${from} ← ${to}${opts.note ? ' — ' + opts.note : ''}`,
    descriptionEn: `${inq.inquiryNo} status: ${from} → ${to}${opts.note ? ' — ' + opts.note : ''}`,
    undo: { kind: 'fields', path: `inquiries/${inq.id}`, values: { status: from, previousStatus: inq.previousStatus || null } }
  });
}

export async function setPriority(inq: Inquiry, priority: Priority, reason: string, me: AppUser, settings: GeneralSettings) {
  const base = workClockStart(inq) || new Date();
  const patch: Record<string, unknown> = {
    priority, prioritySource: 'manual', priorityReason: reason,
    deadlineAt: Timestamp.fromDate(addWorkingHours(base, slaHoursFor(priority, settings), settings)),
    updatedBy: me.uid, updatedAt: serverTimestamp()
  };
  await updateDoc(doc(db, 'inquiries', inq.id), patch);
  await addDoc(collection(db, 'inquiries', inq.id, 'history'), { from: inq.status, to: inq.status, by: me.uid, byName: me.nameAr || me.email, at: serverTimestamp(), note: `PRIORITY ${inq.priority || '-'} → ${priority}: ${reason}` });
  await logActivity({ action: 'UPDATE', module: 'inquiries', recordId: inq.id, recordLabel: inq.inquiryNo, field: 'priority', oldValue: inq.priority, newValue: priority, descriptionAr: `تحديد أولوية ${inq.inquiryNo}: ${priority} — ${reason}`, descriptionEn: `${inq.inquiryNo} priority set to ${priority} — ${reason}`, undo: inq.priority ? { kind: 'fields', path: `inquiries/${inq.id}`, values: { priority: inq.priority } } : undefined });
}

/** One inquiry can be worked by several engineers; the FIRST one is the responsible (primary) engineer. */
export interface AssignedEngineer { id: string; name: string; isUser: boolean }

export async function assignEngineer(inq: Inquiry, engineers: AssignedEngineer[], me: AppUser, settings: GeneralSettings) {
  if (!engineers.length) return;
  const primary = engineers[0];
  const names = engineers.map(e => e.name);
  const patch: Record<string, unknown> = {
    assignedEngineerId: primary.id, assignedEngineerName: primary.name,
    engineerIds: engineers.map(e => e.id), engineerNames: names,
    updatedBy: me.uid, updatedAt: serverTimestamp()
  };
  await updateDoc(doc(db, 'inquiries', inq.id), patch);
  await addDoc(collection(db, 'inquiries', inq.id, 'history'), { from: inq.status, to: inq.status, by: me.uid, byName: me.nameAr || me.email, at: serverTimestamp(), note: `ASSIGNED → ${names.join('، ')}` });
  await logActivity({ action: 'ASSIGN', module: 'inquiries', recordId: inq.id, recordLabel: inq.inquiryNo, field: 'assignedEngineerId', oldValue: inq.engineerNames?.join('، ') || inq.assignedEngineerName, newValue: names.join('، '), descriptionAr: `إسناد ${inq.inquiryNo} إلى ${names.join('، ')}`, descriptionEn: `${inq.inquiryNo} assigned to ${names.join(', ')}`, undo: { kind: 'fields', path: `inquiries/${inq.id}`, values: { assignedEngineerId: inq.assignedEngineerId || null, assignedEngineerName: inq.assignedEngineerName || null, engineerIds: inq.engineerIds || [], engineerNames: inq.engineerNames || [] } } });
  if (inq.status === 'PRIORITY_ASSIGNMENT' && canTransition(inq.status, 'ASSIGNED')) {
    await transition({ ...inq, assignedEngineerId: primary.id }, 'ASSIGNED', me, settings);
  }
  // roster members have no login account, so there is nobody to notify
  for (const eng of engineers.filter(e => e.isUser)) {
    await addDoc(collection(db, 'notifications'), { type: 'alert',
      userId: eng.id, titleAr: 'استفسار جديد مسند إليك', titleEn: 'New inquiry assigned to you',
      bodyAr: `${inq.inquiryNo} — ${inq.clientName}`, bodyEn: `${inq.inquiryNo} — ${inq.clientName}`,
      link: `/inquiries/${inq.id}`, read: false, level: 'info', createdAt: serverTimestamp()
    });
  }
}

export async function addRemark(inq: Inquiry, text: string, me: AppUser) {
  await addDoc(collection(db, 'inquiries', inq.id, 'remarks'), { text, by: me.uid, byName: me.nameAr || me.email, at: serverTimestamp() });
  await logActivity({ action: 'CREATE', module: 'inquiries', recordId: inq.id, recordLabel: inq.inquiryNo, field: 'remark', newValue: text, descriptionAr: `ملاحظة على ${inq.inquiryNo}`, descriptionEn: `Remark on ${inq.inquiryNo}` });
}

export async function uploadAttachment(inq: Inquiry, file: File, me: AppUser) {
  const path = `inquiries/${inq.id}/${Date.now()}_${file.name}`;
  const r = sRef(storage, path);
  await uploadBytes(r, file);
  const url = await getDownloadURL(r);
  await addDoc(collection(db, 'inquiries', inq.id, 'attachments'), { name: file.name, url, path, size: file.size, contentType: file.type, by: me.uid, byName: me.nameAr || me.email, at: serverTimestamp() });
  await logActivity({ action: 'CREATE', module: 'inquiries', recordId: inq.id, recordLabel: inq.inquiryNo, field: 'attachment', newValue: file.name, descriptionAr: `رفع مرفق ${file.name} على ${inq.inquiryNo}`, descriptionEn: `Uploaded ${file.name} to ${inq.inquiryNo}` });
}

export async function deleteAttachment(inq: Inquiry, att: { id: string; path: string; name: string }) {
  try { await deleteObject(sRef(storage, att.path)); } catch { /* already gone */ }
  await deleteDoc(doc(db, 'inquiries', inq.id, 'attachments', att.id));
  await logActivity({ action: 'DELETE', module: 'inquiries', recordId: inq.id, recordLabel: inq.inquiryNo, field: 'attachment', oldValue: att.name, descriptionAr: `حذف مرفق ${att.name} من ${inq.inquiryNo}`, descriptionEn: `Deleted ${att.name} from ${inq.inquiryNo}` });
}

/**
 * Deleting an inquiry removes everything that belongs to it — quotations, issues, tasks,
 * extension requests, history, remarks, follow-ups and attachments. Nothing is left to
 * keep showing up on the dashboard. See services/maintenance.ts for the cascade itself.
 */
export async function deleteInquiry(inq: Inquiry, me: AppUser) {
  const { purgeInquiry } = await import('./maintenance');
  return purgeInquiry(inq, me);
}

export async function addFollowUp(inq: Inquiry, data: { channel: string; note: string; result?: string; nextAt?: Date }, seq: number, me: AppUser, settings: GeneralSettings) {
  await addDoc(collection(db, 'inquiries', inq.id, 'followups'), { seq, channel: data.channel, note: data.note, result: data.result || '', nextAt: data.nextAt ? Timestamp.fromDate(data.nextAt) : null, by: me.uid, byName: me.nameAr || me.email, at: serverTimestamp() });
  const patch: Record<string, unknown> = { nextFollowUpAt: data.nextAt ? Timestamp.fromDate(data.nextAt) : null, updatedAt: serverTimestamp() };
  await updateDoc(doc(db, 'inquiries', inq.id), patch);
  await logActivity({ action: 'CREATE', module: 'follow_ups', recordId: inq.id, recordLabel: inq.inquiryNo, newValue: data.note, descriptionAr: `متابعة #${seq} على ${inq.inquiryNo}`, descriptionEn: `Follow-up #${seq} on ${inq.inquiryNo}` });
  if (inq.status === 'SENT_TO_CLIENT') await transition(inq, 'FOLLOW_UP', me, settings);
}

export async function getInquiry(id: string): Promise<Inquiry | null> {
  const s = await getDoc(doc(db, 'inquiries', id));
  return s.exists() ? ({ id: s.id, ...(s.data() as Omit<Inquiry, 'id'>) }) : null;
}
