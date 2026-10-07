import { addDoc, collection, deleteDoc, doc, serverTimestamp, Timestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { AppUser, CountryCode, GeneralSettings, Priority, WorkTask } from '@/types';
import { logActivity } from './activityLog';
import { workingMinutesBetween } from '@/utils/sla';

export interface NewTaskInput {
  title: string;
  description?: string;
  assignedTo: string;
  assignedToName: string;
  priority: Priority;
  dueAt?: Date;
  inquiryId?: string;
  inquiryNo?: string;
  country?: CountryCode;
  /** set when this task is one copy of a multi-engineer assignment */
  groupId?: string;
}

/** Sends the assignee an in-app message so the task shows up on their bell immediately. */
async function notify(uid: string, titleAr: string, titleEn: string, bodyAr: string, bodyEn: string, level: 'info' | 'warning' | 'success' = 'info') {
  await addDoc(collection(db, 'notifications'), { type: 'alert',
    userId: uid, titleAr, titleEn, bodyAr, bodyEn, link: '/tasks', read: false, level, createdAt: serverTimestamp()
  });
}

/** A manager hands a task to one person. */
export async function createTask(input: NewTaskInput, me: AppUser) {
  const data: Record<string, unknown> = {
    title: input.title.trim(),
    description: input.description?.trim() || '',
    assignedTo: input.assignedTo,
    assignedToName: input.assignedToName,
    assignedBy: me.uid,
    assignedByName: me.nameEn || me.nameAr || me.email,
    priority: input.priority,
    status: 'OPEN',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  if (input.dueAt) data.dueAt = Timestamp.fromDate(input.dueAt);
  if (input.inquiryId) { data.inquiryId = input.inquiryId; data.inquiryNo = input.inquiryNo || ''; }
  if (input.country) data.country = input.country;
  if (input.groupId) data.groupId = input.groupId;

  const ref = await addDoc(collection(db, 'tasks'), data);
  await notify(
    input.assignedTo,
    'مهمة جديدة مسندة إليك', 'A new task was assigned to you',
    `${input.title}${input.inquiryNo ? ` — ${input.inquiryNo}` : ''}`,
    `${input.title}${input.inquiryNo ? ` — ${input.inquiryNo}` : ''}`,
    'info'
  );
  await logActivity({
    action: 'ASSIGN', module: 'tasks', recordId: ref.id, recordLabel: input.title,
    newValue: input.assignedToName,
    descriptionAr: `إسناد مهمة "${input.title}" إلى ${input.assignedToName}`,
    descriptionEn: `Task "${input.title}" assigned to ${input.assignedToName}`
  });
  return ref.id;
}

/**
 * Assigns the same task to several engineers at once: every engineer gets his
 * own copy (own notification, own receipt time, own work timer — so lateness
 * is tracked per person), and the copies are linked with a shared groupId.
 */
export async function createTaskForMany(
  base: Omit<NewTaskInput, 'assignedTo' | 'assignedToName' | 'groupId'>,
  assignees: { uid: string; name: string }[],
  me: AppUser
): Promise<string[]> {
  const groupId = assignees.length > 1 ? `grp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}` : undefined;
  const ids: string[] = [];
  for (const a of assignees) {
    ids.push(await createTask({ ...base, assignedTo: a.uid, assignedToName: a.name, groupId }, me));
  }
  return ids;
}

/** The assignee confirms he started — this is what stops the task from sitting unread. */
export async function startTask(task: WorkTask, me: AppUser, settings: GeneralSettings) {
  if (task.status !== 'OPEN') return;
  const now = new Date();
  const assignedAt = task.createdAt?.toDate?.() || now;
  await updateDoc(doc(db, 'tasks', task.id), {
    status: 'IN_PROGRESS', startedAt: serverTimestamp(),
    pickupMin: workingMinutesBetween(assignedAt, now, settings),
    updatedAt: serverTimestamp()
  });
  await notify(task.assignedBy, 'بدأ العمل على المهمة', 'Task started', `${task.assignedToName}: ${task.title}`, `${task.assignedToName}: ${task.title}`, 'info');
  await logActivity({
    action: 'STATUS_CHANGE', module: 'tasks', recordId: task.id, recordLabel: task.title, field: 'status', oldValue: task.status, newValue: 'IN_PROGRESS',
    descriptionAr: `بدء العمل على المهمة "${task.title}" — ${me.nameAr || me.email}`,
    descriptionEn: `Started task "${task.title}" — ${me.nameEn || me.email}`
  });
}

export async function completeTask(task: WorkTask, note: string, me: AppUser) {
  await updateDoc(doc(db, 'tasks', task.id), {
    status: 'DONE', completedAt: serverTimestamp(), resultNote: note || '', updatedAt: serverTimestamp()
  });
  await notify(task.assignedBy, 'تم إنجاز المهمة', 'Task completed', `${task.assignedToName}: ${task.title}`, `${task.assignedToName}: ${task.title}`, 'success');
  await logActivity({
    action: 'STATUS_CHANGE', module: 'tasks', recordId: task.id, recordLabel: task.title, field: 'status', oldValue: task.status, newValue: 'DONE',
    descriptionAr: `إنجاز المهمة "${task.title}" — ${me.nameAr || me.email}${note ? ' — ' + note : ''}`,
    descriptionEn: `Completed task "${task.title}" — ${me.nameEn || me.email}${note ? ' — ' + note : ''}`
  });
}

export async function cancelTask(task: WorkTask, reason: string, me: AppUser) {
  await updateDoc(doc(db, 'tasks', task.id), { status: 'CANCELLED', resultNote: reason || '', updatedAt: serverTimestamp() });
  if (task.assignedTo !== me.uid) await notify(task.assignedTo, 'أُلغيت المهمة', 'Task cancelled', task.title, task.title, 'warning');
  await logActivity({
    action: 'STATUS_CHANGE', module: 'tasks', recordId: task.id, recordLabel: task.title, field: 'status', oldValue: task.status, newValue: 'CANCELLED',
    descriptionAr: `إلغاء المهمة "${task.title}"${reason ? ' — ' + reason : ''}`,
    descriptionEn: `Cancelled task "${task.title}"${reason ? ' — ' + reason : ''}`
  });
}

/** Hand the task to somebody else without losing its history. */
export async function reassignTask(task: WorkTask, toUid: string, toName: string, me: AppUser) {
  await updateDoc(doc(db, 'tasks', task.id), { assignedTo: toUid, assignedToName: toName, status: 'OPEN', startedAt: null, updatedAt: serverTimestamp() });
  await notify(toUid, 'مهمة جديدة مسندة إليك', 'A new task was assigned to you', task.title, task.title, 'info');
  await logActivity({
    action: 'ASSIGN', module: 'tasks', recordId: task.id, recordLabel: task.title, field: 'assignedTo', oldValue: task.assignedToName, newValue: toName,
    descriptionAr: `إعادة إسناد المهمة "${task.title}" من ${task.assignedToName} إلى ${toName}`,
    descriptionEn: `Reassigned task "${task.title}" from ${task.assignedToName} to ${toName}`
  });
}

export async function deleteTask(task: WorkTask) {
  await deleteDoc(doc(db, 'tasks', task.id));
  await logActivity({
    action: 'DELETE', module: 'tasks', recordId: task.id, recordLabel: task.title,
    descriptionAr: `حذف المهمة "${task.title}"`, descriptionEn: `Deleted task "${task.title}"`
  });
}
