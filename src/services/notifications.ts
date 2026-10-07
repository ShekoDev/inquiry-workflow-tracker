import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  Timestamp,
  orderBy
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { AppNotification, AppUser } from '@/types';

/**
 * Create a broadcast message from system admin to users
 */
export async function createBroadcast(
  title: { ar: string; en: string },
  body: { ar: string; en: string },
  recipientIds: string[],
  sender?: { uid: string; name: string },
  expiresAt?: Timestamp
): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'notifications'), {
      type: 'broadcast',
      titleAr: title.ar,
      titleEn: title.en,
      bodyAr: body.ar,
      bodyEn: body.en,
      recipients: recipientIds,
      read: false,
      level: 'info',
      createdAt: serverTimestamp(),
      expiresAt: expiresAt || null,
      readBy: {},
      deletedBy: {},
      sentBy: sender?.uid || '',
      sentByName: sender?.name || '',
      userId: 'system' // Use 'system' for broadcast messages
    } as unknown as Omit<AppNotification, 'id'>);

    return docRef.id;
  } catch (e) {
    console.error('Failed to create broadcast:', e);
    throw e;
  }
}

/**
 * Mark a notification as read by a user.
 * Uses dot-path updates so one user's receipt never overwrites another's.
 * For personal (non-broadcast) notifications the global `read` flag is also set.
 */
export async function markAsRead(notificationId: string, userId: string, isPersonal = false): Promise<void> {
  try {
    const notifRef = doc(db, 'notifications', notificationId);
    const patch: Record<string, unknown> = { [`readBy.${userId}`]: Timestamp.now() };
    if (isPersonal) patch.read = true;
    await updateDoc(notifRef, patch);
  } catch (e) {
    console.error('Failed to mark notification as read:', e);
  }
}

/**
 * Soft delete a notification for a user (dot-path update keeps other users' entries)
 */
export async function deleteNotification(notificationId: string, userId: string): Promise<void> {
  try {
    const notifRef = doc(db, 'notifications', notificationId);
    await updateDoc(notifRef, { [`deletedBy.${userId}`]: Timestamp.now() });
  } catch (e) {
    console.error('Failed to delete notification:', e);
  }
}

/**
 * Get notifications for a user with optional category filter
 * Handles both regular notifications and broadcast messages
 */
export async function getUserNotifications(
  userId: string,
  category?: 'today' | 'week' | 'urgent'
): Promise<AppNotification[]> {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get user's notifications + broadcasts they're targeted in.
    // Each query is independent: if one fails (e.g. security rules not yet
    // deployed for broadcasts) the other still returns its results.
    let personalDocs: AppNotification[] = [];
    let broadcastDocs: AppNotification[] = [];

    try {
      const userNotifs = await getDocs(
        query(
          collection(db, 'notifications'),
          where('userId', '==', userId),
          orderBy('createdAt', 'desc')
        )
      );
      personalDocs = userNotifs.docs.map(d => ({ id: d.id, ...d.data() } as AppNotification));
    } catch (e) {
      console.error('Failed to load personal notifications:', e);
    }

    try {
      // Single-clause query: only broadcasts carry `recipients`, so no composite index is needed
      const broadcasts = await getDocs(
        query(
          collection(db, 'notifications'),
          where('type', '==', 'broadcast'),
          where('recipients', 'array-contains', userId)
        )
      );
      broadcastDocs = broadcasts.docs.map(d => ({ id: d.id, ...d.data() } as AppNotification));
    } catch (e) {
      console.error('Failed to load broadcasts (check firestore.rules deployment):', e);
    }

    let notifications: AppNotification[] = [...personalDocs, ...broadcastDocs];

    // Remove duplicates
    const seen = new Set<string>();
    notifications = notifications.filter(n => {
      if (seen.has(n.id)) return false;
      seen.add(n.id);
      return true;
    });

    // Remove soft-deleted notifications for this user
    notifications = notifications.filter(n => !n.deletedBy?.[userId]);

    // Remove expired notifications
    notifications = notifications.filter(n => {
      if (!n.expiresAt) return true;
      return n.expiresAt.toDate() > now;
    });

    // Filter by category if specified
    if (category) {
      notifications = notifications.filter(n => {
        const createdDate = n.createdAt.toDate();

        if (category === 'today') {
          return createdDate >= todayStart && createdDate < new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
        } else if (category === 'week') {
          return createdDate >= weekStart;
        } else if (category === 'urgent') {
          return n.level === 'danger' || n.level === 'warning';
        }
        return true;
      });
    }

    return notifications.sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime());
  } catch (e) {
    console.error('Failed to get user notifications:', e);
    return [];
  }
}

/**
 * Get broadcast analytics: who read it and who didn't
 */
export async function getBroadcastAnalytics(broadcastId: string, allUsers: AppUser[]) {
  try {
    const snap = await getDoc(doc(db, 'notifications', broadcastId));
    const broadcast = snap.exists() ? (snap.data() as AppNotification) : undefined;

    if (!broadcast) return null;

    const recipients = broadcast.recipients || [];
    const readBy = (broadcast.readBy || {}) as Record<string, Timestamp>;
    const deletedBy = (broadcast.deletedBy || {}) as Record<string, Timestamp>;

    const stats = {
      totalRecipients: recipients.length,
      read: recipients.filter(id => readBy[id]).length,
      unread: recipients.filter(id => !readBy[id]).length,
      deleted: Object.keys(deletedBy).length,
      details: recipients.map(userId => {
        const user = allUsers.find(u => u.uid === userId);
        return {
          userId,
          userName: user?.nameEn || 'Unknown',
          userNameAr: user?.nameAr || user?.nameEn || 'غير معروف',
          email: user?.email || '',
          read: !!readBy[userId],
          readAt: readBy[userId],
          deleted: !!deletedBy[userId],
          deletedAt: deletedBy[userId]
        };
      })
    };

    return stats;
  } catch (e) {
    console.error('Failed to get broadcast analytics:', e);
    return null;
  }
}

/**
 * Get count of unread notifications for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  try {
    let userDocs: any[] = [];
    let broadcastDocs: any[] = [];
    try {
      const userNotifs = await getDocs(
        query(
          collection(db, 'notifications'),
          where('userId', '==', userId),
          where('read', '==', false)
        )
      );
      userDocs = userNotifs.docs;
    } catch (e) {
      console.error('Failed to count personal notifications:', e);
    }
    try {
      const broadcasts = await getDocs(
        query(
          collection(db, 'notifications'),
          where('type', '==', 'broadcast'),
          where('recipients', 'array-contains', userId)
        )
      );
      broadcastDocs = broadcasts.docs;
    } catch (e) {
      console.error('Failed to count broadcasts:', e);
    }

    const allNotifs = [...userDocs, ...broadcastDocs];
    let count = 0;

    for (const d of allNotifs) {
      const notif = d.data() as AppNotification;
      const isDeleted = notif.deletedBy?.[userId];
      const isExpired = notif.expiresAt && notif.expiresAt.toDate() < new Date();
      if (isDeleted || isExpired) continue;
      // broadcasts: per-user receipt; personal: global read flag
      const isRead = notif.type === 'broadcast' ? !!notif.readBy?.[userId] : (notif.read || !!notif.readBy?.[userId]);
      if (!isRead) count++;
    }

    return count;
  } catch (e) {
    console.error('Failed to get unread count:', e);
    return 0;
  }
}

/**
 * Broadcasts targeted at this user that they have not yet acknowledged.
 * Used by the on-login popup ("استلام" flow).
 */
export async function getPendingBroadcasts(userId: string): Promise<AppNotification[]> {
  try {
    const snap = await getDocs(
      query(
        collection(db, 'notifications'),
        where('type', '==', 'broadcast'),
        where('recipients', 'array-contains', userId)
      )
    );
    const now = new Date();
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() } as AppNotification))
      .filter(n => !n.readBy?.[userId] && !n.deletedBy?.[userId] && (!n.expiresAt || n.expiresAt.toDate() > now))
      .sort((a, b) => (b.createdAt?.toDate?.().getTime?.() || 0) - (a.createdAt?.toDate?.().getTime?.() || 0));
  } catch (e) {
    console.error('Failed to get pending broadcasts:', e);
    return [];
  }
}

/**
 * Categorize notifications for display
 */
export function categorizeNotifications(
  notifications: AppNotification[]
): Record<'today' | 'week' | 'older', AppNotification[]> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const result: Record<'today' | 'week' | 'older', AppNotification[]> = {
    today: [],
    week: [],
    older: []
  };

  for (const notif of notifications) {
    const createdDate = notif.createdAt.toDate();

    if (createdDate >= todayStart) {
      result.today.push(notif);
    } else if (createdDate >= weekStart) {
      result.week.push(notif);
    } else {
      result.older.push(notif);
    }
  }

  return result;
}
