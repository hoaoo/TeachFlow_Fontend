import { api } from './api-client';

export type LibraryActivity = {
  id: string;
  title: string;
  subject: string;
  grade: string;
  type: string;
  uses: number;
  icon: string;
  description?: string;
};

export async function getLibraryActivities(subject?: string): Promise<LibraryActivity[]> {
  try {
    const query = subject && subject !== 'Tất cả' ? `?subject=${encodeURIComponent(subject)}` : '';
    const data = await api.get<LibraryActivity[]>(`/activities${query}`);
    return Array.isArray(data) ? data : [];
  } catch {
    return [
      { id: 'act-1', title: 'Bingo phân số', subject: 'Toán', grade: 'Lớp 4', type: 'Trò chơi', uses: 128, icon: 'Grid2X2' },
      { id: 'act-2', title: 'Chiếc hộp bí mật', subject: 'Tiếng Việt', grade: 'Lớp 3-5', type: 'Khởi động', uses: 96, icon: 'Gift' },
      { id: 'act-3', title: 'Nhà khoa học nhí', subject: 'Khoa học', grade: 'Lớp 4', type: 'Khám phá', uses: 74, icon: 'FlaskConical' },
    ];
  }
}

export async function createLibraryActivity(data: {
  title: string;
  subject?: string;
  grade?: string;
  type?: string;
  description?: string;
}): Promise<LibraryActivity> {
  return await api.post<LibraryActivity>('/activities', data);
}

export async function updateLibraryActivity(
  id: string,
  data: Partial<{ title: string; subject: string; grade: string; type: string; description: string }>,
): Promise<LibraryActivity> {
  return await api.patch<LibraryActivity>(`/activities/${id}`, data);
}

export async function deleteLibraryActivity(id: string): Promise<void> {
  await api.delete(`/activities/${id}`);
}

