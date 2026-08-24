import { api } from './api-client';
import { type ClassRecord, type StudentRecord } from '@/lib/classroom-data';

export type { ClassRecord, StudentRecord };

export type SchoolYearOption = {
  id: string;
  name: string;
  isCurrent: boolean;
  isActive: boolean;
};

export type GradeOption = {
  id: string;
  code?: string;
  name: string;
  level: number;
  isActive: boolean;
};

export type ConfiguredClassSubject = {
  id: string;
  code: string;
  name: string;
};

export type ClassListResponse = {
  items: ClassRecord[];
  summary: {
    totalClasses: number;
    totalStudents: number;
    avgAttendanceRate: number | null;
  };
};

export type ClassDashboardData = {
  classroomId: string;
  className: string;
  grade?: string;
  schoolYear?: string;
  room?: string;
  kpis: {
    studentCount: number;
    attendanceRate: number | null;
    averageScore: number | null;
    weeklyScheduleCount: number;
    preparedLessonPlanCount: number;
    needsSupportStudentCount: number;
  };
  recentSchedules: Array<{
    id: string;
    plannedDate: string;
    startTime?: string;
    endTime?: string;
    subjectName: string;
    teacherName: string;
    room?: string;
    status: string;
  }>;
  recentAbsences: Array<{
    studentId: string;
    studentName: string;
    date: string;
    subjectName: string;
    type: string;
    note?: string;
  }>;
  recentLates: Array<{
    studentId: string;
    studentName: string;
    date: string;
    subjectName: string;
    lateMinutes: number;
    note?: string;
  }>;
  recentAssessments: Array<{
    id: string;
    name: string;
    subjectName: string;
    score: number | null;
    date: string;
  }>;
};

export type ClassAttendanceData = {
  summary: {
    attendanceRate: number | null;
    presentCount: number;
    absentCount: number;
    excusedCount: number;
    unexcusedCount: number;
    lateCount: number;
    totalSessions: number;
  };
  sessions: Array<{
    id: string;
    scheduleId?: string;
    date: string;
    subjectName: string;
    teacherName: string;
    stats: {
      present: number;
      excused: number;
      unexcused: number;
      late: number;
      total: number;
    };
  }>;
};

export type ClassAssessmentData = {
  summary: {
    avgScore: number | null;
    excellentCount: number;
    completedCount: number;
    needsSupportCount: number;
    totalAssessments: number;
  };
  assessments: Array<{
    id: string;
    name: string;
    date: string;
    subjectName: string;
    teacherName: string;
    studentCount: number;
    averageScore?: number | null;
  }>;
};

export type ClassLessonPlanRecord = {
  id: string;
  title: string;
  subjectName: string;
  status: string;
  teachingDate?: string | null;
  teacherName: string;
  fileUrl?: string | null;
  sourceType: 'TeachFlow' | 'DOCX' | 'PDF';
  updatedAt: string;
};

export type StudentEnrollmentRecord = {
  id: string;
  studentId?: string;
  schoolYearId?: string;
  schoolYear?: { id: string; name: string; isCurrent: boolean };
  classroomId?: string;
  classroom?: { id: string; code?: string; name: string; gradeName?: string; room?: string };
  status: 'ACTIVE' | 'TRANSFERRED' | 'COMPLETED' | 'WITHDRAWN';
  enrolledAt: string;
  leftAt?: string | null;
  transferReason?: string | null;
  note?: string | null;
};

// ═══════════════════════════════════════════════════════════════════════════
// SCHOOL YEARS & GRADES
// ═══════════════════════════════════════════════════════════════════════════

export async function getSchoolYears(): Promise<SchoolYearOption[]> {
  try {
    const data = await api.get<SchoolYearOption[]>('/school-years');
    return Array.isArray(data) ? data : [];
  } catch {
    return [
      { id: 'sy-2026', name: '2026 - 2027', isCurrent: true, isActive: true },
      { id: 'sy-2025', name: '2025 - 2026', isCurrent: false, isActive: true },
    ];
  }
}

export async function getGrades(): Promise<GradeOption[]> {
  try {
    const data = await api.get<GradeOption[]>('/grades');
    return Array.isArray(data) ? data : [];
  } catch {
    return [
      { id: 'g1', code: 'K01', name: 'Khối 1', level: 1, isActive: true },
      { id: 'g2', code: 'K02', name: 'Khối 2', level: 2, isActive: true },
      { id: 'g3', code: 'K03', name: 'Khối 3', level: 3, isActive: true },
      { id: 'g4', code: 'K04', name: 'Khối 4', level: 4, isActive: true },
      { id: 'g5', code: 'K05', name: 'Khối 5', level: 5, isActive: true },
    ];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CLASSROOM LIST & CRUD
// ═══════════════════════════════════════════════════════════════════════════

export async function getClasses(query?: {
  schoolYearId?: string;
  gradeId?: string;
  status?: string;
  keyword?: string;
  sort?: string;
}): Promise<ClassRecord[]> {
  try {
    let url = '/classes';
    const params = new URLSearchParams();
    if (query?.schoolYearId && query.schoolYearId !== 'ALL') params.append('schoolYearId', query.schoolYearId);
    if (query?.gradeId && query.gradeId !== 'ALL') params.append('gradeId', query.gradeId);
    if (query?.status && query.status !== 'ALL') params.append('status', query.status);
    if (query?.keyword) params.append('keyword', query.keyword);
    if (query?.sort) params.append('sort', query.sort);
    const qs = params.toString();
    if (qs) url += `?${qs}`;

    const data = await api.get<any>(url);
    if (data && Array.isArray(data.items)) {
      return data.items;
    }
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function getClassesWithSummary(query?: {
  schoolYearId?: string;
  gradeId?: string;
  status?: string;
  keyword?: string;
  sort?: string;
}): Promise<ClassListResponse> {
  try {
    let url = '/classes';
    const params = new URLSearchParams();
    if (query?.schoolYearId && query.schoolYearId !== 'ALL') params.append('schoolYearId', query.schoolYearId);
    if (query?.gradeId && query.gradeId !== 'ALL') params.append('gradeId', query.gradeId);
    if (query?.status && query.status !== 'ALL') params.append('status', query.status);
    if (query?.keyword) params.append('keyword', query.keyword);
    if (query?.sort) params.append('sort', query.sort);
    const qs = params.toString();
    if (qs) url += `?${qs}`;

    const data = await api.get<any>(url);
    if (data && Array.isArray(data.items)) {
      return {
        items: data.items,
        summary: data.summary || {
          totalClasses: data.items.length,
          totalStudents: data.items.reduce((acc: number, c: any) => acc + (c.studentCount || 0), 0),
          avgAttendanceRate: null,
        },
      };
    }
    const items = Array.isArray(data) ? data : [];
    return {
      items,
      summary: {
        totalClasses: items.length,
        totalStudents: items.reduce((acc: number, c: any) => acc + (c.studentCount || 0), 0),
        avgAttendanceRate: null,
      },
    };
  } catch {
    return {
      items: [],
      summary: { totalClasses: 0, totalStudents: 0, avgAttendanceRate: null },
    };
  }
}

export async function getClassById(id: string): Promise<ClassRecord> {
  return await api.get<ClassRecord>(`/classes/${id}`);
}

export async function createClass(data: {
  name: string;
  code?: string;
  gradeId?: string;
  schoolYearId?: string;
  homeroomTeacherId?: string;
  isHomeroom?: boolean;
  room?: string;
  schedule?: string;
  accent?: string;
  subjectIds?: string[];
}): Promise<ClassRecord> {
  return await api.post<ClassRecord>('/classes', data);
}

export async function updateClass(
  id: string,
  data: {
    name?: string;
    code?: string;
    gradeId?: string;
    schoolYearId?: string;
    room?: string;
    schedule?: string;
    accent?: string;
    status?: string;
    subjectIds?: string[];
    isHomeroom?: boolean;
  },
): Promise<ClassRecord> {
  return await api.patch<ClassRecord>(`/classes/${id}`, data);
}

export async function getConfiguredClassSubjects(
  classId: string,
): Promise<ConfiguredClassSubject[]> {
  const result = await api.get<ConfiguredClassSubject[]>('/classes/' + classId + '/subjects');
  return Array.isArray(result) ? result : [];
}

export async function deleteClass(id: string): Promise<void> {
  await api.delete(`/classes/${id}`);
}

export async function setClassAsHomeroom(id: string): Promise<ClassRecord> {
  return api.post<ClassRecord>(`/classes/${id}/homeroom`, {});
}

export async function unsetClassAsHomeroom(id: string): Promise<ClassRecord> {
  return api.delete<ClassRecord>(`/classes/${id}/homeroom`);
}

export async function completeClass(id: string): Promise<ClassRecord> {
  return await api.post<ClassRecord>(`/classes/${id}/complete`, {});
}

export async function cloneClass(
  id: string,
  data: {
    targetSchoolYearId: string;
    targetName: string;
    targetCode?: string;
    targetGradeId?: string;
    copyStudents?: boolean;
  },
): Promise<ClassRecord> {
  return await api.post<ClassRecord>(`/classes/${id}/clone`, data);
}

// ═══════════════════════════════════════════════════════════════════════════
// CLASS DETAIL TABS
// ═══════════════════════════════════════════════════════════════════════════

export async function getClassDashboard(id: string): Promise<ClassDashboardData | null> {
  try {
    return await api.get<ClassDashboardData>(`/classes/${id}/dashboard`);
  } catch {
    return null;
  }
}

export async function getClassStudents(classId: string): Promise<StudentRecord[]> {
  try {
    return await api.get<StudentRecord[]>(`/classes/${classId}/students`);
  } catch {
    return [];
  }
}

export async function addStudentToClass(
  classId: string,
  data: {
    studentId?: string;
    fullName: string;
    gender?: string;
    dob?: string;
    parentName?: string;
    parentPhone?: string;
    note?: string;
  },
): Promise<ClassRecord> {
  return await api.post<ClassRecord>(`/classes/${classId}/students`, data);
}

export async function importStudentsToClass(
  classId: string,
  students: Array<{
    fullName: string;
    studentCode?: string;
    gender?: string;
    dob?: string;
    parentName?: string;
    parentPhone?: string;
    note?: string;
  }>,
): Promise<{ success: boolean; importedCount: number; errors: string[]; message?: string }> {
  return await api.post(`/classes/${classId}/import-students`, { students });
}

export async function transferStudent(
  classId: string,
  studentId: string,
  data: { targetClassroomId: string; transferDate?: string; reason?: string },
): Promise<{ success: boolean; message: string }> {
  return await api.post(`/classes/${classId}/students/${studentId}/transfer`, data);
}

export async function removeStudentFromClass(classId: string, studentId: string): Promise<void> {
  await api.delete(`/classes/${classId}/students/${studentId}`);
}

export async function getClassSchedules(classId: string): Promise<any[]> {
  try {
    return await api.get<any[]>(`/classes/${classId}/schedules`);
  } catch {
    return [];
  }
}

export async function getClassAttendance(classId: string, range?: string): Promise<ClassAttendanceData | null> {
  try {
    const url = range ? `/classes/${classId}/attendance?range=${range}` : `/classes/${classId}/attendance`;
    return await api.get<ClassAttendanceData>(url);
  } catch {
    return null;
  }
}

export async function getClassAssessments(classId: string): Promise<ClassAssessmentData | null> {
  try {
    return await api.get<ClassAssessmentData>(`/classes/${classId}/assessments`);
  } catch {
    return null;
  }
}

export async function getClassLessonPlans(classId: string): Promise<ClassLessonPlanRecord[]> {
  try {
    return await api.get<ClassLessonPlanRecord[]>(`/classes/${classId}/lesson-plans`);
  } catch {
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// INDIVIDUAL STUDENT ACTIONS
// ═══════════════════════════════════════════════════════════════════════════

export async function getStudentOverview(studentId: string) {
  try {
    return await api.get(`/students/${studentId}/overview`);
  } catch {
    return null;
  }
}

export async function getStudentAttendance(studentId: string) {
  try {
    return await api.get<Array<{ date: string; type: string; note: string }>>(`/students/${studentId}/attendance`);
  } catch {
    return [];
  }
}

export async function getStudentAssessments(studentId: string) {
  try {
    return await api.get<Array<{ subject: string; score: number; average: number }>>(`/students/${studentId}/assessments`);
  } catch {
    return [];
  }
}

export async function getStudentComments(studentId: string) {
  try {
    return await api.get<Array<{ id: string; content: string; date: string; teacherName: string }>>(`/students/${studentId}/comments`);
  } catch {
    return [];
  }
}

export async function addStudentComment(studentId: string, content: string, classroomId?: string) {
  return await api.post(`/students/${studentId}/comments`, { content, classroomId });
}

export async function getStudentEnrollments(studentId: string): Promise<StudentEnrollmentRecord[]> {
  try {
    return await api.get<StudentEnrollmentRecord[]>(`/students/${studentId}/enrollments`);
  } catch {
    return [];
  }
}

export async function updateStudent(
  studentId: string,
  data: {
    fullName?: string;
    gender?: string;
    dob?: string;
    parentName?: string;
    parentPhone?: string;
    note?: string;
    status?: string;
  },
): Promise<StudentRecord> {
  return await api.patch<StudentRecord>(`/students/${studentId}`, data);
}
