import { api } from './api-client';

export interface WorksheetQuestion {
  id: string;
  worksheetId: string;
  questionType: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'FILL_BLANK' | 'MATCHING' | 'ESSAY';
  content: string;
  optionsJson?: string[] | null;
  correctAnswerJson?: any;
  explanation?: string | null;
  sortOrder: number;
}

export interface WorksheetItem {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  status: string;
  meta?: string;
  tone?: string;
  subjectId?: string;
  gradeId?: string;
  subject?: { id: string; name: string };
  grade?: { id: string; name: string };
  questions?: WorksheetQuestion[];
  questionsCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export async function getWorksheets(): Promise<WorksheetItem[]> {
  try {
    const data = await api.get<WorksheetItem[]>('/worksheets');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function getWorksheet(id: string): Promise<WorksheetItem> {
  return await api.get<WorksheetItem>(`/worksheets/${id}`);
}

export async function createWorksheet(data: {
  title: string;
  description?: string;
  subjectId?: string;
  gradeId?: string;
  subtitle?: string;
  status?: string;
}): Promise<WorksheetItem> {
  return await api.post<WorksheetItem>('/worksheets', data);
}

export async function updateWorksheet(
  id: string,
  data: Partial<{
    title: string;
    description: string;
    subtitle: string;
    status: string;
    subjectId: string;
    gradeId: string;
  }>,
): Promise<WorksheetItem> {
  return await api.patch<WorksheetItem>(`/worksheets/${id}`, data);
}

export async function deleteWorksheet(id: string): Promise<void> {
  await api.delete(`/worksheets/${id}`);
}

export async function duplicateWorksheet(id: string): Promise<WorksheetItem> {
  return await api.post<WorksheetItem>(`/worksheets/${id}/duplicate`, {});
}
