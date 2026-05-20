/** Notifications backend calls.
 *
 * Note: the backend endpoint does not exist yet — `fetchNotifications`
 * resolves to an empty list on 404 so the UI renders cleanly until the
 * server side is implemented in a follow-up issue.
 */

import { ApiError, apiRequest } from '@/lib/api';

export type Notification = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  unread: boolean;
};

type NotificationRaw = {
  id: string | number;
  title: string;
  body: string;
  created_at: string;
  unread: boolean;
};

function mapNotification(r: NotificationRaw): Notification {
  return {
    id: String(r.id),
    title: r.title,
    body: r.body,
    createdAt: r.created_at,
    unread: r.unread,
  };
}

export async function fetchNotifications(userId: number): Promise<Notification[]> {
  try {
    const r = await apiRequest<{ notifications: NotificationRaw[] }>(
      `/notifications?user_id=${userId}`,
    );
    return r.notifications.map(mapNotification);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return [];
    throw e;
  }
}
