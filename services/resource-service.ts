import { api, apiClient, getAccessToken, API_BASE_URL } from './api-client';
import { saveBlob } from './file-save-service';

export type CanonicalResourceType =
  | 'PDF'
  | 'IMAGE'
  | 'AUDIO'
  | 'VIDEO'
  | 'TEXT'
  | 'WORD'
  | 'EXCEL'
  | 'POWERPOINT'
  | 'OTHER';

export interface TeachingResource {
  id: string;
  name: string;
  title: string;
  originalFileName?: string | null;
  storedFileName?: string | null;
  resourceType: 'DOCUMENT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'PRESENTATION' | 'SPREADSHEET' | 'OTHER' | string;
  mimeType?: string | null;
  size?: number | null;
  formattedSize?: string | null;
  extension?: string | null;
  subjectId?: string | null;
  subjectName?: string | null;
  gradeId?: string | null;
  gradeName?: string | null;
  lessonId?: string | null;
  lessonTitle?: string | null;
  subtitle?: string | null;
  description?: string | null;
  status: string;
  meta: string;
  tone: string;
  previewStatus?: 'NONE' | 'PENDING' | 'READY' | 'FAILED' | string | null;
  previewStorageKey?: string | null;
  previewMimeType?: string | null;
  previewGeneratedAt?: string | null;
  previewError?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export function detectResourceType(input: {
  mimeType?: string | null;
  extension?: string | null;
  resourceType?: string | null;
  originalFileName?: string | null;
  name?: string | null;
}): CanonicalResourceType {
  const mime = (input.mimeType || '').toLowerCase().trim();
  const rawName = input.originalFileName || input.name || '';
  const ext = (input.extension || (rawName.includes('.') ? rawName.split('.').pop() : '') || '')
    .toLowerCase()
    .replace(/^\./, '')
    .trim();
  const type = (input.resourceType || '').toUpperCase().trim();

  // 1. Check MIME & Extension
  if (mime === 'application/pdf' || ext === 'pdf') return 'PDF';
  if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg'].includes(ext)) return 'IMAGE';
  if (mime.startsWith('audio/') || ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac'].includes(ext)) return 'AUDIO';
  if (mime.startsWith('video/') || ['mp4', 'webm', 'mov', 'mkv', 'avi'].includes(ext)) return 'VIDEO';
  if (
    mime.includes('presentation') ||
    mime.includes('powerpoint') ||
    ['pptx', 'ppt'].includes(ext) ||
    type === 'PRESENTATION'
  ) {
    return 'POWERPOINT';
  }
  if (
    mime.includes('spreadsheet') ||
    mime.includes('excel') ||
    ['xlsx', 'xls', 'csv'].includes(ext) ||
    type === 'SPREADSHEET'
  ) {
    return 'EXCEL';
  }
  if (
    mime.includes('wordprocessingml') ||
    mime.includes('msword') ||
    ['docx', 'doc'].includes(ext)
  ) {
    return 'WORD';
  }
  if (mime.startsWith('text/') || ext === 'txt' || ext === 'md' || ext === 'json') return 'TEXT';

  // 2. Resource type fallback
  if (type === 'IMAGE') return 'IMAGE';
  if (type === 'AUDIO') return 'AUDIO';
  if (type === 'VIDEO') return 'VIDEO';
  if (type === 'DOCUMENT') return 'WORD';

  return 'OTHER';
}

export function uploadResourceFileWithProgress(
  formData: FormData,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal,
): Promise<TeachingResource> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const token = getAccessToken();

    xhr.open('POST', `${API_BASE_URL}/resources/upload`, true);
    xhr.withCredentials = true;
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };
    }

    if (signal) {
      signal.addEventListener('abort', () => {
        xhr.abort();
        reject(new Error('Tải lên đã bị hủy'));
      });
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve(data);
        } catch {
          reject(new Error('Phản hồi từ máy chủ không hợp lệ'));
        }
      } else {
        let errorMsg = 'Không thể tải lên tập tin';
        try {
          const errorJson = JSON.parse(xhr.responseText);
          errorMsg = Array.isArray(errorJson.message)
            ? errorJson.message.join(', ')
            : errorJson.message || errorMsg;
        } catch {}
        reject(new Error(errorMsg));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Mất kết nối với máy chủ khi tải lên'));
    };

    xhr.ontimeout = () => {
      reject(new Error('Hết thời gian chờ tải lên tệp tin'));
    };

    xhr.send(formData);
  });
}

export async function uploadResourceFile(
  formData: FormData,
): Promise<TeachingResource> {
  return uploadResourceFileWithProgress(formData);
}

export async function updateResource(
  id: string,
  data: { name?: string; title?: string; description?: string; subtitle?: string; tone?: string },
): Promise<TeachingResource> {
  return api.patch(`/resources/${id}`, data);
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
  const data = await api.get<TeachingResource[]>(`/resources${queryString}`);
  return Array.isArray(data) ? data : [];
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

  await saveBlob(await response.blob(), filename);
}

export async function getResourceFileBlob(id: string): Promise<{ blob: Blob; mimeType: string; filename: string }> {
  const token = getAccessToken();
  const url = `${API_BASE_URL}/resources/${id}/file`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
  });

  if (!response.ok) {
    let errorMsg = 'Không thể tải tệp tin xem trước';
    try {
      const errorJson = await response.json();
      errorMsg = errorJson.message || errorMsg;
    } catch {}
    throw new Error(errorMsg);
  }

  let filename = 'tai_nguyen';
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

  const mimeType = response.headers.get('content-type') || 'application/octet-stream';
  const blob = await response.blob();
  return { blob, mimeType, filename };
}

export async function getResourcePreviewBlob(id: string): Promise<{ blob: Blob; mimeType: string; filename: string }> {
  const token = getAccessToken();
  const url = `${API_BASE_URL}/resources/${id}/preview`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
  });

  if (!response.ok) {
    let errorMsg = 'Không thể tải bản xem trước';
    try {
      const errorJson = await response.json();
      errorMsg = errorJson.message || errorMsg;
    } catch {}
    throw new Error(errorMsg);
  }

  let filename = 'preview.pdf';
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

  const mimeType = response.headers.get('content-type') || 'application/pdf';
  const blob = await response.blob();
  return { blob, mimeType, filename };
}

export async function getResourceFileArrayBuffer(id: string): Promise<{ buffer: ArrayBuffer; mimeType: string; filename: string }> {
  const { blob, mimeType, filename } = await getResourceFileBlob(id);
  const buffer = await blob.arrayBuffer();
  return { buffer, mimeType, filename };
}

export function getResourceInlineUrl(id: string): string {
  return `${API_BASE_URL}/resources/${id}/file`;
}

export function getResourcePreviewUrl(id: string): string {
  return `${API_BASE_URL}/resources/${id}/preview`;
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

export async function openResourceInDefaultApp(id: string, fallbackName?: string): Promise<void> {
  const { blob, filename } = await getResourceFileBlob(id);
  const targetName = fallbackName || filename || 'tai_nguyen';
  await saveBlob(blob, targetName);
}
