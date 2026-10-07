import { addDoc, collection, doc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { AppUser, GeneralSettings, Inquiry, Quotation } from '@/types';
import { logActivity } from './activityLog';
import { transition } from './inquiries';

export interface QuotationInput {
  /** the reference number produced by the main pricing system */
  quotationNo: string;
  total: number;
  notes?: string;
}

/** keeps inquiry.currentQuotation* in step with the quotation the inquiry points at */
async function mirrorOnInquiry(q: Pick<Quotation, 'id' | 'quotationNo' | 'revision'>, inq: Inquiry, status: Quotation['status'], total?: number) {
  if (inq.currentQuotationId && inq.currentQuotationId !== q.id) return;
  const patch: Record<string, unknown> = {
    currentQuotationId: q.id, currentQuotationNo: q.quotationNo, currentQuotationStatus: status,
    currentQuotationRevision: q.revision, updatedAt: serverTimestamp()
  };
  if (total !== undefined) patch.finalQuotationValue = total;
  await updateDoc(doc(db, 'inquiries', inq.id), patch);
}

export async function createQuotation(inq: Inquiry, data: QuotationInput, me: AppUser, settings: GeneralSettings, revisionOf?: Quotation, reason?: string) {
  const quotationNo = (revisionOf ? revisionOf.quotationNo : data.quotationNo).trim();
  if (!quotationNo) throw new Error('quotation_no_required');
  const revision = revisionOf ? revisionOf.revision + 1 : 0;

  const payload: Record<string, unknown> = {
    quotationNo, inquiryId: inq.id, inquiryNo: inq.inquiryNo, clientName: inq.clientName,
    country: inq.country || settings.defaultCountry || 'SA',
    revision, total: Number(data.total) || 0, currency: settings.currency,
    notes: data.notes || '', status: 'DRAFT',
    createdBy: me.uid, createdByName: me.nameEn || me.nameAr || me.email,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp()
  };
  if (reason) payload.revisionReason = reason;

  const ref = await addDoc(collection(db, 'quotations'), payload);
  if (revisionOf) {
    await updateDoc(doc(db, 'quotations', revisionOf.id), { status: 'SUPERSEDED', updatedAt: serverTimestamp() });
    await addDoc(collection(db, 'quotations', ref.id, 'revisions'), {
      fromRevision: revisionOf.revision, toRevision: revision, previousTotal: revisionOf.total,
      newTotal: Number(data.total) || 0, reason: reason || '', by: me.uid, at: serverTimestamp()
    });
  }
  await mirrorOnInquiry({ id: ref.id, quotationNo, revision }, inq, 'DRAFT', Number(data.total) || 0);
  await logActivity({
    action: 'CREATE', module: 'quotations', recordId: ref.id, recordLabel: `${quotationNo} Rev.${revision}`,
    newValue: Math.round(Number(data.total) || 0),
    descriptionAr: revisionOf ? `مراجعة ${revision} لعرض ${quotationNo} — ${reason || ''}` : `تسجيل عرض سعر ${quotationNo} للاستفسار ${inq.inquiryNo}`,
    descriptionEn: revisionOf ? `Revision ${revision} of ${quotationNo} — ${reason || ''}` : `Registered quotation ${quotationNo} for ${inq.inquiryNo}`
  });
  if (inq.status === 'PROCESSING') await transition(inq, 'COSTING', me, settings);
  else if (inq.status === 'COSTING') await transition(inq, 'QUOTATION_PREP', me, settings);
  return ref.id;
}

export async function updateQuotation(q: Quotation, data: QuotationInput, inq: Inquiry, me: AppUser) {
  await updateDoc(doc(db, 'quotations', q.id), {
    quotationNo: data.quotationNo.trim(), total: Number(data.total) || 0, notes: data.notes || '', updatedAt: serverTimestamp()
  });
  await mirrorOnInquiry({ ...q, quotationNo: data.quotationNo.trim() }, inq, q.status, Number(data.total) || 0);
  await logActivity({
    action: 'UPDATE', module: 'quotations', recordId: q.id, recordLabel: q.quotationNo,
    oldValue: q.total, newValue: Number(data.total) || 0,
    descriptionAr: `تعديل عرض السعر ${q.quotationNo}`, descriptionEn: `Updated quotation ${q.quotationNo}`
  });
}

/** Everyone who is allowed to approve — the submit dialog picks from this list. */
export async function listApprovers(): Promise<{ uid: string; name: string; roleId: string }[]> {
  const snap = await getDocs(query(collection(db, 'users'), where('effectivePermissions', 'array-contains', 'quotations.approve')));
  return snap.docs
    .filter(d => d.data().status === 'active')
    .map(d => ({ uid: d.id, name: d.data().nameEn || d.data().nameAr || d.data().email, roleId: d.data().roleId }));
}

/**
 * Raise the quotation for approval. It goes to the System Admin by default; the submitter may add
 * the Department Manager (or anyone else who can approve) when he has `quotations.choose_approver`.
 */
export async function submitForApproval(q: Quotation, inq: Inquiry, me: AppUser, settings: GeneralSettings, approvers: { uid: string; name: string }[]) {
  const targets = approvers.length ? approvers : (await listApprovers()).map(a => ({ uid: a.uid, name: a.name }));
  await updateDoc(doc(db, 'quotations', q.id), {
    status: 'UNDER_REVIEW', submittedAt: serverTimestamp(),
    approverIds: targets.map(a => a.uid), approverNames: targets.map(a => a.name),
    updatedAt: serverTimestamp()
  });
  await mirrorOnInquiry(q, inq, 'UNDER_REVIEW');
  await logActivity({
    action: 'UPDATE', module: 'quotations', recordId: q.id, recordLabel: q.quotationNo, field: 'status',
    oldValue: q.status, newValue: 'UNDER_REVIEW',
    descriptionAr: `رفع ${q.quotationNo} للاعتماد إلى: ${targets.map(a => a.name).join('، ')}`,
    descriptionEn: `${q.quotationNo} submitted for approval to: ${targets.map(a => a.name).join(', ')}`
  });

  const from = inq.status;
  if (['QUOTATION_PREP', 'REVISION_REQUIRED', 'CLIENT_REVISION', 'COSTING'].includes(from)) {
    if (from === 'COSTING') await transition(inq, 'QUOTATION_PREP', me, settings);
    await transition({ ...inq, status: from === 'COSTING' ? 'QUOTATION_PREP' : from }, 'UNDER_REVIEW', me, settings);
  }

  await Promise.all(targets.map(a => addDoc(collection(db, 'notifications'), { type: 'alert',
    userId: a.uid, titleAr: 'عرض سعر ينتظر اعتمادك', titleEn: 'Quotation awaiting your approval',
    bodyAr: `${q.quotationNo} — ${q.clientName}`, bodyEn: `${q.quotationNo} — ${q.clientName}`,
    link: `/inquiries/${inq.id}?tab=quotations`, read: false, level: 'warning', createdAt: serverTimestamp()
  })));
}

export async function reviewQuotation(q: Quotation, inq: Inquiry, decision: 'APPROVED' | 'REVISION_REQUIRED' | 'REJECTED', remark: string, me: AppUser, settings: GeneralSettings) {
  if (decision !== 'APPROVED' && !remark.trim()) throw new Error('note_required');
  await updateDoc(doc(db, 'quotations', q.id), {
    status: decision, reviewRemark: remark, reviewedBy: me.uid, reviewedByName: me.nameEn || me.nameAr || me.email,
    reviewedAt: serverTimestamp(), updatedAt: serverTimestamp()
  });
  await mirrorOnInquiry(q, inq, decision);
  await logActivity({
    action: decision === 'APPROVED' ? 'APPROVE' : 'REJECT', module: 'quotations', recordId: q.id, recordLabel: q.quotationNo,
    field: 'status', oldValue: q.status, newValue: decision,
    descriptionAr: `${decision === 'APPROVED' ? 'اعتماد' : decision === 'REJECTED' ? 'رفض' : 'إرجاع للتعديل'} ${q.quotationNo}${remark ? ' — ' + remark : ''}`,
    descriptionEn: `${q.quotationNo} ${decision}${remark ? ' — ' + remark : ''}`
  });
  if (inq.status === 'UNDER_REVIEW') {
    if (decision === 'APPROVED') await transition(inq, 'APPROVED', me, settings, { note: remark });
    else if (decision === 'REVISION_REQUIRED') await transition(inq, 'REVISION_REQUIRED', me, settings, { note: remark });
    else await transition(inq, 'NO_BID', me, settings, { note: remark });
  }
  const targets = [q.createdBy, inq.salespersonId].filter(Boolean);
  await Promise.all(targets.map(uid => addDoc(collection(db, 'notifications'), { type: 'alert',
    userId: uid,
    titleAr: decision === 'APPROVED' ? 'تم اعتماد عرض السعر' : decision === 'REJECTED' ? 'تم رفض عرض السعر' : 'عرض السعر أُرجع للتعديل',
    titleEn: decision === 'APPROVED' ? 'Quotation approved' : decision === 'REJECTED' ? 'Quotation rejected' : 'Quotation returned for revision',
    bodyAr: `${q.quotationNo}${remark ? ' — ' + remark : ''}`, bodyEn: `${q.quotationNo}${remark ? ' — ' + remark : ''}`,
    link: `/inquiries/${inq.id}?tab=quotations`, read: false, level: decision === 'APPROVED' ? 'success' : 'warning', createdAt: serverTimestamp()
  })));
}

export async function sendToSales(q: Quotation, inq: Inquiry, me: AppUser, settings: GeneralSettings) {
  await updateDoc(doc(db, 'quotations', q.id), { status: 'SENT_TO_SALES', sentToSalesAt: serverTimestamp(), sentToSalesBy: me.uid, updatedAt: serverTimestamp() });
  await mirrorOnInquiry(q, inq, 'SENT_TO_SALES');
  await logActivity({ action: 'UPDATE', module: 'quotations', recordId: q.id, recordLabel: q.quotationNo, field: 'status', oldValue: q.status, newValue: 'SENT_TO_SALES', descriptionAr: `إرسال ${q.quotationNo} للمسوق ${inq.salespersonName}`, descriptionEn: `${q.quotationNo} sent to ${inq.salespersonName}` });
  if (inq.status === 'APPROVED') await transition(inq, 'SENT_TO_SALES', me, settings);
  await addDoc(collection(db, 'notifications'), { type: 'alert', userId: inq.salespersonId, titleAr: 'عرض معتمد جاهز للإرسال للعميل', titleEn: 'Approved quotation ready to send', bodyAr: `${q.quotationNo} — ${q.clientName}`, bodyEn: `${q.quotationNo} — ${q.clientName}`, link: `/inquiries/${inq.id}?tab=quotations`, read: false, level: 'success', createdAt: serverTimestamp() });
}

export async function sendToClient(q: Quotation, inq: Inquiry, channel: string, me: AppUser, settings: GeneralSettings) {
  await updateDoc(doc(db, 'quotations', q.id), { status: 'SENT_TO_CLIENT', sentToClientAt: serverTimestamp(), sentToClientBy: me.uid, sentToClientChannel: channel, updatedAt: serverTimestamp() });
  await mirrorOnInquiry(q, inq, 'SENT_TO_CLIENT');
  await logActivity({ action: 'UPDATE', module: 'quotations', recordId: q.id, recordLabel: q.quotationNo, field: 'status', oldValue: q.status, newValue: 'SENT_TO_CLIENT', descriptionAr: `إرسال ${q.quotationNo} للعميل عبر ${channel}`, descriptionEn: `${q.quotationNo} sent to client via ${channel}` });
  if (inq.status === 'SENT_TO_SALES') await transition(inq, 'SENT_TO_CLIENT', me, settings);
}
