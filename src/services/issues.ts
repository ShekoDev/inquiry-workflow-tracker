import { addDoc, collection, deleteDoc, doc, increment, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { AppUser, CountryCode, Inquiry, Issue, IssueSeverity, IssueType } from '@/types';
import { logActivity } from './activityLog';

export const ISSUE_TYPES: IssueType[] = [
  'missing_info', 'client_delay', 'unclear_drawings', 'site_visit_needed',
  'internal_delay', 'engineer_overload', 'approval_delay', 'pricing_delay',
  'wrong_data', 'scope_change', 'other'
];

export const ISSUE_SEVERITIES: IssueSeverity[] = ['LOW', 'MEDIUM', 'HIGH'];

export const SEVERITY_COLORS: Record<IssueSeverity, string> = { LOW: '#22C55E', MEDIUM: '#F59E0B', HIGH: '#DC2626' };

export interface NewIssueInput {
  type: IssueType;
  severity: IssueSeverity;
  description: string;
  responsibleId?: string;
  responsibleName?: string;
  lostMin?: number;
  country?: CountryCode;
}

export async function createIssue(inq: Inquiry, input: NewIssueInput, me: AppUser) {
  const data: Record<string, unknown> = {
    inquiryId: inq.id, inquiryNo: inq.inquiryNo,
    country: input.country || inq.country || null,
    type: input.type, severity: input.severity,
    description: input.description.trim(),
    status: 'OPEN',
    createdBy: me.uid, createdByName: me.nameEn || me.nameAr || me.email,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp()
  };
  if (input.responsibleId) { data.responsibleId = input.responsibleId; data.responsibleName = input.responsibleName || ''; }
  if (input.lostMin !== undefined) data.lostMin = input.lostMin;

  const ref = await addDoc(collection(db, 'issues'), data);
  // keep a counter on the inquiry so lists can show "3 مشاكل" without a second query
  await updateDoc(doc(db, 'inquiries', inq.id), {
    issueCount: increment(1), openIssueCount: increment(1), updatedAt: serverTimestamp()
  });
  await logActivity({
    action: 'CREATE', module: 'issues', recordId: ref.id, recordLabel: inq.inquiryNo, field: input.type,
    newValue: input.description,
    descriptionAr: `تسجيل مشكلة على ${inq.inquiryNo}: ${input.description}`,
    descriptionEn: `Issue logged on ${inq.inquiryNo}: ${input.description}`
  });
  return ref.id;
}

export async function resolveIssue(issue: Issue, resolution: string, me: AppUser) {
  await updateDoc(doc(db, 'issues', issue.id), {
    status: 'RESOLVED', resolution: resolution || '', resolvedAt: serverTimestamp(),
    resolvedBy: me.uid, resolvedByName: me.nameEn || me.nameAr || me.email, updatedAt: serverTimestamp()
  });
  await updateDoc(doc(db, 'inquiries', issue.inquiryId), { openIssueCount: increment(-1), updatedAt: serverTimestamp() });
  await logActivity({
    action: 'UPDATE', module: 'issues', recordId: issue.id, recordLabel: issue.inquiryNo, field: 'status',
    oldValue: 'OPEN', newValue: 'RESOLVED',
    descriptionAr: `حل مشكلة على ${issue.inquiryNo}${resolution ? ' — ' + resolution : ''}`,
    descriptionEn: `Issue resolved on ${issue.inquiryNo}${resolution ? ' — ' + resolution : ''}`
  });
}

export async function updateIssue(issue: Issue, patch: Partial<Issue>) {
  await updateDoc(doc(db, 'issues', issue.id), { ...patch, updatedAt: serverTimestamp() });
  await logActivity({
    action: 'UPDATE', module: 'issues', recordId: issue.id, recordLabel: issue.inquiryNo,
    descriptionAr: `تعديل مشكلة على ${issue.inquiryNo}`, descriptionEn: `Issue updated on ${issue.inquiryNo}`
  });
}

export async function deleteIssue(issue: Issue) {
  await deleteDoc(doc(db, 'issues', issue.id));
  await updateDoc(doc(db, 'inquiries', issue.inquiryId), {
    issueCount: increment(-1), ...(issue.status === 'OPEN' ? { openIssueCount: increment(-1) } : {}), updatedAt: serverTimestamp()
  });
  await logActivity({
    action: 'DELETE', module: 'issues', recordId: issue.id, recordLabel: issue.inquiryNo,
    descriptionAr: `حذف مشكلة من ${issue.inquiryNo}`, descriptionEn: `Issue deleted from ${issue.inquiryNo}`
  });
}
