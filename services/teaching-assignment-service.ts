import { api } from './api-client';

export interface TeachingAssignmentRecord {
  id: string;
  teacherId: string;
  teacher?: {
    id: string;
    fullName: string;
    phone?: string | null;
  };
  classroomId: string;
  classroom?: {
    id: string;
    code?: string;
    name: string;
    gradeName?: string;
    room?: string | null;
  };
  subjectId: string;
  subject?: {
    id: string;
    code: string;
    name: string;
  };
  schoolYearId: string;
  schoolYear?: {
    id: string;
    name: string;
    isCurrent: boolean;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SubjectOption {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}

export async function getSubjects(): Promise<SubjectOption[]> {
  try {
    const res = await api.get<SubjectOption[]>('/subjects');
    return Array.isArray(res) ? res : [];
  } catch {
    return [
      { id: 'math', code: 'MATH', name: 'Toán', isActive: true },
      { id: 'vietnamese', code: 'VIETNAMESE', name: 'Tiếng Việt', isActive: true },
      { id: 'science', code: 'SCIENCE', name: 'Khoa học', isActive: true },
      { id: 'history_geo', code: 'HISTORY_GEOGRAPHY', name: 'Lịch sử & Địa lý', isActive: true },
      { id: 'ethics', code: 'ETHICS', name: 'Đạo đức', isActive: true },
    ];
  }
}

export async function getMyTeachingAssignments(
  schoolYearId?: string,
): Promise<TeachingAssignmentRecord[]> {
  try {
    const query = schoolYearId ? `?schoolYearId=${encodeURIComponent(schoolYearId)}` : '';
    const res = await api.get<TeachingAssignmentRecord[]>(`/me/teaching-assignments${query}`);
    return Array.isArray(res) ? res : [];
  } catch {
    return [];
  }
}

export async function getTeachingAssignments(params?: {
  schoolYearId?: string;
  teacherId?: string;
  classroomId?: string;
  subjectId?: string;
  isActive?: boolean;
  search?: string;
}): Promise<TeachingAssignmentRecord[]> {
  try {
    const query = new URLSearchParams();
    if (params?.schoolYearId) query.set('schoolYearId', params.schoolYearId);
    if (params?.teacherId) query.set('teacherId', params.teacherId);
    if (params?.classroomId) query.set('classroomId', params.classroomId);
    if (params?.subjectId) query.set('subjectId', params.subjectId);
    if (params?.isActive !== undefined) query.set('isActive', String(params.isActive));
    if (params?.search) query.set('search', params.search);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await api.get<TeachingAssignmentRecord[]>(`/teaching-assignments${queryString}`);
    return Array.isArray(res) ? res : [];
  } catch {
    return [];
  }
}

export async function createTeachingAssignment(data: {
  teacherId: string;
  classroomId: string;
  subjectId: string;
  schoolYearId?: string;
}): Promise<TeachingAssignmentRecord> {
  return api.post<TeachingAssignmentRecord>('/teaching-assignments', data);
}

export async function updateTeachingAssignment(
  id: string,
  data: {
    isActive?: boolean;
    subjectId?: string;
    classroomId?: string;
    teacherId?: string;
  },
): Promise<TeachingAssignmentRecord> {
  return api.patch<TeachingAssignmentRecord>(`/teaching-assignments/${id}`, data);
}

export async function deactivateTeachingAssignment(
  id: string,
): Promise<TeachingAssignmentRecord> {
  return api.delete<TeachingAssignmentRecord>(`/teaching-assignments/${id}`);
}
