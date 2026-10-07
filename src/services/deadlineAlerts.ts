import { collection, getDocs, where, query, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { Inquiry, AppUser, GeneralSettings } from '@/types';

/**
 * Check all inquiries for upcoming deadlines (4 hours away)
 * Create notifications for users who are responsible
 * Only create notifications once per inquiry
 */
export async function checkDeadlineAlerts(user: AppUser, settings: GeneralSettings): Promise<number> {
  const now = new Date();
  // Check for deadlines within the next 4 hours (approximately 240 minutes)
  const fourHoursFromNow = new Date(now.getTime() + 4 * 60 * 60 * 1000);

  try {
    // Get all non-deleted inquiries with deadlines
    const snap = await getDocs(collection(db, 'inquiries'));
    const inquiries = snap.docs
      .map(d => ({ id: d.id, ...(d.data() as Omit<Inquiry, 'id'>) }))
      .filter(i => !i.isDeleted && i.deadlineAt);

    let alertCount = 0;

    for (const inq of inquiries) {
      const deadline = inq.deadlineAt?.toDate?.();
      if (!deadline) continue;

      // Check if deadline is within next 4 hours
      const isUpcoming = deadline >= now && deadline <= fourHoursFromNow;
      if (!isUpcoming) continue;

      // Determine who to notify: engineer or sales
      const recipientId = inq.assignedEngineerId || inq.salespersonId;
      if (!recipientId) continue;

      // Only notify the responsible person
      if (recipientId !== user.uid) continue;

      // Check if notification already exists for this inquiry and user
      const existing = await getDocs(
        query(
          collection(db, 'notifications'),
          where('userId', '==', recipientId),
          where('link', '==', `/inquiries/${inq.id}`),
          where('titleEn', '==', 'Deadline alert')
        )
      );

      if (existing.docs.length > 0) continue; // Already notified

      // Create notification
      await addDoc(collection(db, 'notifications'), { type: 'alert',
        userId: recipientId,
        titleAr: 'تنبيه آخر أجل',
        titleEn: 'Deadline alert',
        bodyAr: `${inq.inquiryNo} — الأجل المحدد خلال 4 ساعات`,
        bodyEn: `${inq.inquiryNo} — deadline in ~4 hours`,
        link: `/inquiries/${inq.id}`,
        read: false,
        level: 'warning' as const,
        createdAt: serverTimestamp()
      });

      alertCount++;
    }

    return alertCount;
  } catch (e) {
    console.error('Deadline alert check failed:', e);
    return 0;
  }
}

/**
 * For efficiency, we should run this via Cloud Function
 * But this can be called from client when user logs in
 */
export async function checkAndNotifyDeadlines(user: AppUser, settings: GeneralSettings): Promise<void> {
  try {
    await checkDeadlineAlerts(user, settings);
  } catch (e) {
    console.error('Failed to check deadline alerts:', e);
  }
}
