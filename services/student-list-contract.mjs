const ALL_FILTER_VALUES = new Set(['all', 'tất cả']);

function hasFilterValue(value) {
  return typeof value === 'string'
    ? value.trim() !== '' && !ALL_FILTER_VALUES.has(value.trim().toLocaleLowerCase('vi'))
    : value !== undefined && value !== null;
}

export function buildStudentListUrl(query = {}) {
  const params = new URLSearchParams();
  if (query.page) params.set('page', String(query.page));
  if (query.pageSize) params.set('pageSize', String(query.pageSize));
  if (hasFilterValue(query.keyword)) params.set('keyword', query.keyword.trim());
  if (hasFilterValue(query.classId)) params.set('classId', query.classId);
  if (hasFilterValue(query.gradeId)) params.set('gradeId', query.gradeId);
  if (hasFilterValue(query.schoolYearId)) params.set('schoolYearId', query.schoolYearId);
  if (hasFilterValue(query.status)) params.set('status', query.status);
  if (hasFilterValue(query.sort)) params.set('sort', query.sort);
  const queryString = params.toString();
  return queryString ? `/students?${queryString}` : '/students';
}

export function normalizeStudentListResponse(payload) {
  const candidate = payload?.data?.items ? payload.data : payload;
  if (Array.isArray(candidate)) {
    return {
      items: candidate,
      totalItems: candidate.length,
      page: 1,
      pageSize: 20,
      totalPages: candidate.length > 0 ? 1 : 0,
      summary: {
        totalStudents: candidate.length,
        activeStudents: candidate.length,
        needsSupportStudents: 0,
        avgAttendanceRate: null,
      },
    };
  }

  if (!candidate || !Array.isArray(candidate.items)) {
    throw new TypeError('GET /students returned an invalid response shape');
  }

  const totalItems = candidate.totalItems ?? candidate.total ?? candidate.items.length;
  const page = candidate.page ?? 1;
  const pageSize = candidate.pageSize ?? 20;
  const totalPages = candidate.totalPages ?? (totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize));

  return {
    items: candidate.items,
    totalItems,
    page,
    pageSize,
    totalPages,
    summary: candidate.summary ?? {
      totalStudents: totalItems,
      activeStudents: totalItems,
      needsSupportStudents: 0,
      avgAttendanceRate: null,
    },
  };
}

export const STUDENT_DATA_CHANGED_EVENTS = [
  'teachflow:students-changed',
  'teachflow:classes-changed',
];

export function notifyStudentDataChanged(target = globalThis.window) {
  if (!target) return;
  for (const eventName of STUDENT_DATA_CHANGED_EVENTS) {
    target.dispatchEvent(new Event(eventName));
  }
}
