import { addDoc, collection, doc, getDocs, query, serverTimestamp, Timestamp, updateDoc, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { AppUser, ExtensionRequest, Inquiry } from '@/types';
import { logActivity } from './activityLog';

export async function requestExtension(inq: Inquiry, requestedDeadline: Date, reason: string, me: AppUser) {
  if (!inq.deadlineAt) throw new Error('no_deadline');
  const ref = await addDoc(collection(db, 'extension_requests'), {
    inquiryId: inq.id, inquiryNo: inq.inquiryNo, currentDeadline: inq.deadlineAt, requestedDeadline: Timestamp.fromDate(requestedDeadline),
    reason, status: 'PENDING', requestedBy: me.uid, requestedByName: me.nameAr || me.email, requestedAt: serverTimestamp()
  });
  await logActivity({ action: 'CREATE', module: 'extensions', recordId: ref.id, recordLabel: inq.inquiryNo, oldValue: inq.deadlineAt.toDate().toISOString(), newValue: requestedDeadline.toISOString(), descriptionAr: `طلب تمديد ${inq.inquiryNo} — ${reason}`, descriptionEn: `Extension requested for ${inq.inquiryNo} — ${reason}` });
  const approvers = await getDocs(query(collection(db, 'users'), where('effectivePermissions', 'array-contains', 'extensions.approve')));
  await Promise.all(approvers.docs.filter(d => d.data().status === 'active').map(d => addDoc(collection(db, 'notifications'), { type: 'alert',
    userId: d.id, titleAr: 'طلب تمديد ينتظر موافقتك', titleEn: 'Extension request awaiting approval', bodyAr: `${inq.inquiryNo} — ${reason}`, bodyEn: `${inq.inquiryNo} — ${reason}`,
    link: '/extensions', read: false, level: 'warning', createdAt: serverTimestamp()
  })));
}

export async function decideExtension(req: ExtensionRequest, decision: 'APPROVED' | 'REJECTED', note: string, me: AppUser, approvedDeadline?: Date) {
  const finalDeadline = decision === 'APPROVED' ? (approvedDeadline || req.requestedDeadline.toDate()) : undefined;
  await updateDoc(doc(db, 'extension_requests', req.id), {
    status: decision, decidedBy: me.uid, decidedByName: me.nameAr || me.email, decidedAt: serverTimestamp(), decisionNote: note,
    ...(finalDeadline ? { approvedDeadline: Timestamp.fromDate(finalDeadline) } : {})
  });
  if (finalDeadline) {
    await updateDoc(doc(db, 'inquiries', req.inquiryId), { deadlineAt: Timestamp.fromDate(finalDeadline), updatedAt: serverTimestamp() });
    await addDoc(collection(db, 'inquiries', req.inquiryId, 'history'), { to: 'EXTENSION', by: me.uid, byName: me.nameAr || me.email, at: serverTimestamp(), note: `DEADLINE → ${finalDeadline.toISOString()} (${note})` });
  }
  await logActivity({
    action: decision === 'APPROVED' ? 'APPROVE' : 'REJECT', module: 'extensions', recordId: req.id, recordLabel: req.inquiryNo, field: 'deadlineAt',
    oldValue: req.currentDeadline.toDate().toISOString(), newValue: finalDeadline?.toISOString(),
    descriptionAr: `${decision === 'APPROVED' ? 'موافقة على' : 'رفض'} تمديد ${req.inquiryNo}${note ? ' — ' + note : ''}`,
    descriptionEn: `Extension for ${req.inquiryNo} ${decision}${note ? ' — ' + note : ''}`
  });
  await addDoc(collection(db, 'notifications'), { type: 'alert',
    userId: req.requestedBy, titleAr: decision === 'APPROVED' ? 'تمت الموافقة على طلب التمديد' : 'تم رفض طلب التمديد', titleEn: decision === 'APPROVED' ? 'Extension approved' : 'Extension rejected',
    bodyAr: `${req.inquiryNo}${note ? ' — ' + note : ''}`, bodyEn: `${req.inquiryNo}${note ? ' — ' + note : ''}`, link: `/inquiries/${req.inquiryId}`, read: false, level: decision === 'APPROVED' ? 'success' : 'danger', createdAt: serverTimestamp()
  });
}
