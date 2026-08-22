import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStudentListUrl, normalizeStudentListResponse, notifyStudentDataChanged } from '../services/student-list-contract.mjs';

const students = Array.from({ length: 5 }, (_, index) => ({ id: `student-${index + 1}` }));

test('normalizes five students and KPI total', () => {
  const result = normalizeStudentListResponse({ items: students, totalItems: 5, summary: { totalStudents: 5 } });
  assert.equal(result.items.length, 5);
  assert.equal(result.totalItems, 5);
  assert.equal(result.summary.totalStudents, 5);
});

test('normalizes wrapped data without losing students', () => {
  const result = normalizeStudentListResponse({ data: { items: students, total: 5 } });
  assert.equal(result.items.length, 5);
  assert.equal(result.totalItems, 5);
});

test('invalid response is not silently converted to an empty list', () => {
  assert.throws(() => normalizeStudentListResponse({ data: { unexpected: students } }), /invalid response shape/);
});

test('All filters are omitted from GET students', () => {
  const url = buildStudentListUrl({ classId: 'ALL', gradeId: 'Tất cả', schoolYearId: 'all', status: 'ALL', sort: 'nameAsc' });
  assert.equal(url, '/students?sort=nameAsc');
});

test('classroom save invalidates global list and KPI listeners', () => {
  const target = new EventTarget();
  let listRefetches = 0;
  let kpiRefetches = 0;
  target.addEventListener('teachflow:students-changed', () => listRefetches++);
  target.addEventListener('teachflow:classes-changed', () => kpiRefetches++);
  notifyStudentDataChanged(target);
  assert.equal(listRefetches, 1);
  assert.equal(kpiRefetches, 1);
});
