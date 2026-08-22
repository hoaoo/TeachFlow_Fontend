import { api } from './api-client';

export type LibraryActivity = {
  id: string;
  teacherId?: string | null;
  isOwner?: boolean;
  isSystem?: boolean;
  title: string;
  subject: string;
  grade: string;
  type: string;
  typeName?: string;
  durationMinutes: number;
  objective?: string;
  method?: string;
  technique?: string;
  competencies?: string;
  qualities?: string;
  equipment?: string;
  teacherActivity?: string;
  studentActivity?: string;
  gameRules?: string;
  questionsJson?: any;
  description?: string;
  uses?: number;
  icon?: string;
  isPublic?: boolean;
  updatedAt?: string;
  createdAt?: string;
};

export type LibraryActivitiesResponse = {
  items: LibraryActivity[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export async function getLibraryActivities(params?: {
  subject?: string;
  grade?: string;
  type?: string;
  method?: string;
  technique?: string;
  keyword?: string;
  scope?: 'ALL' | 'MINE' | 'SYSTEM' | string;
  page?: number;
  limit?: number;
}): Promise<LibraryActivitiesResponse> {
  try {
    const query = new URLSearchParams();
    if (params?.subject && params.subject !== 'Tất cả') query.set('subject', params.subject);
    if (params?.grade && params.grade !== 'Tất cả') query.set('grade', params.grade);
    if (params?.type && params.type !== 'Tất cả') query.set('type', params.type);
    if (params?.method && params.method !== 'Tất cả') query.set('method', params.method);
    if (params?.technique && params.technique !== 'Tất cả') query.set('technique', params.technique);
    if (params?.keyword) query.set('keyword', params.keyword);
    if (params?.scope) query.set('scope', params.scope);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));

    const qs = query.toString() ? `?${query.toString()}` : '';
    const data = await api.get<any>(`/activities${qs}`);

    if (Array.isArray(data)) {
      return {
        items: data,
        total: data.length,
        page: 1,
        limit: data.length,
        totalPages: 1,
      };
    }

    if (data && Array.isArray(data.items)) {
      return data;
    }

    return { items: [], total: 0, page: 1, limit: 20, totalPages: 1 };
  } catch {
    return {
      items: [
        {
          id: 'act-1',
          title: 'Bingo phân số bằng nhau',
          subject: 'Toán',
          grade: 'Lớp 4',
          type: 'Trò chơi',
          durationMinutes: 10,
          objective: 'Củng cố quy tắc phân số bằng nhau',
          method: 'Trò chơi học tập',
          technique: 'Tia chớp',
          teacherActivity: 'GV quay số và đọc phân số',
          studentActivity: 'HS tìm và gạch ô trên bảng bingo',
          gameRules: '3 ô thẳng hàng là Bingo!',
          uses: 128,
          icon: 'Grid2X2',
          isPublic: true,
          isSystem: true,
        },
        {
          id: 'act-2',
          title: 'Chiếc hộp bí mật',
          subject: 'Tiếng Việt',
          grade: 'Lớp 4',
          type: 'Khởi động',
          durationMinutes: 5,
          objective: 'Kích thích trí tò mò, mở đầu bài học sinh động',
          method: 'Trực quan, gợi mở',
          technique: 'Động não',
          teacherActivity: 'GV đưa ra chiếc hộp bí mật',
          studentActivity: 'HS dùng xúc giác sờ và miêu tả cảm giác',
          uses: 96,
          icon: 'Gift',
          isPublic: true,
          isSystem: true,
        },
        {
          id: 'act-3',
          title: 'Mảnh ghép khám phá',
          subject: 'Khoa học',
          grade: 'Lớp 4',
          type: 'Khám phá',
          durationMinutes: 15,
          objective: 'Hình thành kiến thức mới qua hợp tác nhóm chuyên gia',
          method: 'Dạy học hợp tác',
          technique: 'Mảnh ghép',
          teacherActivity: 'GV chia nhóm chuyên gia và điều phối',
          studentActivity: 'HS thảo luận sâu rồi chia sẻ lại cho nhóm mới',
          uses: 74,
          icon: 'Puzzle',
          isPublic: true,
          isSystem: true,
        },
      ],
      total: 3,
      page: 1,
      limit: 20,
      totalPages: 1,
    };
  }
}

export async function getLibraryActivityById(id: string): Promise<LibraryActivity> {
  return await api.get<LibraryActivity>(`/activities/${id}`);
}

export async function createLibraryActivity(data: Partial<LibraryActivity>): Promise<LibraryActivity> {
  return await api.post<LibraryActivity>('/activities', data);
}

export async function updateLibraryActivity(
  id: string,
  data: Partial<LibraryActivity>,
): Promise<LibraryActivity> {
  return await api.patch<LibraryActivity>(`/activities/${id}`, data);
}

export async function deleteLibraryActivity(id: string): Promise<void> {
  await api.delete(`/activities/${id}`);
}

export async function duplicateLibraryActivity(id: string): Promise<LibraryActivity> {
  return await api.post<LibraryActivity>(`/activities/${id}/duplicate`);
}

export async function addLibraryActivityToLessonPlan(
  activityId: string,
  lessonPlanId: string,
): Promise<any> {
  return await api.post(`/activities/${activityId}/add-to-lesson-plan`, { lessonPlanId });
}
