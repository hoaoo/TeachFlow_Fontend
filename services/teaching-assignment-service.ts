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

/**
 * Get teaching contexts for the currently authenticated teacher.
 * teacherId is always resolved from the JWT token on the server — never passed from the client.
 */
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

/**
 * Get teaching contexts scoped to the currently authenticated teacher.
 * NOTE: teacherId param is intentionally removed — the server derives it from JWT.
 * This prevents any attempt to query another teacher's teaching contexts from the client.
 */
export async function getMyTeachingContexts(params?: {
  schoolYearId?: string;
  classroomId?: string;
  subjectId?: string;
  isActive?: boolean;
  search?: string;
}): Promise<TeachingAssignmentRecord[]> {
  try {
    const query = new URLSearchParams();
    if (params?.schoolYearId) query.set('schoolYearId', params.schoolYearId);
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

/**
 * Teacher self-declares a teaching context (lớp/môn đang dạy).
 * teacherId is NOT sent — server derives it from JWT.
 */
export async function declareTeachingContext(data: {
  classroomId: string;
  subjectId: string;
  schoolYearId?: string;
}): Promise<TeachingAssignmentRecord> {
  return api.post<TeachingAssignmentRecord>('/teaching-assignments', data);
}

/**
 * Teacher updates their own teaching context.
 * teacherId is NOT updatable — ownership is immutable.
 */
export async function updateTeachingContext(
  id: string,
  data: {
    isActive?: boolean;
    subjectId?: string;
    classroomId?: string;
  },
): Promise<TeachingAssignmentRecord> {
  return api.patch<TeachingAssignmentRecord>(`/teaching-assignments/${id}`, data);
}

/**
 * Teacher deactivates their own teaching context.
 */
export async function deactivateTeachingContext(
  id: string,
): Promise<TeachingAssignmentRecord> {
  return api.delete<TeachingAssignmentRecord>(`/teaching-assignments/${id}`);
}

// ---------------------------------------------------------------------------
// Legacy aliases kept for backward compatibility — prefer the new names above
// ---------------------------------------------------------------------------
/** @deprecated Use declareTeachingContext instead */
export const createTeachingAssignment = declareTeachingContext;
/** @deprecated Use updateTeachingContext instead */
export const updateTeachingAssignment = updateTeachingContext;
/** @deprecated Use deactivateTeachingContext instead */
export const deactivateTeachingAssignment = deactivateTeachingContext;
/** @deprecated Use getMyTeachingContexts instead */
export const getTeachingAssignments = getMyTeachingContexts;
