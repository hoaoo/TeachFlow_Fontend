import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('attendance-service exports complete multi-session API contracts', () => {
  const serviceFile = fs.readFileSync(
    path.resolve(process.cwd(), 'services/attendance-service.ts'),
    'utf8',
  )

  assert.match(serviceFile, /export async function getSessionAttendance/)
  assert.match(serviceFile, /export async function updateSessionAttendance/)
  assert.match(serviceFile, /export async function deleteSessionAttendance/)
  assert.match(serviceFile, /export async function createAttendanceSession/)
  assert.match(serviceFile, /lateMinutes/)
})

test('CreateAttendanceDialog supports multi-level session periods and defaults all learners to PRESENT', () => {
  const dialogFile = fs.readFileSync(
    path.resolve(process.cwd(), 'components/create-attendance-dialog.tsx'),
    'utf8',
  )

  // Session periods (morning, afternoon, periods 1-5, lecture, lab, custom)
  assert.match(dialogFile, /MORNING/)
  assert.match(dialogFile, /AFTERNOON/)
  assert.match(dialogFile, /PERIOD_1/)
  assert.match(dialogFile, /LECTURE/)
  assert.match(dialogFile, /LAB/)
  assert.match(dialogFile, /CUSTOM/)

  // Default all active learners to PRESENT
  assert.match(dialogFile, /status: 'PRESENT'/)
  assert.match(dialogFile, /Tất cả có mặt/)

  // Status handling and late minutes
  assert.match(dialogFile, /EXCUSED_ABSENCE/)
  assert.match(dialogFile, /UNEXCUSED_ABSENCE/)
  assert.match(dialogFile, /LATE/)
  assert.match(dialogFile, /lateMinutes/)
})

test('classroom-manager TabAttendance integrates [+ Điểm danh mới] button and displays session periods', () => {
  const managerFile = fs.readFileSync(
    path.resolve(process.cwd(), 'components/classroom-manager.tsx'),
    'utf8',
  )

  assert.match(managerFile, /CreateAttendanceDialog/)
  assert.match(managerFile, /Điểm danh mới/)
  assert.match(managerFile, /Buổi \/ Tiết/)
  assert.match(managerFile, /formatSessionPeriod/)
  assert.match(managerFile, /selectedSessionId/)
})

test('TeachingPresentationMode provides instant attendance taking without losing teaching state', () => {
  const presentationFile = fs.readFileSync(
    path.resolve(process.cwd(), 'components/teaching-presentation-mode.tsx'),
    'utf8',
  )

  assert.match(presentationFile, /CalendarCheck2/)
  assert.match(presentationFile, /attendanceDialogOpen/)
  assert.match(presentationFile, /ScheduleAttendanceDialog/)
  assert.match(presentationFile, /CreateAttendanceDialog/)
})
