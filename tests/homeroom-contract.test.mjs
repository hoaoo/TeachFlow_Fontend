import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const viewSource = readFileSync(new URL('../components/homeroom-view.tsx', import.meta.url), 'utf8');
const classroomSource = readFileSync(new URL('../components/classroom-manager.tsx', import.meta.url), 'utf8');
const serviceSource = readFileSync(new URL('../services/homeroom-service.ts', import.meta.url), 'utf8');

test('homeroom loads only the dedicated homeroom classroom endpoint', () => {
  assert.match(serviceSource, /homeroom\/classrooms/);
  assert.doesNotMatch(viewSource, /getClasses\(\)/);
});

test('detail dashboard is guarded by a real selected classroom id', () => {
  assert.match(viewSource, /if \(!classId\) return;/);
  assert.match(viewSource, /if \(selectedClassId\) fetchDashboard\(selectedClassId\)/);
});

test('renders the required no-homeroom empty state and classroom CTA', () => {
  assert.match(viewSource, /Chưa có lớp chủ nhiệm/);
  assert.match(viewSource, /Bạn chưa được gán làm giáo viên chủ nhiệm của lớp nào/);
  assert.match(viewSource, /Đi tới Lớp học/);
  assert.match(viewSource, /homeroomState === 'empty'/);
});

test('homeroom badge and actions depend on authenticated teacher assignment', () => {
  assert.match(classroomSource, /item\.homeroomTeacherId === authenticatedTeacherId/);
  assert.match(classroomSource, /Đặt làm lớp chủ nhiệm/);
  assert.match(classroomSource, /Bỏ lớp chủ nhiệm/);
});
