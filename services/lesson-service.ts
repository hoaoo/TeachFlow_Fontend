import { api } from './api-client';

export type Activity = {
  id: string;
  phase: string;
  title: string;
  minutes: number;
  method: string;
  technique: string;
  competencies: string;
  qualities: string;
  equipment?: string;
  objective: string;
  teacher: string;
  students: string;
  sortOrder?: number;
};

export type LessonPlanScheduleLink = {
  id: string;
  title: string;
  plannedDate: string;
  startTime: string;
  endTime: string;
  status: string;
  classroom?: {
    id: string;
    name: string;
  };
};

export type LessonPlanVersionRecord = {
  id: string;
  versionNumber: number;
  title: string;
  changeSummary?: string | null;
  createdAt: string;
};

export type LessonPlan = {
  id?: string;
  title: string;
  topic?: string;
  subject: string;
  grade: string;
  classroomId?: string | null;
  subjectId?: string | null;
  date: string;
  duration: number;
  objective: string;
  specificCompetencies?: string;
  generalCompetencies?: string;
  qualities?: string;
  teachingEquipment?: string;
  postLessonAdjustment?: string;
  notes?: string;
  status?: 'DRAFT' | 'COMPLETED' | 'TAUGHT' | string;
  version?: number;
  activities: Activity[];
  resources?: any[];
  schedules?: LessonPlanScheduleLink[];
  versions?: LessonPlanVersionRecord[];
  activitiesCount?: number;
  schedulesCount?: number;
  updatedAt?: string;
  createdAt?: string;
};

export async function getLessonPlans(params?: {
  classroomId?: string;
  subjectId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}): Promise<LessonPlan[]> {
  try {
    const query = new URLSearchParams();
    if (params?.classroomId) query.set('classroomId', params.classroomId);
    if (params?.subjectId) query.set('subjectId', params.subjectId);
    if (params?.status) query.set('status', params.status);
    if (params?.dateFrom) query.set('dateFrom', params.dateFrom);
    if (params?.dateTo) query.set('dateTo', params.dateTo);
    if (params?.search) query.set('search', params.search);
    const qs = query.toString() ? `?${query.toString()}` : '';
    const data = await api.get<LessonPlan[]>(`/lesson-plans${qs}`);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function getLessonPlanById(id: string): Promise<LessonPlan> {
  return await api.get<LessonPlan>(`/lesson-plans/${id}`);
}

export async function createLessonPlan(plan: Partial<LessonPlan> & { scheduleId?: string }): Promise<LessonPlan> {
  return await api.post<LessonPlan>('/lesson-plans', plan);
}

export async function updateLessonPlan(id: string, plan: Partial<LessonPlan>): Promise<LessonPlan> {
  return await api.patch<LessonPlan>(`/lesson-plans/${id}`, plan);
}

export async function saveLessonPlan(plan: LessonPlan): Promise<LessonPlan> {
  if (plan.id && !plan.id.startsWith('mock-') && !plan.id.startsWith('plan-')) {
    return await api.patch<LessonPlan>(`/lesson-plans/${plan.id}`, plan);
  } else {
    return await api.post<LessonPlan>('/lesson-plans', plan);
  }
}

export async function duplicateLessonPlan(
  id: string,
  options?: { classroomId?: string; date?: string; title?: string },
): Promise<LessonPlan> {
  return await api.post<LessonPlan>(`/lesson-plans/${id}/duplicate`, options);
}

export async function deleteLessonPlan(id: string): Promise<void> {
  await api.delete(`/lesson-plans/${id}`);
}

export async function reorderActivities(lessonPlanId: string, activityIds: string[]): Promise<LessonPlan> {
  return await api.put<LessonPlan>(`/lesson-plans/${lessonPlanId}/activities/reorder`, { activityIds });
}

export async function saveActivityToLibrary(
  lessonPlanId: string,
  activityId: string,
  data: {
    title?: string;
    description?: string;
    typeName?: string;
    subject?: string;
    grade?: string;
  },
): Promise<{ success: boolean; message: string; activity: any }> {
  return await api.post(`/lesson-plans/${lessonPlanId}/activities/${activityId}/save-to-library`, data);
}

export async function getLessonPlanVersions(lessonPlanId: string): Promise<LessonPlanVersionRecord[]> {
  try {
    const res = await api.get<LessonPlanVersionRecord[]>(`/lesson-plans/${lessonPlanId}/versions`);
    return Array.isArray(res) ? res : [];
  } catch {
    return [];
  }
}

export async function restoreLessonPlanVersion(lessonPlanId: string, versionId: string): Promise<LessonPlan> {
  return await api.post<LessonPlan>(`/lesson-plans/${lessonPlanId}/restore/${versionId}`);
}

export async function linkLessonPlanSchedule(lessonPlanId: string, scheduleId: string): Promise<LessonPlan> {
  return await api.post<LessonPlan>(`/lesson-plans/${lessonPlanId}/schedules/${scheduleId}`);
}

export async function unlinkLessonPlanSchedule(lessonPlanId: string, scheduleId: string): Promise<LessonPlan> {
  return await api.delete<LessonPlan>(`/lesson-plans/${lessonPlanId}/schedules/${scheduleId}`);
}
