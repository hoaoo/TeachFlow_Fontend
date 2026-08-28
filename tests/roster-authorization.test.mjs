import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { canManageClassroomRoster } from '../services/roster-authorization.mjs'

const classroom = {
  id: 'class-a',
  teacherId: 'teacher-owner',
  homeroomTeacherId: 'teacher-homeroom',
}

test('only the exact homeroom teacher can manage a classroom roster', () => {
  assert.equal(canManageClassroomRoster(classroom, 'teacher-homeroom'), true)
  assert.equal(canManageClassroomRoster(classroom, 'teacher-owner'), false)
  assert.equal(canManageClassroomRoster(classroom, 'teacher-subject'), false)
  assert.equal(canManageClassroomRoster(classroom, 'teacher-other'), false)
  assert.equal(canManageClassroomRoster(classroom, undefined), false)
})

test('student and classroom screens gate roster mutation actions with the canonical helper', async () => {
  const [studentManager, classroomManager] = await Promise.all([
    readFile(new URL('../components/student-manager.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/classroom-manager.tsx', import.meta.url), 'utf8'),
  ])

  assert.match(studentManager, /canManageClassroomRoster\(classroom, authenticatedTeacherId\)/)
  assert.match(studentManager, /hidden=\{homeroomClasses\.length === 0\}/)
  assert.match(studentManager, /disabled=\{!canManageStudentRoster\(s\)\}/)
  assert.match(classroomManager, /canManageClassroomRoster\(classItem, authenticatedTeacherId\)/)
  assert.match(classroomManager, /hidden=\{!canManageRoster\}/)
})
