import { api } from './api-client';

export interface TeacherAccount {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedTeachersResponse {
  items: TeacherAccount[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface CreateTeacherPayload {
  email: string;
  fullName: string;
  phone?: string;
  password: string;
}

export interface UpdateTeacherPayload {
  email?: string;
  fullName?: string;
  phone?: string;
}

export async function getTeachers(params?: {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: 'ALL' | 'ACTIVE' | 'INACTIVE' | string;
}): Promise<PaginatedTeachersResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('pageSize', String(params.pageSize));
  if (params?.keyword) query.set('keyword', params.keyword);
  if (params?.status && params.status !== 'ALL') query.set('status', params.status);

  const queryString = query.toString() ? `?${query.toString()}` : '';
  return api.get<PaginatedTeachersResponse>(`/admin/teachers${queryString}`);
}

export async function getTeacher(id: string): Promise<TeacherAccount> {
  return api.get<TeacherAccount>(`/admin/teachers/${id}`);
}

export async function createTeacher(payload: CreateTeacherPayload): Promise<TeacherAccount> {
  return api.post<TeacherAccount>('/admin/teachers', payload);
}

export async function updateTeacher(
  id: string,
  payload: UpdateTeacherPayload,
): Promise<TeacherAccount> {
  return api.patch<TeacherAccount>(`/admin/teachers/${id}`, payload);
}

export async function updateTeacherStatus(
  id: string,
  isActive: boolean,
): Promise<{ success: boolean; message: string; isActive: boolean }> {
  return api.patch(`/admin/teachers/${id}/status`, { isActive });
}

export async function resetTeacherPassword(
  id: string,
  newPassword: string,
): Promise<{ success: boolean; message: string }> {
  return api.post(`/admin/teachers/${id}/reset-password`, { newPassword });
}
