import { api, getAccessToken } from '@/services/api-client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface HomeroomClassroom {
  id: string;
  name: string;
  room?: string;
  schedule?: string;
  accent?: string;
  studentCount?: number;
  gradeName?: string;
  schoolYearName?: string;
  schoolYearId: string;
}

export interface MyHomeroomClassesResponse {
  hasHomeroomClass: boolean;
  classes: Array<{
    id: string;
    code: string;
    name: string;
    gradeName: string;
    gradeLevel: number;
    schoolYearId: string;
    schoolYearName: string;
  }>;
}

export interface HomeroomDashboardData {
  hasHomeroomClass: boolean;
  classroom: HomeroomClassroom | null;
  attendanceToday: {
    isRecorded: boolean;
    total: number;
    present: number;
    excusedAbsence: number;
    unexcusedAbsence: number;
    late: number;
  };
  studentsNeedAttention: Array<{
    studentId: string;
    studentName: string;
    initials?: string;
    avatarColor?: string;
    reasons: Array<{ type: 'ATTENDANCE' | 'ASSESSMENT' | 'BEHAVIOR'; description: string }>;
  }>;
  upcomingBirthdays: Array<{
    studentId: string;
    fullName: string;
    initials?: string;
    avatarColor?: string;
    dateOfBirth: string;
    daysUntilBirthday: number;
    isToday: boolean;
    turningAge: number;
  }>;
  recentBehavior: Array<{
    id: string;
    studentId: string;
    studentName: string;
    studentInitials?: string;
    studentColor?: string;
    recordDate: string;
    category: string;
    level: 'POSITIVE' | 'REMINDER' | 'NEEDS_ATTENTION';
    content: string;
  }>;
  weeklyTasks: Array<{
    id: string;
    title: string;
    due: string;
    done: boolean;
  }>;
  currentWeekReview: {
    id: string;
    weekNumber: number;
    strengths?: string;
    limitations?: string;
    nextWeekPlan?: string;
    version: number;
  } | null;
}

export interface BehaviorRecord {
  id: string;
  classroomId: string;
  className: string;
  studentId: string;
  studentName: string;
  studentInitials?: string;
  studentColor?: string;
  recordDate: string;
  category: string;
  level: 'POSITIVE' | 'REMINDER' | 'NEEDS_ATTENTION';
  content: string;
  createdAt: string;
}

export interface BehaviorQueryResponse {
  data: BehaviorRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface WeeklySummaryData {
  weekNumber: number;
  dateRange: string;
  attendance: {
    totalStudents: number;
    totalSessions: number;
    presentRate: number;
    excusedAbsence: number;
    unexcusedAbsence: number;
    late: number;
  };
  behavior: {
    positive: number;
    reminder: number;
    needsAttention: number;
  };
  assessment: {
    excellent: number;
    completed: number;
    needsSupport: number;
  };
}

export interface WeeklyReviewData {
  id: string;
  classroomId: string;
  schoolYearId: string;
  weekNumber: number;
  strengths?: string;
  limitations?: string;
  nextWeekPlan?: string;
  version: number;
}

export interface MonthlySummaryData {
  year: number;
  month: number;
  classroom: {
    id: string;
    name: string;
    gradeName: string;
    schoolYearName: string;
  };
  attendance: {
    totalStudents: number;
    totalSchoolDays: number;
    attendanceRate: number;
    excusedAbsence: number;
    unexcusedAbsence: number;
    late: number;
  };
  learning: {
    excellent: number;
    completed: number;
    needsSupport: number;
  };
  behavior: {
    positive: number;
    reminder: number;
    needsAttention: number;
  };
  studentsNeedingSupport: Array<{ id: string; name: string; reasons: string[] }>;
  studentsImproved: Array<{ name: string; note: string }>;
}

export interface MonthlyReviewData {
  id: string;
  classroomId: string;
  schoolYearId: string;
  year: number;
  month: number;
  highlights?: string;
  limitations?: string;
  nextMonthPlan?: string;
  version: number;
}

// 1. Dashboard
export async function getMyHomeroomClasses(): Promise<MyHomeroomClassesResponse> {
  return api.get<MyHomeroomClassesResponse>('/homeroom/classrooms');
}

export async function getHomeroomDashboard(classId: string): Promise<HomeroomDashboardData> {
  return api.get<HomeroomDashboardData>(
    `/homeroom/dashboard?classId=${encodeURIComponent(classId)}`,
  );
}

// 2. Students Need Attention
export async function getStudentsNeedAttention(classId: string) {
  return api.get(`/homeroom/students-need-attention?classId=${encodeURIComponent(classId)}`);
}

// 3. Upcoming Birthdays
export async function getUpcomingBirthdays(classId: string, days = 30) {
  return api.get(`/homeroom/upcoming-birthdays?classId=${encodeURIComponent(classId)}&days=${days}`);
}

// 4. Behavior Records CRUD
export async function getBehaviorRecords(params: {
  classId?: string;
  studentId?: string;
  fromDate?: string;
  toDate?: string;
  category?: string;
  level?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<BehaviorQueryResponse> {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '' && value !== 'ALL') {
      q.set(key, String(value));
    }
  });
  return api.get<BehaviorQueryResponse>(`/homeroom/behavior?${q.toString()}`);
}

export async function createBehaviorRecord(payload: {
  classroomId: string;
  studentId: string;
  recordDate: string;
  category: string;
  level: string;
  content: string;
}): Promise<BehaviorRecord> {
  return api.post<BehaviorRecord>('/homeroom/behavior', payload);
}

export async function updateBehaviorRecord(
  id: string,
  payload: {
    recordDate?: string;
    category?: string;
    level?: string;
    content?: string;
  },
): Promise<BehaviorRecord> {
  return api.patch<BehaviorRecord>(`/homeroom/behavior/${id}`, payload);
}

export async function deleteBehaviorRecord(id: string): Promise<{ success: boolean; message: string }> {
  return api.delete<{ success: boolean; message: string }>(`/homeroom/behavior/${id}`);
}

// 5. Weekly Review & Summary
export async function getWeeklySummary(classId: string, weekNumber: number, schoolYearId?: string): Promise<WeeklySummaryData> {
  const q = new URLSearchParams({ classId, weekNumber: String(weekNumber) });
  if (schoolYearId) q.set('schoolYearId', schoolYearId);
  return api.get<WeeklySummaryData>(`/homeroom/weekly-summary?${q.toString()}`);
}

export async function getWeeklyReview(classId: string, weekNumber: number, schoolYearId?: string): Promise<WeeklyReviewData | null> {
  const q = new URLSearchParams({ classId, weekNumber: String(weekNumber) });
  if (schoolYearId) q.set('schoolYearId', schoolYearId);
  return api.get<WeeklyReviewData | null>(`/homeroom/weekly-review?${q.toString()}`);
}

export async function saveWeeklyReview(payload: {
  classroomId: string;
  schoolYearId?: string;
  weekNumber: number;
  strengths?: string;
  limitations?: string;
  nextWeekPlan?: string;
  version?: number;
}): Promise<WeeklyReviewData> {
  return api.put<WeeklyReviewData>('/homeroom/weekly-review', payload);
}

// 6. Monthly Review & Summary
export async function getMonthlySummary(classId: string, year: number, month: number): Promise<MonthlySummaryData> {
  const q = new URLSearchParams({ classId, year: String(year), month: String(month) });
  return api.get<MonthlySummaryData>(`/homeroom/monthly-summary?${q.toString()}`);
}

export async function getMonthlyReview(classId: string, year: number, month: number): Promise<MonthlyReviewData | null> {
  const q = new URLSearchParams({ classId, year: String(year), month: String(month) });
  return api.get<MonthlyReviewData | null>(`/homeroom/monthly-review?${q.toString()}`);
}

export async function saveMonthlyReview(payload: {
  classroomId: string;
  schoolYearId?: string;
  year: number;
  month: number;
  highlights?: string;
  limitations?: string;
  nextMonthPlan?: string;
  version?: number;
}): Promise<MonthlyReviewData> {
  return api.put<MonthlyReviewData>('/homeroom/monthly-review', payload);
}

// 7. Exports (Word & PDF)
export async function exportWeeklyReviewFile(
  classId: string,
  weekNumber: number,
  format: 'docx' | 'pdf',
  schoolYearId?: string,
) {
  const token = getAccessToken();
  const url = new URL(`${API_BASE}/homeroom/weekly-review/export/${format}`);
  url.searchParams.set('classId', classId);
  url.searchParams.set('weekNumber', String(weekNumber));
  if (schoolYearId) url.searchParams.set('schoolYearId', schoolYearId);

  const res = await fetch(url.toString(), {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`Không thể xuất file ${format.toUpperCase()}`);

  const blob = await res.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `Bao_cao_chu_nhiem_Tuan_${weekNumber}.${format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(downloadUrl);
}

export async function exportMonthlySummaryFile(
  classId: string,
  year: number,
  month: number,
  format: 'docx' | 'pdf',
) {
  const token = getAccessToken();
  const url = new URL(`${API_BASE}/homeroom/monthly-summary/export/${format}`);
  url.searchParams.set('classId', classId);
  url.searchParams.set('year', String(year));
  url.searchParams.set('month', String(month));

  const res = await fetch(url.toString(), {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`Không thể xuất file ${format.toUpperCase()}`);

  const blob = await res.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `Bao_cao_chu_nhiem_Thang_${month}_${year}.${format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(downloadUrl);
}
