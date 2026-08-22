import { api } from './api-client';

export interface ScheduleStudentAttendance {
  studentId: string;
  name: string;
  fullName?: string;
  studentCode?: string;
  initials?: string;
  gender?: string;
  status: 'PRESENT' | 'EXCUSED_ABSENCE' | 'UNEXCUSED_ABSENCE' | 'LATE' | string;
  lateMinutes: number;
  note: string;
}

export interface ScheduleAttendanceResponse {
  schedule: {
    id: string;
    title: string;
    plannedDate: string;
    startTime: string;
    endTime: string;
    classroomId: string;
    className: string;
    subjectId: string;
    subjectName: string;
    room: string;
  };
  isRecorded: boolean;
  sessionId: string | null;
  note: string;
  summary: {
    totalStudents: number;
    presentCount: number;
    excusedCount: number;
    unexcusedCount: number;
    lateCount: number;
    absentCount: number;
  };
  students: ScheduleStudentAttendance[];
}

export interface StudentAttendanceSummary {
  studentId: string;
  studentName: string;
  classroom: string | null;
  summary: {
    totalPeriods: number;
    presentCount: number;
    excusedCount: number;
    unexcusedCount: number;
    lateCount: number;
    absentCount: number;
    attendanceRate: number;
  };
  recentLogs: Array<{
    id: string;
    date: string;
    subjectName: string;
    startTime: string;
    endTime: string;
    status: string;
    lateMinutes: number;
    note: string;
  }>;
}

export interface AttendanceStatsResponse {
  totalSessions: number;
  totalRecorded: number;
  presentCount: number;
  excusedCount: number;
  unexcusedCount: number;
  lateCount: number;
  absentCount: number;
  overallRate: number;
}

export async function getScheduleAttendance(scheduleId: string): Promise<ScheduleAttendanceResponse> {
  const res = await api.get<any>(`/attendance/schedules/${scheduleId}`);
  const payload = res?.data || res || {};
  const rawStudents = Array.isArray(payload?.students) ? payload.students : [];
  const normalizedStudents: ScheduleStudentAttendance[] = rawStudents.map((s: any) => {
    const studentObj = s.student || s;
    const name = s.name || s.fullName || studentObj.fullName || studentObj.name || s.displayName || 'Học sinh';
    const studentId = s.studentId || s.id || studentObj.id || '';
    const studentCode = s.studentCode || s.code || studentObj.code || studentObj.studentCode || '';
    const initials = s.initials || studentObj.initials || (name ? name.trim().split(/\s+/).slice(-2).map((w: string) => w[0]).join('').toUpperCase() : 'HS');
    const gender = s.gender || (studentObj.gender === 'FEMALE' ? 'Nữ' : studentObj.gender === 'MALE' ? 'Nam' : studentObj.gender) || '';

    let status = (s.status || 'PRESENT').toUpperCase();
    if (status === 'ABSENT' || status === 'VANG') status = 'UNEXCUSED_ABSENCE';
    if (status === 'EXCUSED' || status === 'PHEP') status = 'EXCUSED_ABSENCE';
    if (status === 'MUON') status = 'LATE';
    if (!['PRESENT', 'EXCUSED_ABSENCE', 'UNEXCUSED_ABSENCE', 'LATE'].includes(status)) {
      status = 'PRESENT';
    }

    return {
      studentId,
      name,
      fullName: name,
      studentCode,
      initials,
      gender,
      status,
      lateMinutes: Number.isFinite(s.lateMinutes) && s.lateMinutes >= 0 ? s.lateMinutes : 0,
      note: s.note || '',
    };
  });

  return {
    ...payload,
    schedule: payload.schedule || {
      id: scheduleId,
      title: '',
      plannedDate: '',
      startTime: '',
      endTime: '',
      classroomId: '',
      className: 'Lớp học',
      subjectId: '',
      subjectName: 'Môn học',
      room: '',
    },
    students: normalizedStudents,
  };
}

export async function saveScheduleAttendance(
  scheduleId: string,
  data: {
    note?: string;
    attendances: Array<{
      studentId: string;
      status: string;
      lateMinutes?: number;
      note?: string;
    }>;
  },
): Promise<{ success: boolean; message: string; sessionId: string; summary: any }> {
  return api.put<{ success: boolean; message: string; sessionId: string; summary: any }>(
    `/attendance/schedules/${scheduleId}`,
    data,
  );
}

export async function getStudentAttendanceSummary(studentId: string): Promise<StudentAttendanceSummary> {
  return api.get<StudentAttendanceSummary>(`/attendance/students/${studentId}/summary`);
}

export async function getAttendanceStats(params?: {
  classId?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<AttendanceStatsResponse> {
  const query = new URLSearchParams();
  if (params?.classId) query.set('classId', params.classId);
  if (params?.dateFrom) query.set('dateFrom', params.dateFrom);
  if (params?.dateTo) query.set('dateTo', params.dateTo);

  return api.get<AttendanceStatsResponse>(`/attendance/stats?${query.toString()}`);
}

export async function getClassAttendance(classId: string, date?: string) {
  const query = new URLSearchParams();
  if (classId) query.set('classId', classId);
  if (date) query.set('date', date);

  return api.get(`/attendance?${query.toString()}`);
}

export async function saveClassAttendance(data: any) {
  return api.put('/attendance', data);
}

export async function getAttendanceHistory() {
  return api.get('/attendance/history');
}
