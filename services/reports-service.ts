import { api } from './api-client';
import { downloadExportFile } from './export-service';

export interface AttendanceReportData {
  summary: {
    totalSessions: number;
    totalRecords: number;
    presentCount: number;
    excusedCount: number;
    unexcusedCount: number;
    lateCount: number;
    attendanceRate: number;
  };
  studentsWithAbsences: Array<{
    student: { id: string; fullName: string; gender: string };
    className: string;
    excused: number;
    unexcused: number;
    late: number;
  }>;
  sessions: Array<{
    id: string;
    date: string;
    className: string;
    totalStudents: number;
    present: number;
    excused: number;
    unexcused: number;
    late: number;
  }>;
}

export interface AssessmentReportData {
  summary: {
    totalAssessments: number;
    totalStudentAssessments: number;
    excellentCount: number;
    completedCount: number;
    needsSupportCount: number;
    excellentRate: number;
    completedRate: number;
    needsSupportRate: number;
  };
  assessments: Array<{
    id: string;
    title: string;
    type: string;
    className?: string;
    subjectName?: string;
    date: string;
    totalStudents: number;
    excellent: number;
    completed: number;
    needsSupport: number;
  }>;
}

export interface ClassroomSummaryReportData {
  classInfo: {
    id: string;
    name: string;
    code: string;
    grade: string;
    schoolYear: string;
    homeroomTeacher: string;
    phone?: string;
    room: string;
  };
  students: {
    total: number;
    male: number;
    female: number;
    list: Array<{
      stt: number;
      id: string;
      code?: string;
      fullName: string;
      gender: string;
      dob?: string;
      status: string;
    }>;
  };
  attendance: {
    totalSessionsTracked: number;
    overallAttendanceRate: number;
  };
  behavior: {
    totalRecords: number;
    positive: number;
    reminder: number;
    needsAttention: number;
    recentRecords: Array<{
      studentName: string;
      category: string;
      level: string;
      description?: string;
      date: string;
    }>;
  };
}

export interface TeachingAssignmentsReportData {
  totalAssignments: number;
  totalTeachers: number;
  byTeacher: Array<{
    teacherName: string;
    phone?: string;
    assignments: Array<{
      id: string;
      className: string;
      gradeName: string;
      subjectName: string;
      schoolYearName: string;
    }>;
  }>;
  list: Array<{
    id: string;
    teacherName: string;
    className: string;
    subjectName: string;
    schoolYearName: string;
  }>;
}

export interface StudentEnrollmentReportData {
  totalEnrollments: number;
  activeEnrollments: number;
  classBreakdown: Array<{
    className: string;
    gradeName: string;
    active: number;
    transferred: number;
    completed: number;
    withdrawn: number;
    total: number;
  }>;
  students: Array<{
    id: string;
    studentId: string;
    fullName: string;
    code?: string;
    gender: string;
    className: string;
    status: string;
    enrollmentDate?: string;
  }>;
}

export async function getAttendanceReport(params?: Record<string, any>): Promise<AttendanceReportData> {
  const query = params ? new URLSearchParams(params).toString() : '';
  return api.get<AttendanceReportData>(`/reports/attendance${query ? `?${query}` : ''}`);
}

export async function exportAttendanceCsv(params?: Record<string, any>): Promise<void> {
  const query = params ? new URLSearchParams(params).toString() : '';
  return downloadExportFile(`/reports/attendance/export/csv${query ? `?${query}` : ''}`, 'Bao_cao_chuyen_can.csv');
}

export async function getAssessmentReport(params?: Record<string, any>): Promise<AssessmentReportData> {
  const query = params ? new URLSearchParams(params).toString() : '';
  return api.get<AssessmentReportData>(`/reports/assessments${query ? `?${query}` : ''}`);
}

export async function exportAssessmentCsv(params?: Record<string, any>): Promise<void> {
  const query = params ? new URLSearchParams(params).toString() : '';
  return downloadExportFile(`/reports/assessments/export/csv${query ? `?${query}` : ''}`, 'Bao_cao_danh_gia.csv');
}

export async function getClassroomSummaryReport(classroomId: string): Promise<ClassroomSummaryReportData> {
  return api.get<ClassroomSummaryReportData>(`/reports/classroom-summary/${classroomId}`);
}

export async function exportClassroomSummaryDocx(classroomId: string, className = 'Lop'): Promise<void> {
  return downloadExportFile(`/reports/classroom-summary/${classroomId}/export/docx`, `Bao_cao_tong_hop_${className}.docx`);
}

export async function getTeachingAssignmentsReport(params?: Record<string, any>): Promise<TeachingAssignmentsReportData> {
  const query = params ? new URLSearchParams(params).toString() : '';
  return api.get<TeachingAssignmentsReportData>(`/reports/teaching-assignments${query ? `?${query}` : ''}`);
}

export async function getStudentEnrollmentReport(params?: Record<string, any>): Promise<StudentEnrollmentReportData> {
  const query = params ? new URLSearchParams(params).toString() : '';
  return api.get<StudentEnrollmentReportData>(`/reports/student-enrollments${query ? `?${query}` : ''}`);
}
