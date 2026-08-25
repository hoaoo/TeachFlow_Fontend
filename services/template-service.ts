import { api } from './api-client';
export type TeacherTemplate = { id: string; type: string; name: string; description?: string | null; content: any; updatedAt: string };
export async function getTemplates(type?: string) { return api.get<TeacherTemplate[]>('/templates' + (type ? '?type=' + encodeURIComponent(type) : '')); }
export async function useTemplate(id: string) { return api.post<any>('/templates/' + id + '/use', {}); }
export async function saveTemplate(data: any) { return api.post<TeacherTemplate>('/templates', data); }
