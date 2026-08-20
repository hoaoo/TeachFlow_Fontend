import { api } from './api-client';

export type GeneratedActivity = {
  activityType?: string;
  title: string;
  objective: string;
  durationMinutes: number;
  methods: string[];
  techniques: string[];
  competencies: string[];
  qualities: string[];
  teacherActivity: string;
  studentActivity: string;
};

export type GeneratedLessonPlan = {
  title: string;
  objectives: string;
  teachingEquipment: string;
  activities: GeneratedActivity[];
};

export type GeneratedQuestion = {
  questionType?: string;
  level?: string;
  content: string;
  options?: string[];
  correctAnswer?: string;
  answer?: string;
  explanation?: string;
};

export type GeneratedWorksheet = {
  title: string;
  questions: GeneratedQuestion[];
};

export type GeneratedQuestionsResult = {
  topic: string;
  questions: GeneratedQuestion[];
};

export type GeneratedStudentComment = {
  comments: string[];
  overallAssessment: string;
  recommendations: string;
};

export async function generateLessonPlan(payload: {
  grade: number;
  subject: string;
  lessonTitle: string;
  durationMinutes?: number;
  requirements?: string;
}): Promise<GeneratedLessonPlan> {
  try {
    return await api.post<GeneratedLessonPlan>('/ai/lesson-plan', payload);
  } catch (error: any) {
    throw new Error(error?.message || 'Không thể tạo nội dung lúc này. Vui lòng thử lại.');
  }
}

export async function generateActivity(payload: {
  grade: number;
  subject: string;
  lessonTitle: string;
  activityType: string;
  durationMinutes?: number;
  requirement?: string;
}): Promise<GeneratedActivity> {
  try {
    return await api.post<GeneratedActivity>('/ai/activity', payload);
  } catch (error: any) {
    throw new Error(error?.message || 'Không thể tạo nội dung lúc này. Vui lòng thử lại.');
  }
}

export async function generateWorksheet(payload: {
  grade: number;
  subject: string;
  lesson: string;
  numberOfQuestions?: number;
  difficulty?: string;
  questionTypes?: string[];
}): Promise<GeneratedWorksheet> {
  try {
    return await api.post<GeneratedWorksheet>('/ai/worksheet', payload);
  } catch (error: any) {
    throw new Error(error?.message || 'Không thể tạo nội dung lúc này. Vui lòng thử lại.');
  }
}

export async function generateQuestions(payload: {
  grade: number;
  subject: string;
  topic: string;
  numberOfQuestions?: number;
  levels?: string[];
}): Promise<GeneratedQuestionsResult> {
  try {
    return await api.post<GeneratedQuestionsResult>('/ai/questions', payload);
  } catch (error: any) {
    throw new Error(error?.message || 'Không thể tạo nội dung lúc này. Vui lòng thử lại.');
  }
}

export async function generateStudentComment(payload: {
  studentId?: string;
  subject?: string;
  criteria?: Record<string, string>;
  assessmentLevel?: string;
  notes?: string;
}): Promise<GeneratedStudentComment> {
  try {
    return await api.post<GeneratedStudentComment>('/ai/student-comment', payload);
  } catch (error: any) {
    throw new Error(error?.message || 'Không thể tạo nội dung lúc này. Vui lòng thử lại.');
  }
}
