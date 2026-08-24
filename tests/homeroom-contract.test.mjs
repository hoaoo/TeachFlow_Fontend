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
  assert.match(viewSource, /setHomeroomState\('loading'\)/);
});

test('behavior form uses the complete active classroom roster', () => {
  assert.match(serviceSource, /students: Array/);
  assert.match(viewSource, /dashboardData.*students\.map/);
  assert.match(viewSource, /student\.fullName/);
});

test('renders the required no-homeroom empty state and classroom CTA', () => {
  assert.match(viewSource, /u1ea1n.*?u1ec7m/);
  assert.match(viewSource, /u00e3y.*?u1eadp/);
  assert.match(viewSource, /u1ecdn l.*?u1ec7m/);
  assert.match(viewSource, /homeroomState === 'empty'/);
});

test('homeroom badge and actions depend on authenticated teacher assignment', () => {
  assert.match(classroomSource, /item\.homeroomTeacherId === authenticatedTeacherId/);
  assert.match(classroomSource, /item\.teacherId === authenticatedTeacherId/);
  assert.match(classroomSource, /aria-label=/);
  assert.match(classroomSource, /\\\\u0110\\\\u1eb7t l.*?nhi\\\\u1ec7m/);
  assert.match(classroomSource, /B\\\\?f.*?nhi\\\\?m/);
  assert.match(classroomSource, /!classroom\.schoolYear\.isCurrent/);
});
