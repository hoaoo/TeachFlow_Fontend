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

export type LessonPlanEditorDraft = {
  title: string;
  topic?: string;
  subject?: string;
  grade?: string;
  duration?: number;
  objective?: string;
  specificCompetencies?: string;
  generalCompetencies?: string;
  qualities?: string;
  teachingEquipment?: string;
  status?: string;
  activities: Array<{
    phase: string;
    title: string;
    minutes: number;
    method?: string;
    technique?: string;
    competencies?: string;
    qualities?: string;
    equipment?: string;
    objective?: string;
    teacher?: string;
    students?: string;
    sortOrder?: number;
  }>;
};

export async function generateLessonPlan(payload: {
  grade: number;
  subject: string;
  lessonTitle: string;
  durationMinutes?: number;
  requirements?: string;
  numberOfPeriods?: number;
  objectives?: string;
  qualities?: string;
  competencies?: string;
  teacherContent?: string;
  additionalRequirements?: string;
}): Promise<GeneratedLessonPlan & { editorDraft?: LessonPlanEditorDraft }> {
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

export type WorksheetEditorDraft = {
  title: string;
  description?: string;
  subtitle?: string;
  status?: string;
  questions: Array<{
    questionType: string;
    content: string;
    options?: string[];
    correctAnswer?: string;
    explanation?: string;
    sortOrder?: number;
  }>;
};

export async function generateWorksheet(payload: {
  grade: number;
  subject: string;
  lesson: string;
  numberOfQuestions?: number;
  difficulty?: string;
  questionTypes?: string[];
  knowledgeContent?: string;
  includeAnswers?: boolean;
  includeIllustrations?: boolean;
  additionalRequirements?: string;
}): Promise<GeneratedWorksheet & { editorDraft?: WorksheetEditorDraft }> {
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

export type GeneratedImageResource = {
  resourceId: string;
  id: string;
  fileName?: string;
  mimeType?: string;
  name?: string;
  resourceType?: string;
  formattedSize?: string;
};

export async function generateImage(payload: {
  prompt: string;
  style?: string;
  aspectRatio?: string;
  purpose?: 'lesson-plan' | 'worksheet' | 'resource';
  title?: string;
  lessonPlanId?: string;
}): Promise<GeneratedImageResource> {
  try {
    return await api.post<GeneratedImageResource>('/ai/images/generate', payload);
  } catch (error: any) {
    throw new Error(error?.message || 'Không thể tạo ảnh lúc này. Vui lòng thử lại.');
  }
}

export type ImportStudentPreviewRow = {
  fullName: string;
  studentCode?: string;
  gender?: string;
  dob?: string;
  parentName?: string;
  parentPhone?: string;
  note?: string;
  valid: boolean;
  errors: string[];
};

export async function analyzeImportFile(formData: FormData): Promise<{
  target: string;
  fileName?: string;
  totalRows?: number;
  validCount?: number;
  errorCount?: number;
  rows?: ImportStudentPreviewRow[];
  draft?: any;
  persisted: boolean;
  message?: string;
}> {
  try {
    return await api.postForm('/ai/import/analyze', formData);
  } catch (error: any) {
    throw new Error(error?.message || 'Không thể phân tích tệp lúc này. Vui lòng thử lại.');
  }
}


export async function generateHomeroomSummary(payload: { classroomId: string; period: 'WEEK' | 'MONTH'; weekNumber?: number }) { return api.post<any>('/ai/homeroom-summary', payload); }

export async function sendAiChat(payload: {
  message: string;
  history?: string;
  context?: string;
  file?: File;
}): Promise<{ reply: string; data?: any }> {
  try {
    if (payload.file) {
      const formData = new FormData();
      formData.append('message', payload.message);
      formData.append('file', payload.file);
      if (payload.history) formData.append('history', payload.history);
      if (payload.context) formData.append('context', payload.context);
      return await api.postForm<{ reply: string; data?: any }>('/ai/chat', formData);
    }
    return await api.post<{ reply: string; data?: any }>('/ai/chat', {
      message: payload.message,
      history: payload.history,
      context: payload.context,
    });
  } catch (error: any) {
    throw new Error(error?.message || 'Không thể kết nối đến Trợ lý AI. Vui lòng thử lại.');
  }
}
