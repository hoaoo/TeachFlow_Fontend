import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('Unified ResourceViewer component provides complete multi-format support and controls', () => {
  const viewerFile = fs.readFileSync(
    path.resolve(process.cwd(), 'components/resources/resource-viewer.tsx'),
    'utf8',
  )

  // Verify all supported media renderers
  assert.match(viewerFile, /detectedType === 'IMAGE'/)
  assert.match(viewerFile, /detectedType === 'PDF'/)
  assert.match(viewerFile, /detectedType === 'WORD'/)
  assert.match(viewerFile, /detectedType === 'POWERPOINT'/)
  assert.match(viewerFile, /detectedType === 'VIDEO'/)
  assert.match(viewerFile, /detectedType === 'AUDIO'/)
  assert.match(viewerFile, /detectedType === 'HTML_GAME'/)
  assert.match(viewerFile, /detectedType === 'EXCEL'/)
  assert.match(viewerFile, /detectedType === 'WORKSHEET'/)

  // Verify controls: zoom, rotate, fullscreen, playlist, keyboard shortcuts
  assert.match(viewerFile, /toggleFullscreen/)
  assert.match(viewerFile, /setZoom/)
  assert.match(viewerFile, /setRotation/)
  assert.match(viewerFile, /setPlaybackSpeed/)
  assert.match(viewerFile, /goToPptSlide/)
  assert.match(viewerFile, /ArrowRight/)
  assert.match(viewerFile, /ArrowLeft/)
  assert.match(viewerFile, /Escape/)

  // Verify security: sandbox iframe & sanitize docx
  assert.match(viewerFile, /sandbox="allow-scripts allow-same-origin allow-forms"/)
  assert.match(viewerFile, /sanitizeDocxHtml/)
})

test('TeachingPresentationMode provides classroom presentation UI, activities progression, and pedagogical tools', () => {
  const teachingModeFile = fs.readFileSync(
    path.resolve(process.cwd(), 'components/teaching-presentation-mode.tsx'),
    'utf8',
  )

  // Top header & Context
  assert.match(teachingModeFile, /handleExit/)
  assert.match(teachingModeFile, /Thoát/)
  assert.match(teachingModeFile, /session\.subjectName/)
  assert.match(teachingModeFile, /session\.classroomName/)

  // Quick Classroom Tools
  assert.match(teachingModeFile, /timeStr/) // Realtime clock
  assert.match(teachingModeFile, /formatTimer\(timeLeft\)/) // Countdown timer
  assert.match(teachingModeFile, /pickRandomStudent/) // Random Student Picker
  assert.match(teachingModeFile, /toggleFullscreen/) // Fullscreen

  // Activity progression & Script view
  assert.match(teachingModeFile, /currentActivity/)
  assert.match(teachingModeFile, /Hoạt động của Giáo viên/)
  assert.match(teachingModeFile, /Hoạt động của Học sinh/)
  assert.match(teachingModeFile, /toggleActivityDone/)
  assert.match(teachingModeFile, /handleNextActivity/)
  assert.match(teachingModeFile, /handlePrevActivity/)

  // Embedded Resource Presentation & Floating peek script
  assert.match(teachingModeFile, /<ResourceViewer/)
  assert.match(teachingModeFile, /isEmbedded=\{true\}/)
  assert.match(teachingModeFile, /peekScriptOpen/)
  assert.match(teachingModeFile, /Xem kịch bản GV/)

  // Finish Lesson
  assert.match(teachingModeFile, /handleFinishLesson/)
  assert.match(teachingModeFile, /Kết thúc tiết dạy/)
})

test('Dashboard (Hôm nay) integrates "Bắt đầu tiết dạy" and "Gắn giáo án" triggers', () => {
  const teacherAppFile = fs.readFileSync(
    path.resolve(process.cwd(), 'components/teacher-app.tsx'),
    'utf8',
  )

  assert.match(teacherAppFile, /TeachingPresentationMode/)
  assert.match(teacherAppFile, /teachingSession/)
  assert.match(teacherAppFile, /Bắt đầu tiết dạy/)
  assert.match(teacherAppFile, /Gắn giáo án/)
})

test('Schedule View (Lịch dạy) integrates "Bắt đầu tiết dạy" in lesson detail modal', () => {
  const scheduleFile = fs.readFileSync(
    path.resolve(process.cwd(), 'components/schedule-view.tsx'),
    'utf8',
  )

  assert.match(scheduleFile, /TeachingPresentationMode/)
  assert.match(scheduleFile, /onStartTeaching/)
  assert.match(scheduleFile, /Bắt đầu tiết dạy/)
})

test('Lesson Editor (Kế hoạch bài dạy) integrates "Bắt đầu tiết dạy" in card list and editor toolbar', () => {
  const lessonEditorFile = fs.readFileSync(
    path.resolve(process.cwd(), 'components/lesson-editor.tsx'),
    'utf8',
  )

  assert.match(lessonEditorFile, /TeachingPresentationMode/)
  assert.match(lessonEditorFile, /teachingSession/)
  assert.match(lessonEditorFile, /Bắt đầu tiết dạy/)
})
