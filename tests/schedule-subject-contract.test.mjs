import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('schedule create and update use a trimmed free-text subjectName', async () => {
  const [service, view] = await Promise.all([
    readFile(new URL('../services/schedule-service.ts', import.meta.url), 'utf8'),
    readFile(new URL('../components/schedule-view.tsx', import.meta.url), 'utf8'),
  ])

  assert.match(service, /subjectId: string \| null/)
  assert.match(service, /subjectName: string \| null/)
  assert.match(service, /interface CreateScheduleData[\s\S]*subjectName: string/)
  assert.match(service, /interface UpdateScheduleData[\s\S]*subjectName\?: string/)
  assert.doesNotMatch(service, /getAvailableScheduleSubjects/)

  assert.match(view, /const \[subjectName, setSubjectName\] = useState\(''\)/)
  assert.match(view, /const trimmedSubjectName = subjectName\.trim\(\)/)
  assert.match(view, /subjectName: trimmedSubjectName/)
  assert.match(view, /id="sch-subject"[\s\S]*maxLength=\{100\}[\s\S]*required/)
  assert.doesNotMatch(view, /getAvailableScheduleSubjects/)
  assert.doesNotMatch(view, /Chưa có môn học được khai báo cho lớp này/)
})

test('schedule rendering prefers subjectName and keeps the legacy Subject fallback', async () => {
  const view = await readFile(new URL('../components/schedule-view.tsx', import.meta.url), 'utf8')
  assert.match(view, /subjectName \|\| .*subject\?\.name/)
  assert.match(view, /setSubjectName\(editEntry\.subjectName \|\| editEntry\.subject\?\.name \|\| ''\)/)
})
