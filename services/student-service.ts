import { api } from './api-client';
import { type StudentRecord } from '@/lib/classroom-data';

export type StudentSummaryStats = {
  totalStudents: number;
  activeStudents: number;
  needsSupportStudents: number;
  avgAttendanceRate: number | null;
};

export type StudentListResponse = {
  items: StudentRecord[];
  totalItems: number;
  page: number;
  pageSize: number;
  totalPages: number;
  summary: StudentSummaryStats;
};

export type StudentAttendanceSession = {
  id: string;
  date: string;
  subjectName: string;
  teacherName: string;
  period: string;
  status: string;
  statusLabel: string;
  lateMinutes: number;
  note: string;
};

export type StudentAttendanceResponse = {
  summary: {
    attendanceRate: number | null;
    totalSessions: number;
    presentCount: number;
    excusedCount: number;
    unexcusedCount: number;
    lateCount: number;
  };
  sessions: StudentAttendanceSession[];
};

export type StudentAssessmentItem = {
  id: string;
  name: string;
  subjectName: string;
  className: string;
  date: string;
  score?: number | null;
  level: string;
  criterion?: string;
  comment?: string;
};

export type StudentAssessmentsResponse = {
  summary: {
    totalAssessments: number;
    avgScore: number | null;
  };
  items: StudentAssessmentItem[];
};

export type StudentEnrollmentHistoryItem = {
  id: string;
  schoolYearId: string;
  schoolYear?: { id: string; name: string; isCurrent: boolean };
  classroomId: string;
  classroom?: { id: string; code?: string; name: string; gradeName?: string; room?: string };
  status: string;
  enrolledAt: string;
  leftAt?: string | null;
  transferReason?: string | null;
  note?: string | null;
};

export type StudentCommentItem = {
  id: string;
  content: string;
  date: string;
  teacherName: string;
  className?: string;
};

export async function getStudents(query?: {
  page?: number;
  pageSize?: number;
  keyword?: string;
  classId?: string;
  gradeId?: string;
  schoolYearId?: string;
  status?: string;
  sort?: string;
}): Promise<StudentListResponse> {
  try {
    let url = '/students';
    const params = new URLSearchParams();
    if (query?.page) params.append('page', String(query.page));
    if (query?.pageSize) params.append('pageSize', String(query.pageSize));
    if (query?.keyword) params.append('keyword', query.keyword);
    if (query?.classId && query.classId !== 'ALL') params.append('classId', query.classId);
    if (query?.gradeId && query.gradeId !== 'ALL') params.append('gradeId', query.gradeId);
    if (query?.schoolYearId && query.schoolYearId !== 'ALL') params.append('schoolYearId', query.schoolYearId);
    if (query?.status && query.status !== 'ALL') params.append('status', query.status);
    if (query?.sort) params.append('sort', query.sort);

    const qs = params.toString();
    if (qs) url += `?${qs}`;

    const data = await api.get<any>(url);
    if (data && Array.isArray(data.items)) {
      return {
        items: data.items,
        totalItems: data.totalItems || data.items.length,
        page: data.page || 1,
        pageSize: data.pageSize || 20,
        totalPages: data.totalPages || 1,
        summary: data.summary || {
          totalStudents: data.items.length,
          activeStudents: data.items.length,
          needsSupportStudents: 0,
          avgAttendanceRate: null,
        },
      };
    }
    const items = Array.isArray(data) ? data : [];
    return {
      items,
      totalItems: items.length,
      page: 1,
      pageSize: 20,
      totalPages: 1,
      summary: {
        totalStudents: items.length,
        activeStudents: items.length,
        needsSupportStudents: 0,
        avgAttendanceRate: null,
      },
    };
  } catch {
    return {
      items: [],
      totalItems: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
      summary: {
        totalStudents: 0,
        activeStudents: 0,
        needsSupportStudents: 0,
        avgAttendanceRate: null,
      },
    };
  }
}

export async function getStudent(id: string): Promise<StudentRecord> {
  return api.get<StudentRecord>(`/students/${id}`);
}

export async function createStudent(dto: {
  fullName: string;
  studentCode?: string;
  initials?: string;
  gender?: string;
  dob?: string;
  parentName?: string;
  parentPhone?: string;
  status?: string;
  classroomId?: string;
  classId?: string;
  note?: string;
}): Promise<StudentRecord> {
  return api.post<StudentRecord>('/students', dto);
}

export async function updateStudent(
  id: string,
  dto: {
    fullName?: string;
    studentCode?: string;
    initials?: string;
    gender?: string;
    dob?: string;
    parentName?: string;
    parentPhone?: string;
    status?: string;
    color?: string;
    note?: string;
  },
): Promise<StudentRecord> {
  return api.patch<StudentRecord>(`/students/${id}`, dto);
}

export async function deleteStudent(id: string): Promise<{ success: boolean; message?: string }> {
  return api.delete<{ success: boolean; message?: string }>(`/students/${id}`);
}

export async function transferStudent(
  id: string,
  dto: {
    targetClassroomId: string;
    reason?: string;
  },
): Promise<{ success: boolean; message: string }> {
  return api.post<{ success: boolean; message: string }>(`/students/${id}/transfer`, dto);
}

export async function importStudents(
  classroomId: string,
  students: Array<{
    fullName: string;
    studentCode?: string;
    gender?: string;
    dob?: string;
    parentName?: string;
    parentPhone?: string;
    note?: string;
  }>,
): Promise<{
  success: boolean;
  importedCount: number;
  errorCount: number;
  errors: Array<{ row: number; fullName?: string; message: string }>;
  message?: string;
}> {
  return api.post('/students/import', { classroomId, students });
}

export async function getStudentOverview(id: string): Promise<any> {
  return api.get(`/students/${id}/overview`);
}

export async function getStudentAttendance(id: string): Promise<StudentAttendanceResponse> {
  return api.get<StudentAttendanceResponse>(`/students/${id}/attendance`);
}

export async function getStudentAssessments(id: string): Promise<StudentAssessmentsResponse> {
  return api.get<StudentAssessmentsResponse>(`/students/${id}/assessments`);
}

export async function getStudentComments(id: string): Promise<StudentCommentItem[]> {
  const data = await api.get<StudentCommentItem[]>(`/students/${id}/comments`);
  return Array.isArray(data) ? data : [];
}

export async function addStudentComment(
  id: string,
  content: string,
  classroomId?: string,
): Promise<any> {
  return api.post(`/students/${id}/comments`, { content, classroomId });
}

export async function getStudentEnrollments(id: string): Promise<StudentEnrollmentHistoryItem[]> {
  const data = await api.get<StudentEnrollmentHistoryItem[]>(`/students/${id}/enrollments`);
  return Array.isArray(data) ? data : [];
}
