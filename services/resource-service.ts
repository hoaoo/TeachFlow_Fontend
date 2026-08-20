import { api, apiClient, getAccessToken } from './api-client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface TeachingResource {
  id: string;
  name: string;
  title: string;
  originalFileName?: string;
  resourceType: 'DOCUMENT' | 'PRESENTATION' | 'SPREADSHEET' | 'IMAGE' | 'VIDEO' | 'OTHER' | string;
  mimeType?: string;
  size?: number;
  formattedSize?: string;
  extension?: string;
  subjectId?: string;
  subjectName?: string;
  gradeId?: string;
  gradeName?: string;
  lessonId?: string;
  lessonTitle?: string;
  subtitle?: string;
  description?: string;
  status: string;
  meta: string;
  tone: string;
  createdAt: string;
  updatedAt?: string;
}

export async function uploadResourceFile(
  formData: FormData,
): Promise<TeachingResource> {
  const token = getAccessToken();
  const response = await fetch(`${API_BASE_URL}/resources/upload`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
    credentials: 'include',
  });

  if (!response.ok) {
    let errorMsg = 'Không thể tải lên tập tin';
    try {
      const errorJson = await response.json();
      errorMsg = Array.isArray(errorJson.message)
        ? errorJson.message.join(', ')
        : errorJson.message || errorMsg;
    } catch {}
    throw new Error(errorMsg);
  }

  return await response.json();
}

export async function getResources(params?: {
  subjectId?: string;
  gradeId?: string;
  resourceType?: string;
  search?: string;
}): Promise<TeachingResource[]> {
  const query = new URLSearchParams();
  if (params?.subjectId) query.set('subjectId', params.subjectId);
  if (params?.gradeId) query.set('gradeId', params.gradeId);
  if (params?.resourceType && params.resourceType !== 'ALL')
    query.set('resourceType', params.resourceType);
  if (params?.search) query.set('search', params.search);

  const queryString = query.toString() ? `?${query.toString()}` : '';
  return api.get<TeachingResource[]>(`/resources${queryString}`);
}

export async function getResource(id: string): Promise<TeachingResource> {
  return api.get<TeachingResource>(`/resources/${id}`);
}

export async function deleteResource(id: string): Promise<void> {
  return api.delete(`/resources/${id}`);
}

export async function downloadResourceFile(id: string, fallbackName?: string): Promise<void> {
  const token = getAccessToken();
  const url = `${API_BASE_URL}/resources/${id}/download`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
  });

  if (!response.ok) {
    let errorMsg = 'Không thể tải xuống tệp tin';
    try {
      const errorJson = await response.json();
      errorMsg = errorJson.message || errorMsg;
    } catch {}
    throw new Error(errorMsg);
  }

  let filename = fallbackName || 'tai_nguyen_day_hoc';
  const disposition = response.headers.get('content-disposition');
  if (disposition) {
    const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match && utf8Match[1]) {
      filename = decodeURIComponent(utf8Match[1]);
    } else {
      const regularMatch = disposition.match(/filename="?([^";]+)"?/i);
      if (regularMatch && regularMatch[1]) {
        filename = regularMatch[1];
      }
    }
  }

  const blob = await response.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(blobUrl);
}

export async function attachResourceToLessonPlan(
  lessonPlanId: string,
  resourceId: string,
): Promise<any> {
  return api.post(`/lesson-plans/${lessonPlanId}/resources/${resourceId}`);
}

export async function detachResourceFromLessonPlan(
  lessonPlanId: string,
  resourceId: string,
): Promise<void> {
  return api.delete(`/lesson-plans/${lessonPlanId}/resources/${resourceId}`);
}

export async function getLessonPlanResources(lessonPlanId: string): Promise<any[]> {
  return api.get(`/lesson-plans/${lessonPlanId}/resources`);
}
