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
  objective: string;
  teacher: string;
  students: string;
};

export type LessonPlan = {
  id?: string;
  title: string;
  subject: string;
  grade: string;
  date: string;
  duration: number;
  objective: string;
  version?: number;
  activities: Activity[];
  resources?: any[];
};

export async function getLessonPlans(): Promise<LessonPlan[]> {
  try {
    const data = await api.get<LessonPlan[]>('/lesson-plans');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function getLessonPlanById(id: string): Promise<LessonPlan> {
  return await api.get<LessonPlan>(`/lesson-plans/${id}`);
}

export async function saveLessonPlan(plan: LessonPlan): Promise<LessonPlan> {
  try {
    if (plan.id && !plan.id.startsWith('mock-')) {
      return await api.patch<LessonPlan>(`/lesson-plans/${plan.id}`, plan);
    } else {
      return await api.post<LessonPlan>('/lesson-plans', plan);
    }
  } catch (error) {
    // Return original plan with incremented version if mock/offline
    return {
      ...plan,
      id: plan.id || `plan-${Date.now()}`,
      version: (plan.version || 1) + 1,
    };
  }
}

export async function duplicateLessonPlan(id: string): Promise<LessonPlan> {
  return await api.post<LessonPlan>(`/lesson-plans/${id}/duplicate`);
}

export async function deleteLessonPlan(id: string): Promise<void> {
  await api.delete(`/lesson-plans/${id}`);
}

export async function reorderActivities(lessonPlanId: string, activityIds: string[]): Promise<LessonPlan> {
  return await api.put<LessonPlan>(`/lesson-plans/${lessonPlanId}/activities/reorder`, { activityIds });
}
