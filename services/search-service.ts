import { api } from './api-client';

export interface SearchStudentResult {
  id: string;
  fullName: string;
  studentCode: string | null;
  classroomName: string | null;
  gradeName: string | null;
  avatarColor: string | null;
  status: string;
  type: 'STUDENT';
}

export interface SearchLessonPlanResult {
  id: string;
  title: string;
  topic: string | null;
  subjectName: string | null;
  gradeName: string | null;
  status: string;
  type: 'LESSON_PLAN';
}

export interface SearchWorksheetResult {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  status: string;
  type: 'WORKSHEET';
}

export interface SearchResourceResult {
  id: string;
  name: string;
  originalFileName: string | null;
  resourceType: string;
  extension?: string;
  formattedSize?: string;
  size?: number | null;
  type: 'RESOURCE';
}

export interface GlobalSearchResult {
  students: SearchStudentResult[];
  lessonPlans: SearchLessonPlanResult[];
  worksheets: SearchWorksheetResult[];
  resources: SearchResourceResult[];
}

export async function searchGlobal(q: string, limit = 5): Promise<GlobalSearchResult> {
  const trimmed = q.trim();
  if (!trimmed || trimmed.length < 2) {
    return { students: [], lessonPlans: [], worksheets: [], resources: [] };
  }
  return api.get<GlobalSearchResult>(`/search?q=${encodeURIComponent(trimmed)}&limit=${limit}`);
}
