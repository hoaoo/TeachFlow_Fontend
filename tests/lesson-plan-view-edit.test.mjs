import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Lesson plan cards expose primary Xem / Sửa action and secondary actions for all plans', async () => {
  const component = await readFile(new URL('../components/lesson-editor.tsx', import.meta.url), 'utf8');

  // Primary action button
  assert.match(component, /<Eye className="size-3.5" \/> Xem \/ Sửa/);
  // Secondary actions
  assert.match(component, /<Download className="size-3.5" \/> Tải xuống/);
  assert.match(component, /<Link2 className="size-3.5" \/> Lịch dạy/);
  assert.match(component, /<Copy className="size-3.5" \/>/);
  assert.match(component, /<Trash2 className="size-3.5" \/>/);
});

test('Editor view includes full toolbar with back, save status, manual save, preview toggle, and exports', async () => {
  const component = await readFile(new URL('../components/lesson-editor.tsx', import.meta.url), 'utf8');

  assert.match(component, /handleBackToList/);
  assert.match(component, /handleManualSave/);
  assert.match(component, /<Save className="size-3.5"/);
  assert.match(component, /Chỉnh sửa/);
  assert.match(component, /Xem trước/);
  assert.match(component, /Xuất Word/);
  assert.match(component, /Xuất PDF/);
});

test('PDF lesson plans expose dedicated viewer with fixed-format notice and metadata editing', async () => {
  const component = await readFile(new URL('../components/lesson-editor.tsx', import.meta.url), 'utf8');

  assert.match(component, /Tệp PDF là tài liệu định dạng cố định/);
  assert.match(component, /getLessonPlanFileUrl\(lesson\.id!\)/);
  assert.match(component, /Thông tin giáo án PDF/);
});

test('Lesson service exports importDocxToLessonPlan and download contracts', async () => {
  const service = await readFile(new URL('../services/lesson-service.ts', import.meta.url), 'utf8');

  assert.match(service, /export async function importDocxToLessonPlan/);
  assert.match(service, /export async function downloadLessonPlanFile/);
  assert.match(service, /export function getLessonPlanFileUrl/);
  assert.match(service, /export async function updateLessonPlan/);
});

test('Autosave handles concurrency conflicts gracefully with user toast', async () => {
  const component = await readFile(new URL('../components/lesson-editor.tsx', import.meta.url), 'utf8');

  assert.match(component, /Giáo án đã được thay đổi ở một phiên khác/);
  assert.match(component, /Xung đột phiên bản \(Vui lòng tải lại\)/);
});
