import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { Issue, Inquiry } from '@/types';

export interface RecurringIssue {
  type: string;
  count: number;
  recent: string[]; // inquiry numbers that had this issue
}

/**
 * Get top 5 recurring issue types across all inquiries
 */
export async function getTopRecurringIssues(): Promise<RecurringIssue[]> {
  try {
    // Get all issues
    const snap = await getDocs(collection(db, 'issues'));
    const issues = snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Issue, 'id'>) }));

    // Get all non-deleted inquiries for reference
    const inqSnap = await getDocs(collection(db, 'inquiries'));
    const inquiries = new Map(
      inqSnap.docs
        .map(d => ({ id: d.id, ...(d.data() as Omit<Inquiry, 'id'>) }))
        .filter(i => !i.isDeleted)
        .map(i => [i.id, i])
    );

    // Group issues by type and count
    const byType = new Map<string, { count: number; inquiries: Set<string> }>();
    issues.forEach(issue => {
      const inq = inquiries.get(issue.inquiryId);
      if (!inq) return; // Skip issues from deleted inquiries

      if (!byType.has(issue.type)) {
        byType.set(issue.type, { count: 0, inquiries: new Set() });
      }
      const entry = byType.get(issue.type)!;
      entry.count++;
      entry.inquiries.add(inq.inquiryNo);
    });

    // Convert to array and sort by count
    return Array.from(byType.entries())
      .map(([type, { count, inquiries }]) => ({
        type,
        count,
        recent: Array.from(inquiries).slice(0, 3) // show 3 most recent
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // top 5 only
  } catch (e) {
    console.error('Failed to get recurring issues:', e);
    return [];
  }
}

/**
 * Find potential duplicate inquiries based on client name and project name
 */
export async function findPotentialDuplicates(clientName: string, projectName?: string): Promise<Inquiry[]> {
  if (!clientName.trim()) return [];

  try {
    const snap = await getDocs(collection(db, 'inquiries'));
    const all = snap.docs
      .map(d => ({ id: d.id, ...(d.data() as Omit<Inquiry, 'id'>) }))
      .filter(i => !i.isDeleted);

    const q = clientName.toLowerCase();
    const pq = projectName?.toLowerCase() || '';

    // Find inquiries with same client name or similar names
    const candidates = all.filter(i => {
      const nameMatch = i.clientName.toLowerCase().includes(q) || q.includes(i.clientName.toLowerCase());
      if (!nameMatch) return false;
      if (!pq || !i.projectName) return true;
      return i.projectName.toLowerCase().includes(pq) || pq.includes(i.projectName.toLowerCase());
    });

    // Return recent ones (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return candidates
      .filter(i => (i.receivedAt?.toDate?.() || new Date()) >= thirtyDaysAgo)
      .sort((a, b) => (b.receivedAt?.toMillis?.() || 0) - (a.receivedAt?.toMillis?.() || 0));
  } catch (e) {
    console.error('Failed to find duplicates:', e);
    return [];
  }
}
