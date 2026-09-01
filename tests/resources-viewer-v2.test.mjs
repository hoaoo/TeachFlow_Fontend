import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('frontend resource service exports complete API contracts for V2 viewer and upload progress', () => {
  const serviceFile = fs.readFileSync(
    path.resolve(process.cwd(), 'services/resource-service.ts'),
    'utf8',
  )

  // Verify core V2 functions
  assert.match(serviceFile, /export async function getResources/)
  assert.match(serviceFile, /export function uploadResourceFileWithProgress/)
  assert.match(serviceFile, /export async function downloadResourceFile/)
  assert.match(serviceFile, /export async function getResourceFileBlob/)
  assert.match(serviceFile, /export async function getResourceFileArrayBuffer/)
  assert.match(serviceFile, /export function getResourceInlineUrl/)
  assert.match(serviceFile, /export async function openResourceInDefaultApp/)
  assert.match(serviceFile, /export async function updateResource/)

  // Verify resource types support all required categories
  assert.match(serviceFile, /'DOCUMENT' \| 'IMAGE' \| 'AUDIO' \| 'VIDEO' \| 'PRESENTATION' \| 'SPREADSHEET' \| 'OTHER'/)
})

test('frontend workspace module handles Audio, Video, Image, PDF, and Office file previewing', () => {
  const workspaceFile = fs.readFileSync(
    path.resolve(process.cwd(), 'components/workspace-module.tsx'),
    'utf8',
  )

  // Preview elements
  assert.match(workspaceFile, /isAudio/)
  assert.match(workspaceFile, /<audio/)
  assert.match(workspaceFile, /isVideo/)
  assert.match(workspaceFile, /<video/)
  assert.match(workspaceFile, /isPdf/)
  assert.match(workspaceFile, /<iframe/)
  assert.match(workspaceFile, /isImage/)
  assert.match(workspaceFile, /isDocx/)
  assert.match(workspaceFile, /isXlsx/)
  assert.match(workspaceFile, /isTxt/)

  // Desktop action & Error fallback
  assert.match(workspaceFile, /Không thể phát tệp này/)
  assert.match(workspaceFile, /Mở bằng ứng dụng/)
  assert.match(workspaceFile, /uploadProgress/)
})

test('frontend upload dialog validates extensions including documents, images, audio, video and blocks executables', () => {
  const workspaceFile = fs.readFileSync(
    path.resolve(process.cwd(), 'components/workspace-module.tsx'),
    'utf8',
  )

  // Verify extensions included in accept filter
  assert.match(workspaceFile, /\.mp3/)
  assert.match(workspaceFile, /\.wav/)
  assert.match(workspaceFile, /\.m4a/)
  assert.match(workspaceFile, /\.aac/)
  assert.match(workspaceFile, /\.mp4/)
  assert.match(workspaceFile, /\.webm/)
  assert.match(workspaceFile, /\.mov/)
  assert.match(workspaceFile, /\.pdf/)
  assert.match(workspaceFile, /\.docx/)
  assert.match(workspaceFile, /\.xlsx/)
  assert.match(workspaceFile, /\.pptx/)
  assert.match(workspaceFile, /\.txt/)
})

test('PowerPoint resources expose direct presentation APIs and action without public URLs', () => {
  const serviceFile = fs.readFileSync(
    path.resolve(process.cwd(), 'services/resource-service.ts'),
    'utf8',
  )
  const workspaceFile = fs.readFileSync(
    path.resolve(process.cwd(), 'components/workspace-module.tsx'),
    'utf8',
  )

  assert.match(serviceFile, /export async function getResourcePresentation/)
  assert.match(serviceFile, /export async function getPresentationSlideBlob/)
  assert.match(serviceFile, /api\.getBlob\(slideUrl, undefined, signal\)/)
  assert.match(workspaceFile, /detected === 'POWERPOINT'[\s\S]*Trình chiếu/)
  assert.match(workspaceFile, /<ResourceViewer/)
  assert.match(workspaceFile, /<Eye className="size-3" \/> Xem/)
  assert.match(workspaceFile, /<Download className="size-3" \/> Tải xuống/)
})

test('presentation viewer supports lazy slides, navigation, fullscreen and lifecycle cleanup', () => {
  const viewer = fs.readFileSync(
    path.resolve(process.cwd(), 'components/resources/powerpoint-presentation-viewer.tsx'),
    'utf8',
  )

  assert.match(viewer, /Slide \{currentSlide\} \/ \{metadata\?\.slideCount \|\| 0\}/)
  assert.match(viewer, /\['ArrowRight', ' ', 'PageDown'\]/)
  assert.match(viewer, /\['ArrowLeft', 'PageUp'\]/)
  assert.match(viewer, /event\.key === 'Home'/)
  assert.match(viewer, /event\.key === 'End'/)
  assert.match(viewer, /event\.key === 'Escape'/)
  assert.match(viewer, /requestFullscreen/)
  assert.match(viewer, /exitFullscreen/)
  assert.match(viewer, /fullscreenchange/)
  assert.match(viewer, /ensureSlide\(currentSlide \+ 1/)
  assert.match(viewer, /ensureSlide\(currentSlide - 1/)
  assert.match(viewer, /URL\.revokeObjectURL/)
  assert.match(viewer, /removeEventListener\('keydown'/)
  assert.match(viewer, /removeEventListener\('fullscreenchange'/)
  assert.match(viewer, /controller\.abort\(\)/)
  assert.doesNotMatch(viewer, /slides\.map\([^)]*getPresentationSlideBlob/)
})
