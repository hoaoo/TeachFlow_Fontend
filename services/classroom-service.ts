import { api } from './api-client';
import { type ClassRecord, type StudentRecord, classroomClasses } from '@/lib/classroom-data';

export async function getClasses(): Promise<ClassRecord[]> {
  try {
    const data = await api.get<ClassRecord[]>('/classes');
    if (Array.isArray(data) && data.length > 0) {
      return data;
    }
    return classroomClasses;
  } catch {
    return classroomClasses;
  }
}

export async function getClassById(id: string): Promise<ClassRecord> {
  try {
    return await api.get<ClassRecord>(`/classes/${id}`);
  } catch {
    const found = classroomClasses.find((c) => c.id === id);
    if (!found) throw new Error('Không tìm thấy lớp học');
    return found;
  }
}

export async function createClass(data: { name: string; room?: string; schedule?: string }): Promise<ClassRecord> {
  return await api.post<ClassRecord>('/classes', data);
}

export async function deleteClass(id: string): Promise<void> {
  await api.delete(`/classes/${id}`);
}

export async function addStudentToClass(
  classId: string,
  data: { fullName: string; gender?: string; dob?: string; parentName?: string; parentPhone?: string; note?: string },
): Promise<ClassRecord> {
  return await api.post<ClassRecord>(`/classes/${classId}/students`, data);
}

export async function removeStudentFromClass(classId: string, studentId: string): Promise<void> {
  await api.delete(`/classes/${classId}/students/${studentId}`);
}

export async function getStudentOverview(studentId: string) {
  try {
    return await api.get(`/students/${studentId}/overview`);
  } catch {
    return null;
  }
}

export async function getStudentAttendance(studentId: string) {
  try {
    return await api.get<Array<{ date: string; type: string; note: string }>>(`/students/${studentId}/attendance`);
  } catch {
    return [
      { date: '20/08/2026', type: 'Có mặt', note: 'Đúng giờ' },
      { date: '19/08/2026', type: 'Có mặt', note: 'Đúng giờ' },
      { date: '18/08/2026', type: 'Đi muộn', note: 'Muộn 10 phút' },
      { date: '17/08/2026', type: 'Có mặt', note: 'Đúng giờ' },
    ];
  }
}

export async function getStudentAssessments(studentId: string) {
  try {
    return await api.get<Array<{ subject: string; score: number; average: number }>>(`/students/${studentId}/assessments`);
  } catch {
    return [
      { subject: 'Toán', score: 9.1, average: 9.1 },
      { subject: 'Tiếng Việt', score: 8.7, average: 8.7 },
      { subject: 'Khoa học', score: 8.9, average: 8.9 },
      { subject: 'Lịch sử & Địa lý', score: 8.2, average: 8.2 },
    ];
  }
}

export async function getStudentComments(studentId: string) {
  try {
    return await api.get<Array<{ id: string; content: string; date: string; teacherName: string }>>(`/students/${studentId}/comments`);
  } catch {
    return [];
  }
}

export async function addStudentComment(studentId: string, content: string, classroomId?: string) {
  return await api.post(`/students/${studentId}/comments`, { content, classroomId });
}
