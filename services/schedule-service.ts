import { api } from './api-client';

export interface ScheduleEntry {
  id: string;
  teacherId: string;
  title: string;       // Tên bài / Nội dung tiết dạy
  subtitle?: string;
  status: string;      // PLANNED | IN_PROGRESS | TAUGHT | CANCELLED
  isManualStatus?: boolean;
  room?: string | null;
  notes?: string | null;
  postLessonNotes?: string | null;
  actualStartTime?: string | null;
  actualEndTime?: string | null;
  weekNumber?: number;
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
  subjectId: string | null;
  subjectName: string | null;
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
  lessonPlanId?: string | null;
  lessonPlan?: {
    id: string;
    title: string;
    status: string;
    objectives?: string | null;
  } | null;
  recurrenceGroupId?: string | null;
  recurrenceType?: string | null;
  recurrenceEndDate?: string | null;
  attendance?: {
    isRecorded: boolean;
    sessionId?: string | null;
    status?: string | null;
    totalStudents?: number;
    presentCount?: number;
    absentCount?: number;
    lateCount?: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateScheduleData {
  title: string;
  classroomId: string;
  subjectName: string;
  plannedDate?: string;   // YYYY-MM-DD
  startTime?: string;     // HH:MM
  endTime?: string;       // HH:MM
  room?: string;
  notes?: string;
  schoolYearId?: string;
  lessonPlanId?: string;
  recurrenceType?: 'NONE' | 'WEEKLY' | string;
  recurrenceEndDate?: string;
}

export interface UpdateScheduleData {
  title?: string;
  subjectName?: string;
  plannedDate?: string;
  startTime?: string;
  endTime?: string;
  actualStartTime?: string;
  actualEndTime?: string;
  room?: string;
  notes?: string;
  postLessonNotes?: string;
  status?: string;
  isManualStatus?: boolean;
  lessonPlanId?: string | null;
  recurrenceScope?: 'THIS_ONLY' | 'THIS_AND_FUTURE' | 'ALL';
}

export interface DuplicateScheduleData {
  plannedDate?: string;
  startTime?: string;
  endTime?: string;
  classroomId?: string;
  subjectId?: string;
  title?: string;
}

export interface UpdateScheduleStatusData {
  status: string;
  actualStartTime?: string;
  actualEndTime?: string;
  postLessonNotes?: string;
  isManualStatus?: boolean;
}

export async function getSchedules(params?: {
  classroomId?: string;
  subjectId?: string;
  dateFrom?: string;  // YYYY-MM-DD
  dateTo?: string;    // YYYY-MM-DD
  status?: string;
  search?: string;
}): Promise<ScheduleEntry[]> {
  try {
    const query = new URLSearchParams();
    if (params?.classroomId) query.set('classroomId', params.classroomId);
    if (params?.subjectId) query.set('subjectId', params.subjectId);
    if (params?.dateFrom) query.set('dateFrom', params.dateFrom);
    if (params?.dateTo) query.set('dateTo', params.dateTo);
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
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

export async function deleteSchedule(
  id: string,
  recurrenceScope: 'THIS_ONLY' | 'THIS_AND_FUTURE' | 'ALL' = 'THIS_ONLY',
): Promise<{ success: boolean; message: string }> {
  const query = recurrenceScope !== 'THIS_ONLY' ? `?recurrenceScope=${recurrenceScope}` : '';
  return api.delete(`/schedules/${id}${query}`);
}

export async function duplicateSchedule(id: string, data: DuplicateScheduleData): Promise<ScheduleEntry> {
  return api.post<ScheduleEntry>(`/schedules/${id}/duplicate`, data);
}

export async function updateScheduleStatus(id: string, data: UpdateScheduleStatusData): Promise<ScheduleEntry> {
  return api.patch<ScheduleEntry>(`/schedules/${id}/status`, data);
}

export async function linkScheduleLessonPlan(id: string, lessonPlanId: string): Promise<ScheduleEntry> {
  return api.post<ScheduleEntry>(`/schedules/${id}/lesson-plan`, { lessonPlanId });
}

export async function unlinkScheduleLessonPlan(id: string): Promise<ScheduleEntry> {
  return api.delete<ScheduleEntry>(`/schedules/${id}/lesson-plan`);
}

export async function getScheduleAttendance(id: string): Promise<{
  scheduleId: string;
  classroomId: string;
  className: string;
  date: string;
  isRecorded: boolean;
  sessionId?: string | null;
  status?: string | null;
  totalStudents?: number;
  presentCount?: number;
  absentCount?: number;
  lateCount?: number;
}> {
  return api.get(`/schedules/${id}/attendance`);
}

// ─── Helpers for Vietnamese date formatting and calendar calculations ────────
export function formatDateVN(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatLongDateVN(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return '';
  return `${getDayOfWeekVN(dateStr)}, ${d.getDate()} tháng ${d.getMonth() + 1}, ${d.getFullYear()}`;
}

export function getDayOfWeekVN(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  const days = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  return days[d.getDay()];
}

export function getDayOfWeekShortVN(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  return days[d.getDay()];
}

export function getTodayISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getWeekRange(dateStr: string): { from: string; to: string; days: string[] } {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay(); // 0 = Sunday
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const mon = new Date(d.getFullYear(), d.getMonth(), diff);

  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const cur = new Date(mon);
    cur.setDate(mon.getDate() + i);
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, '0');
    const dayNum = String(cur.getDate()).padStart(2, '0');
    days.push(`${y}-${m}-${dayNum}`);
  }

  return {
    from: days[0],
    to: days[6],
    days,
  };
}

export function getMonthRange(dateStr: string): { from: string; to: string } {
  const d = new Date(dateStr + 'T00:00:00');
  const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);

  const fY = firstDay.getFullYear();
  const fM = String(firstDay.getMonth() + 1).padStart(2, '0');
  const fD = String(firstDay.getDate()).padStart(2, '0');

  const lY = lastDay.getFullYear();
  const lM = String(lastDay.getMonth() + 1).padStart(2, '0');
  const lD = String(lastDay.getDate()).padStart(2, '0');

  return {
    from: `${fY}-${fM}-${fD}`,
    to: `${lY}-${lM}-${lD}`,
  };
}

export function getMonthCalendarMatrix(dateStr: string): {
  date: string;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isToday: boolean;
}[][] {
  const d = new Date(dateStr + 'T00:00:00');
  const year = d.getFullYear();
  const month = d.getMonth();
  const todayISO = getTodayISO();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  // Day of week for 1st of month: 0=Sun, 1=Mon, ..., 6=Sat
  // We want Monday as start of week (0=Mon, ..., 6=Sun)
  let startDay = firstDayOfMonth.getDay() - 1;
  if (startDay === -1) startDay = 6;

  const matrix: { date: string; dayOfMonth: number; isCurrentMonth: boolean; isToday: boolean }[][] = [];
  let currentWeek: { date: string; dayOfMonth: number; isCurrentMonth: boolean; isToday: boolean }[] = [];

  // Previous month padding
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startDay - 1; i >= 0; i--) {
    const prevDate = new Date(year, month - 1, prevMonthLastDay - i);
    const y = prevDate.getFullYear();
    const m = String(prevDate.getMonth() + 1).padStart(2, '0');
    const dayNum = String(prevDate.getDate()).padStart(2, '0');
    const date = `${y}-${m}-${dayNum}`;
    currentWeek.push({
      date,
      dayOfMonth: prevDate.getDate(),
      isCurrentMonth: false,
      isToday: date === todayISO,
    });
  }

  // Current month days
  for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
    const curDate = new Date(year, month, day);
    const y = curDate.getFullYear();
    const m = String(curDate.getMonth() + 1).padStart(2, '0');
    const dayNum = String(curDate.getDate()).padStart(2, '0');
    const date = `${y}-${m}-${dayNum}`;

    currentWeek.push({
      date,
      dayOfMonth: day,
      isCurrentMonth: true,
      isToday: date === todayISO,
    });

    if (currentWeek.length === 7) {
      matrix.push(currentWeek);
      currentWeek = [];
    }
  }

  // Next month padding
  if (currentWeek.length > 0) {
    let nextMonthDay = 1;
    while (currentWeek.length < 7) {
      const nextDate = new Date(year, month + 1, nextMonthDay);
      const y = nextDate.getFullYear();
      const m = String(nextDate.getMonth() + 1).padStart(2, '0');
      const dayNum = String(nextDate.getDate()).padStart(2, '0');
      const date = `${y}-${m}-${dayNum}`;
      currentWeek.push({
        date,
        dayOfMonth: nextMonthDay,
        isCurrentMonth: false,
        isToday: date === todayISO,
      });
      nextMonthDay++;
    }
    matrix.push(currentWeek);
  }

  return matrix;
}
