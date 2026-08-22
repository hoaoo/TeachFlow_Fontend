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
  sourceType?: 'NATIVE' | 'UPLOADED' | string;
  originalFileName?: string | null;
  storedFileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
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
  const payload: any = {
    title: plan.title,
    topic: plan.topic,
    subject: plan.subject,
    grade: plan.grade,
    classroomId: plan.classroomId,
    subjectId: plan.subjectId,
    teachingAssignmentId: (plan as any).teachingAssignmentId,
    lessonId: (plan as any).lessonId,
    date: plan.date,
    duration: plan.duration,
    objective: plan.objective,
    specificCompetencies: plan.specificCompetencies,
    generalCompetencies: plan.generalCompetencies,
    qualities: plan.qualities,
    teachingEquipment: plan.teachingEquipment,
    postLessonAdjustment: plan.postLessonAdjustment,
    notes: plan.notes,
    status: plan.status,
    scheduleId: plan.scheduleId,
  };

  // Explicit mapping of allowed fields in CreateActivityDto to prevent 'property id should not exist'
  if (plan.activities && Array.isArray(plan.activities)) {
    payload.activities = plan.activities.map((act, index) => ({
      phase: act.phase,
      title: act.title,
      minutes: act.minutes,
      method: act.method || '',
      technique: act.technique || '',
      competencies: act.competencies || '',
      qualities: act.qualities || '',
      equipment: act.equipment || undefined,
      objective: act.objective || '',
      teacher: act.teacher || '',
      students: act.students || '',
      sortOrder: act.sortOrder ?? index,
    }));
  }

  return await api.post<LessonPlan>('/lesson-plans', payload);
}

export async function updateLessonPlan(id: string, plan: Partial<LessonPlan>): Promise<LessonPlan> {
  const payload: any = {
    version: plan.version,
    title: plan.title,
    topic: plan.topic,
    subject: plan.subject,
    grade: plan.grade,
    date: plan.date,
    duration: plan.duration,
    objective: plan.objective,
    specificCompetencies: plan.specificCompetencies,
    generalCompetencies: plan.generalCompetencies,
    qualities: plan.qualities,
    teachingEquipment: plan.teachingEquipment,
    postLessonAdjustment: plan.postLessonAdjustment,
    notes: plan.notes,
    status: plan.status,
  };

  if (plan.activities && Array.isArray(plan.activities)) {
    payload.activities = plan.activities.map((act, index) => ({
      phase: act.phase,
      title: act.title,
      minutes: act.minutes,
      method: act.method || '',
      technique: act.technique || '',
      competencies: act.competencies || '',
      qualities: act.qualities || '',
      equipment: act.equipment || undefined,
      objective: act.objective || '',
      teacher: act.teacher || '',
      students: act.students || '',
      sortOrder: act.sortOrder ?? index,
    }));
  }

  return await api.patch<LessonPlan>(`/lesson-plans/${id}`, payload);
}

export async function uploadLessonPlanFile(formData: FormData): Promise<LessonPlan> {
  return await api.postForm<LessonPlan>('/lesson-plans/upload', formData);
}

export function getLessonPlanFileUrl(id: string): string {
  const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api').replace(/\/+$/, '');
  return `${baseUrl}/lesson-plans/${id}/file`;
}

export async function downloadLessonPlanFile(id: string, filename?: string): Promise<void> {
  const blob = await api.getBlob(`/lesson-plans/${id}/file`);
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'lesson-plan-file';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export async function saveLessonPlan(plan: LessonPlan): Promise<LessonPlan> {
  if (plan.id && !plan.id.startsWith('mock-') && !plan.id.startsWith('plan-')) {
    return await updateLessonPlan(plan.id, plan);
  } else {
    return await createLessonPlan(plan);
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
