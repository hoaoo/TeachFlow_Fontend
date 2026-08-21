import { api } from './api-client';

export interface ScheduleEntry {
  id: string;
  teacherId: string;
  title: string;       // Tên bài / Nội dung tiết dạy
  subtitle?: string;
  status: string;      // PLANNED | TAUGHT | CANCELLED
  room?: string | null;
  notes?: string | null;
  weekNumber: number;
  plannedDate: string | null;   // YYYY-MM-DD
  startTime: string | null;     // HH:MM
  endTime: string | null;       // HH:MM
  classroomId: string;
  classroom?: {
    id: string;
    name: string;
    code: string;
    gradeName?: string | null;
    room?: string | null;
  };
  subjectId: string;
  subject?: {
    id: string;
    name: string;
    code: string;
  };
  schoolYearId: string;
  schoolYear?: {
    id: string;
    name: string;
    isCurrent: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateScheduleData {
  title: string;
  classroomId: string;
  subjectId: string;
  plannedDate?: string;   // YYYY-MM-DD
  startTime?: string;     // HH:MM
  endTime?: string;       // HH:MM
  room?: string;
  notes?: string;
  schoolYearId?: string;
  weekNumber?: number;
}

export interface UpdateScheduleData {
  title?: string;
  plannedDate?: string;
  startTime?: string;
  endTime?: string;
  room?: string;
  notes?: string;
  status?: string;
  weekNumber?: number;
}

export async function getSchedules(params?: {
  classroomId?: string;
  subjectId?: string;
  dateFrom?: string;  // YYYY-MM-DD
  dateTo?: string;    // YYYY-MM-DD
  status?: string;
}): Promise<ScheduleEntry[]> {
  try {
    const query = new URLSearchParams();
    if (params?.classroomId) query.set('classroomId', params.classroomId);
    if (params?.subjectId) query.set('subjectId', params.subjectId);
    if (params?.dateFrom) query.set('dateFrom', params.dateFrom);
    if (params?.dateTo) query.set('dateTo', params.dateTo);
    if (params?.status) query.set('status', params.status);
    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await api.get<ScheduleEntry[]>(`/schedules${qs}`);
    return Array.isArray(res) ? res : [];
  } catch {
    return [];
  }
}

export async function getSchedule(id: string): Promise<ScheduleEntry> {
  return api.get<ScheduleEntry>(`/schedules/${id}`);
}

export async function createSchedule(data: CreateScheduleData): Promise<ScheduleEntry> {
  return api.post<ScheduleEntry>('/schedules', data);
}

export async function updateSchedule(id: string, data: UpdateScheduleData): Promise<ScheduleEntry> {
  return api.patch<ScheduleEntry>(`/schedules/${id}`, data);
}

export async function deleteSchedule(id: string): Promise<void> {
  await api.delete(`/schedules/${id}`);
}

// Helpers for Vietnamese date formatting
export function formatDateVN(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function getDayOfWeekVN(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  const days = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  return days[d.getDay()];
}

export function getTodayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export function getWeekRange(dateStr: string): { from: string; to: string } {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay(); // 0 = Sunday
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const mon = new Date(d.setDate(diff));
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return {
    from: mon.toISOString().split('T')[0],
    to: sun.toISOString().split('T')[0],
  };
}

export function getMonthRange(dateStr: string): { from: string; to: string } {
  const d = new Date(dateStr + 'T00:00:00');
  const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return {
    from: firstDay.toISOString().split('T')[0],
    to: lastDay.toISOString().split('T')[0],
  };
}
