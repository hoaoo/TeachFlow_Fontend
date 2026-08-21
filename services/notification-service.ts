import { api } from './api-client';

export type NotificationType =
  | 'ASSIGNMENT'
  | 'ENROLLMENT'
  | 'TASK'
  | 'ASSESSMENT'
  | 'HOMEROOM'
  | 'SYSTEM';

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  link?: string | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

export interface NotificationQueryParams {
  type?: NotificationType;
  isRead?: boolean;
  page?: number;
  pageSize?: number;
}

export interface PaginatedNotifications {
  items: AppNotification[];
  totalItems: number;
  totalPages: number;
  page: number;
  pageSize: number;
  unreadCount: number;
}

export async function getNotifications(params?: NotificationQueryParams): Promise<PaginatedNotifications> {
  const query = new URLSearchParams();
  if (params?.type) query.append('type', params.type);
  if (params?.isRead !== undefined) query.append('isRead', String(params.isRead));
  if (params?.page) query.append('page', String(params.page));
  if (params?.pageSize) query.append('pageSize', String(params.pageSize));

  const qs = query.toString();
  const url = qs ? `/notifications?${qs}` : '/notifications';

  return api.get<PaginatedNotifications>(url);
}

export async function getUnreadCount(): Promise<number> {
  try {
    const res = await api.get<{ count: number }>('/notifications/unread-count');
    return res.count || 0;
  } catch {
    return 0;
  }
}

export async function markNotificationAsRead(id: string): Promise<AppNotification> {
  return api.patch<AppNotification>(`/notifications/${id}/read`, {});
}

export async function markAllNotificationsAsRead(): Promise<{ success: boolean; updatedCount: number }> {
  return api.patch<{ success: boolean; updatedCount: number }>('/notifications/read-all', {});
}

export async function deleteNotification(id: string): Promise<{ success: boolean }> {
  return api.delete<{ success: boolean }>(`/notifications/${id}`);
}
