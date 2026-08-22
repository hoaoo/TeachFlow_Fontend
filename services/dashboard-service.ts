import { api } from './api-client';

export type DashboardLesson = {
  id?: string;
  time: string;
  startTime?: string;
  endTime?: string;
  plannedDate?: string;
  status?: string;
  isManualStatus?: boolean;
  subject: string;
  title: string;
  className: string;
  gradeName?: string | null;
  room: string;
  color: string;
};

export type DashboardTask = {
  id: string;
  title: string;
  due: string;
  done: boolean;
  taskDate?: string;
  priority?: string;
  completedAt?: string | null;
};

export type DashboardData = {
  greeting: {
    date: string;
    title: string;
    description: string;
  };
  currentSchoolYear?: {
    id: string;
    name: string;
  } | null;
  currentSemester?: {
    id: string;
    name: string;
  } | null;
  stats: Array<{
    label: string;
    value: string;
    note: string;
    tone: string;
    icon: string;
  }>;
  lessons: Array<DashboardLesson>;
  tasks: Array<DashboardTask>;
  classProgress: {
    className: string;
    overallPercent: number;
    excellent: number;
    improving: number;
    needsSupport: number;
    totalStudents?: number;
  };
  featuredStudents: Array<{
    id: string;
    name: string;
    className?: string;
    initials: string;
    progress: number;
    status: string;
    color: string;
  }>;
  attendanceRate?: number;
};

export async function getDashboardData(): Promise<DashboardData | null> {
  try {
    return await api.get<DashboardData>('/dashboard');
  } catch {
    return null;
  }
}

export async function toggleTask(taskId: string, done: boolean) {
  return await api.patch<DashboardTask>(`/tasks/${taskId}`, { done });
}

export async function createTask(data: { title: string; due?: string; done?: boolean }) {
  return await api.post<DashboardTask>('/tasks', data);
}

export async function deleteTask(taskId: string) {
  return await api.delete(`/tasks/${taskId}`);
}

export async function updateScheduleStatus(
  scheduleId: string,
  data: { status?: string; startTime?: string; endTime?: string; isManualStatus?: boolean },
) {
  return await api.patch(`/schedules/${scheduleId}`, data);
}

export async function getDashboardSchedule(params: {
  date?: string;
  from?: string;
  to?: string;
}): Promise<DashboardLesson[]> {
  try {
    const query = new URLSearchParams();
    if (params.date) query.set('date', params.date);
    if (params.from) query.set('from', params.from);
    if (params.to) query.set('to', params.to);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return await api.get<DashboardLesson[]>(`/dashboard/schedule${qs}`);
  } catch {
    return [];
  }
}

