import { api } from './api-client';

export type DashboardData = {
  greeting: {
    date: string;
    title: string;
    description: string;
  };
  stats: Array<{
    label: string;
    value: string;
    note: string;
    tone: string;
    icon: string;
  }>;
  lessons: Array<{
    time: string;
    subject: string;
    title: string;
    className: string;
    room: string;
    color: string;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    due: string;
    done: boolean;
  }>;
  classProgress: {
    className: string;
    overallPercent: number;
    excellent: number;
    improving: number;
    needsSupport: number;
  };
  featuredStudents: Array<{
    id: string;
    name: string;
    initials: string;
    progress: number;
    status: string;
    color: string;
  }>;
};

export async function getDashboardData(): Promise<DashboardData | null> {
  try {
    return await api.get<DashboardData>('/dashboard');
  } catch {
    return null;
  }
}

export async function toggleTask(taskId: string, done: boolean) {
  try {
    return await api.patch(`/tasks/${taskId}`, { done });
  } catch {
    return null;
  }
}
