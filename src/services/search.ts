import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { Inquiry, WorkTask } from '@/types';

export interface SearchResult {
  id: string;
  type: 'inquiry' | 'task';
  title: string;
  subtitle?: string;
  link: string;
  timestamp?: Date;
}

/**
 * Global search across inquiries and tasks
 * Returns combined results limited to 10 total
 */
export async function globalSearch(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];

  const q = query.toLowerCase();
  const results: SearchResult[] = [];

  // Search inquiries by number, client name, or project name
  try {
    const snap = await getDocs(collection(db, 'inquiries'));
    const inquiries = snap.docs
      .map(d => ({ id: d.id, ...(d.data() as Omit<Inquiry, 'id'>) }))
      .filter(i => !i.isDeleted)
      .filter(i =>
        i.inquiryNo.toLowerCase().includes(q) ||
        i.clientName.toLowerCase().includes(q) ||
        (i.projectName || '').toLowerCase().includes(q)
      )
      .slice(0, 8);

    results.push(
      ...inquiries.map(i => ({
        id: i.id,
        type: 'inquiry' as const,
        title: `${i.inquiryNo} — ${i.clientName}`,
        subtitle: i.projectName || undefined,
        link: `/inquiries/${i.id}`,
        timestamp: i.receivedAt?.toDate?.()
      }))
    );
  } catch (e) {
    console.error('Search inquiries error:', e);
  }

  // Search tasks by title or description
  if (results.length < 10) {
    try {
      const snap = await getDocs(collection(db, 'tasks'));
      const tasks = snap.docs
        .map(d => ({ id: d.id, ...(d.data() as Omit<WorkTask, 'id'>) }))
        .filter(t =>
          t.title.toLowerCase().includes(q) ||
          (t.description || '').toLowerCase().includes(q)
        )
        .slice(0, Math.max(2, 10 - results.length));

      results.push(
        ...tasks.map(t => ({
          id: t.id,
          type: 'task' as const,
          title: t.title,
          subtitle: t.description ? t.description.substring(0, 50) : undefined,
          link: '/tasks',
          timestamp: t.createdAt?.toDate?.()
        }))
      );
    } catch (e) {
      console.error('Search tasks error:', e);
    }
  }

  return results.sort((a, b) => (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0));
}
