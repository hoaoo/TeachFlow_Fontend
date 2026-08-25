import { api } from './api-client';
import { analyzeImportFile } from './ai-service';
import { type StudentRecord } from '@/lib/classroom-data';
import {
  buildStudentListUrl,
  normalizeStudentListResponse,
  notifyStudentDataChanged,
} from './student-list-contract.mjs';

export { notifyStudentDataChanged };

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
  search?: string;
  keyword?: string;
  classroomId?: string;
  classId?: string;
  gradeId?: string;
  schoolYearId?: string;
  status?: string;
  supportStatus?: string;
  sort?: string;
}): Promise<StudentListResponse> {
  const data = await api.get<unknown>(buildStudentListUrl(query));
  return normalizeStudentListResponse(data) as StudentListResponse;
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

export async function analyzeStudentImportFile(file: File, classroomId?: string) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('target', 'students');
  if (classroomId) formData.append('classroomId', classroomId);
  return analyzeImportFile(formData);
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

export async function getStudentProfile(id: string): Promise<any> { return api.get('/students/' + id + '/profile'); }

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

export async function exportStudentsXlsx(query?: {
  page?: number;
  pageSize?: number;
  search?: string;
  keyword?: string;
  classroomId?: string;
  classId?: string;
  gradeId?: string;
  schoolYearId?: string;
  status?: string;
  supportStatus?: string;
  sort?: string;
}): Promise<Blob> {
  const url = buildStudentListUrl(query);
  const exportUrl = url.replace('/students', '/students/export/xlsx');
  return api.getBlob(exportUrl);
}

export async function createQuickAssessment(dto: {
  studentIds: string[];
  classroomId: string;
  subjectId?: string;
  title: string;
  level?: 'EXCELLENT' | 'COMPLETED' | 'NEEDS_SUPPORT';
  score?: number;
  comment?: string;
  assessmentDate?: string;
  semester?: number;
}): Promise<{ success: boolean; message: string; assessmentId: string; updatedStudentsCount: number }> {
  return api.post('/assessments/quick', dto);
}
