import { api } from '@/services/api-client';

export interface AssessmentColumn {
  id: string;
  title: string;
  subtitle?: string;
  subjectId?: string;
  subjectName?: string;
  semester?: number;
  type: string;
  weight: number;
  date: string;
  status: string;
  version: number;
}

export interface StudentGradeRow {
  studentId: string;
  studentCode?: string;
  fullName: string;
  initials: string;
  gender: string;
  scores: Record<
    string,
    {
      id?: string;
      score: number | null;
      level?: string;
      comment?: string;
    }
  >;
  averageScore: number | null;
  minScore: number | null;
  maxScore: number | null;
  totalAssessments: number;
  gradedAssessments: number;
  isComplete: boolean;
  classification: {
    code: 'EXCELLENT' | 'GOOD' | 'COMPLETED' | 'NEEDS_SUPPORT' | 'INCOMPLETE';
    label: string;
    color: 'emerald' | 'blue' | 'amber' | 'rose' | 'slate';
  } | null;
}

export interface GradebookSummary {
  totalStudents: number;
  gradedStudents: number;
  classAverage: number | null;
  excellentCount: number;
  goodCount: number;
  completedCount: number;
  needsSupportCount: number;
  incompleteCount: number;
}

export interface GradebookData {
  classroomId: string;
  classroomName: string;
  gradeName?: string;
  schoolYearName?: string;
  subjectId: string | null;
  semester: number;
  schoolYearId?: string;
  columns: AssessmentColumn[];
  students: StudentGradeRow[];
  summary: GradebookSummary;
}

export interface StudentAcademicProfile {
  studentId: string;
  fullName: string;
  studentCode?: string;
  overallAverageScore: number | null;
  overallClassification: {
    code: string;
    label: string;
    color: string;
  } | null;
  isComplete: boolean;
  subjects: Array<{
    subjectId: string;
    subjectName: string;
    averageScore: number | null;
    classification: {
      code: string;
      label: string;
      color: string;
    } | null;
    assessments: Array<{
      id: string;
      title: string;
      date: string;
      semester: number;
      type: string;
      weight: number;
      score: number | null;
      level: string;
      comment?: string;
      criterion?: string;
    }>;
  }>;
}

export async function getGradebook(params: {
  classroomId: string;
  subjectId?: string;
  semester?: number;
  schoolYearId?: string;
}): Promise<GradebookData> {
  const query = new URLSearchParams();
  query.set('classroomId', params.classroomId);
  if (params.subjectId && params.subjectId !== 'ALL') query.set('subjectId', params.subjectId);
  if (params.semester) query.set('semester', String(params.semester));
  if (params.schoolYearId && params.schoolYearId !== 'ALL') query.set('schoolYearId', params.schoolYearId);

  return api.get<GradebookData>(`/assessments/gradebook?${query.toString()}`);
}

export async function saveAssessmentScores(
  assessmentId: string,
  scores: Array<{ studentId: string; score: number | null; level?: string; comment?: string }>,
): Promise<{ success: boolean; message: string }> {
  return api.put<{ success: boolean; message: string }>(`/assessments/${assessmentId}/scores`, { scores });
}

export async function createAssessmentColumn(data: {
  title: string;
  classroomId: string;
  subjectId?: string;
  semester?: number;
  assessmentType?: string;
  weight?: number;
  assessmentDate?: string;
}): Promise<any> {
  return api.post('/assessments', data);
}

export async function updateAssessmentColumn(
  id: string,
  data: Partial<{
    title: string;
    status: string;
    assessmentType?: string;
    weight?: number;
    assessmentDate?: string;
    version?: number;
  }>,
): Promise<any> {
  return api.patch(`/assessments/${id}`, data);
}

export async function deleteAssessmentColumn(id: string): Promise<void> {
  await api.delete(`/assessments/${id}`);
}

export async function importGradebookScores(data: {
  assessmentId: string;
  classroomId: string;
  scores: Array<{
    studentCode?: string;
    studentId?: string;
    fullName?: string;
    score: number | null;
    comment?: string;
  }>;
}): Promise<{
  success: boolean;
  importedCount: number;
  errorCount: number;
  errors: Array<{ row: number; studentCode?: string; fullName?: string; message: string }>;
  message: string;
}> {
  return api.post('/assessments/gradebook/import', data);
}

export async function exportGradebook(params: {
  classroomId: string;
  subjectId?: string;
  semester?: number;
  schoolYearId?: string;
}): Promise<{
  classroomName: string;
  subjectName: string;
  semester: number;
  headers: string[];
  rows: any[][];
  summary: GradebookSummary;
}> {
  const query = new URLSearchParams();
  query.set('classroomId', params.classroomId);
  if (params.subjectId && params.subjectId !== 'ALL') query.set('subjectId', params.subjectId);
  if (params.semester) query.set('semester', String(params.semester));
  if (params.schoolYearId && params.schoolYearId !== 'ALL') query.set('schoolYearId', params.schoolYearId);

  return api.get(`/assessments/gradebook/export?${query.toString()}`);
}

export async function getStudentAcademicProfile(studentId: string): Promise<StudentAcademicProfile> {
  return api.get<StudentAcademicProfile>(`/assessments/student/${studentId}/profile`);
}
