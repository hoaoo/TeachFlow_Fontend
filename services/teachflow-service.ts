import { api } from './api-client';

export type WorkspaceRecord = {
  id: string;
  title: string;
  subtitle: string;
  status: string;
  meta: string;
  tone: 'teal' | 'blue' | 'orange' | 'violet';
};

function getEndpointForView(view: string): string | null {
  switch (view) {
    case 'Lịch dạy':
      return '/teaching-plans';
    case 'Phiếu học tập':
      return '/worksheets';
    case 'Đánh giá':
      return '/assessments';
    case 'Điểm danh':
      return '/attendance/history';
    case 'Tài nguyên':
      return '/resources';
    default:
      return null;
  }
}

export async function listWorkspaceRecords(view: string): Promise<WorkspaceRecord[]> {
  const endpoint = getEndpointForView(view);
  if (!endpoint) {
    return [];
  }

  try {
    const data = await api.get<WorkspaceRecord[]>(endpoint);
    if (Array.isArray(data)) {
      return data;
    }
    return [];
  } catch {
    return [];
  }
}

export async function saveWorkspaceRecord(view: string, record: WorkspaceRecord): Promise<WorkspaceRecord> {
  const endpoint = getEndpointForView(view);
  if (!endpoint) {
    return { ...record, id: record.id || `${view}-${Date.now()}`, status: 'Bản nháp', meta: 'Vừa cập nhật' };
  }

  if (record.id && !record.id.startsWith('mock-')) {
    return await api.patch<WorkspaceRecord>(`${endpoint}/${record.id}`, record);
  } else {
    return await api.post<WorkspaceRecord>(endpoint, {
      title: record.title,
      subtitle: record.subtitle,
      status: record.status,
      meta: record.meta,
      tone: record.tone,
    });
  }
}

export async function deleteWorkspaceRecord(view: string, id: string): Promise<void> {
  const endpoint = getEndpointForView(view);
  if (endpoint && id && !id.startsWith('mock-')) {
    await api.delete(`${endpoint}/${id}`);
  }
}
