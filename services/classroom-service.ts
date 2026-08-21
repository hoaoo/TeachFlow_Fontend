import { api } from './api-client';
import { type ClassRecord, type StudentRecord, classroomClasses } from '@/lib/classroom-data';

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

export async function getClasses(query?: { schoolYearId?: string; gradeId?: string }): Promise<ClassRecord[]> {
  try {
    let url = '/classes';
    const params = new URLSearchParams();
    if (query?.schoolYearId) params.append('schoolYearId', query.schoolYearId);
    if (query?.gradeId) params.append('gradeId', query.gradeId);
    const qs = params.toString();
    if (qs) url += `?${qs}`;

    const data = await api.get<ClassRecord[]>(url);
    if (Array.isArray(data) && data.length > 0) {
      return data;
    }
    return classroomClasses;
  } catch {
    return classroomClasses;
  }
}

export async function getClassById(id: string): Promise<ClassRecord> {
  try {
    return await api.get<ClassRecord>(`/classes/${id}`);
  } catch {
    const found = classroomClasses.find((c) => c.id === id);
    if (!found) throw new Error('Không tìm thấy lớp học');
    return found;
  }
}

export async function createClass(data: {
  name: string;
  code?: string;
  gradeId?: string;
  schoolYearId?: string;
  homeroomTeacherId?: string;
  room?: string;
  schedule?: string;
  accent?: string;
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
    homeroomTeacherId?: string;
    room?: string;
    schedule?: string;
    accent?: string;
  },
): Promise<ClassRecord> {
  return await api.patch<ClassRecord>(`/classes/${id}`, data);
}

export async function deleteClass(id: string): Promise<void> {
  await api.delete(`/classes/${id}`);
}

export async function addStudentToClass(
  classId: string,
  data: { fullName: string; gender?: string; dob?: string; parentName?: string; parentPhone?: string; note?: string },
): Promise<ClassRecord> {
  return await api.post<ClassRecord>(`/classes/${classId}/students`, data);
}

export async function removeStudentFromClass(classId: string, studentId: string): Promise<void> {
  await api.delete(`/classes/${classId}/students/${studentId}`);
}

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
    return [
      { date: '20/08/2026', type: 'Có mặt', note: 'Đúng giờ' },
      { date: '19/08/2026', type: 'Có mặt', note: 'Đúng giờ' },
      { date: '18/08/2026', type: 'Đi muộn', note: 'Muộn 10 phút' },
      { date: '17/08/2026', type: 'Có mặt', note: 'Đúng giờ' },
    ];
  }
}

export async function getStudentAssessments(studentId: string) {
  try {
    return await api.get<Array<{ subject: string; score: number; average: number }>>(`/students/${studentId}/assessments`);
  } catch {
    return [
      { subject: 'Toán', score: 9.1, average: 9.1 },
      { subject: 'Tiếng Việt', score: 8.7, average: 8.7 },
      { subject: 'Khoa học', score: 8.9, average: 8.9 },
      { subject: 'Lịch sử & Địa lý', score: 8.2, average: 8.2 },
    ];
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

export async function getStudentEnrollments(studentId: string): Promise<StudentEnrollmentRecord[]> {
  try {
    return await api.get<StudentEnrollmentRecord[]>(`/students/${studentId}/enrollments`);
  } catch {
    return [];
  }
}

export async function transferStudent(
  enrollmentId: string,
  data: { targetClassroomId: string; transferDate?: string; reason?: string },
): Promise<StudentEnrollmentRecord> {
  return await api.post<StudentEnrollmentRecord>(`/student-enrollments/${enrollmentId}/transfer`, data);
}

export async function withdrawStudent(
  enrollmentId: string,
  data: { withdrawDate?: string; reason?: string },
): Promise<StudentEnrollmentRecord> {
  return await api.post<StudentEnrollmentRecord>(`/student-enrollments/${enrollmentId}/withdraw`, data);
}

