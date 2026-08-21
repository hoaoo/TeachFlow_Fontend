import { api } from './api-client';

export interface AuditLogRecord {
  id: string;
  actorUserId: string;
  actorEmail?: string | null;
  action: string;
  targetUserId?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  status?: string | null;
  ipAddress?: string | null;
  details?: string | null;
  createdAt: string;
}

export interface AuditQueryParams {
  action?: string;
  actorUserId?: string;
  resourceType?: string;
  resourceId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedAuditLogs {
  items: AuditLogRecord[];
  totalItems: number;
  totalPages: number;
  page: number;
  pageSize: number;
}

export async function getAuditLogs(params?: AuditQueryParams): Promise<PaginatedAuditLogs> {
  const query = new URLSearchParams();
  if (params?.action) query.append('action', params.action);
  if (params?.actorUserId) query.append('actorUserId', params.actorUserId);
  if (params?.resourceType) query.append('resourceType', params.resourceType);
  if (params?.status) query.append('status', params.status);
  if (params?.dateFrom) query.append('dateFrom', params.dateFrom);
  if (params?.dateTo) query.append('dateTo', params.dateTo);
  if (params?.keyword) query.append('keyword', params.keyword);
  if (params?.page) query.append('page', String(params.page));
  if (params?.pageSize) query.append('pageSize', String(params.pageSize));

  const qs = query.toString();
  const url = qs ? `/admin/audit-logs?${qs}` : '/admin/audit-logs';

  return api.get<PaginatedAuditLogs>(url);
}
