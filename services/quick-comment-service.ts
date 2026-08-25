import { api } from './api-client';
export async function createBatchComments(classroomId: string, studentIds: string[], content: string, commentDate?: string) { return api.post('/classrooms/' + classroomId + '/comments/batch', { classroomId, studentIds, content, commentDate }); }
