import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('HTML game service matches the backend read, admin mutation, play, and lesson attachment routes', async () => {
  const service = await readFile(new URL('../services/html-game-service.ts', import.meta.url), 'utf8')

  assert.match(service, /api\.get<HtmlGame\[]>\(`\/html-games\$\{suffix\}`\)/)
  assert.match(service, /api\.get<HtmlGamePlay>\(`\/html-games\/\$\{id\}\/play`\)/)
  assert.match(service, /api\.post<HtmlGame>\('\/admin\/html-games', payload\)/)
  assert.match(service, /`\/admin\/html-games\/\$\{id\}\/package`/)
  assert.match(service, /`\/admin\/html-games\/\$\{id\}\/source`/)
  assert.match(service, /`\/admin\/html-games\/\$\{id\}\/status`/)
  assert.match(service, /`\/lesson-plans\/\$\{lessonPlanId\}\/html-games\/\$\{htmlGameId\}`/)
  assert.match(service, /`\/lesson-plans\/\$\{lessonPlanId\}\/html-game-customizations\/\$\{customizationId\}`/)
})

test('game execution uses a sandboxed iframe and never injects uploaded HTML into the app DOM', async () => {
  const component = await readFile(new URL('../components/html-games/game-player.tsx', import.meta.url), 'utf8')

  assert.match(component, /<iframe[\s\S]*sandbox="allow-scripts"[\s\S]*referrerPolicy="no-referrer"/)
  assert.doesNotMatch(component, /srcDoc=/)
  assert.doesNotMatch(component, /dangerouslySetInnerHTML/)
  assert.doesNotMatch(component, /sandbox="[^"]*allow-same-origin/)
  assert.doesNotMatch(component, /downloadHtml|saveBlob|getBlob/)
})

test('admin create UI exposes upload and paste-code tabs with sandboxed preview', async () => {
  const component = await readFile(new URL('../components/html-game-library-view.tsx', import.meta.url), 'utf8')

  assert.match(component, /setContentMode\('FILE'\)[\s\S]*Tải file/)
  assert.match(component, /setContentMode\('SOURCE'\)[\s\S]*Dán mã/)
  assert.match(component, /uploadHtmlGameSource\(saved\.id, sourceHtml\)/)
  assert.match(component, /URL\.createObjectURL\(new Blob\(\[sourceHtml\]/)
  assert.match(component, /<GamePlayer play=\{play\}/)
})

test('teacher question editor supports CRUD, duplicate, reorder, save and reload', async () => {
  const editor = await readFile(new URL('../components/html-games/html-game-question-editor.tsx', import.meta.url), 'utf8')

  assert.match(editor, /createCustomizationQuestion/)
  assert.match(editor, /updateCustomizationQuestion/)
  assert.match(editor, /deleteCustomizationQuestion/)
  assert.match(editor, /reorderCustomizationQuestions/)
  assert.match(editor, /getHtmlGameCustomization/)
  assert.match(editor, /duplicate/)
  assert.match(editor, /SINGLE_CHOICE/)
  assert.match(editor, /MULTIPLE_CHOICE/)
  assert.match(editor, /TRUE_FALSE/)
  assert.match(editor, /SHORT_ANSWER/)
})

test('runtime bridge validates message source, instance, version, type and size before sending questions', async () => {
  const player = await readFile(new URL('../components/html-games/game-player.tsx', import.meta.url), 'utf8')

  assert.match(player, /event\.source !== iframeRef\.current\?\.contentWindow/)
  assert.match(player, /event\.origin !== 'null'/)
  assert.match(player, /payloadSize\(data\) > MAX_MESSAGE_BYTES/)
  assert.match(player, /data\.version !== BRIDGE_VERSION/)
  assert.match(player, /data\.gameInstanceId !== instanceId/)
  assert.match(player, /type: 'TEACHFLOW_GAME_INIT'/)
  assert.match(player, /postMessage\(init, '\*'\)/)
})

test('admin and teacher navigation expose the HTML game library', async () => {
  const app = await readFile(new URL('../components/teacher-app.tsx', import.meta.url), 'utf8')
  const navigation = await readFile(new URL('../lib/mock-data.ts', import.meta.url), 'utf8')

  assert.match(app, /view === 'Trò chơi HTML'[\s\S]*<HtmlGameLibraryView/)
  assert.match(navigation, /label: 'Trò chơi HTML', icon: 'Gamepad2'/)
})

test('desktop CSP permits HTTPS game frames without broadening API connections', async () => {
  const config = JSON.parse(await readFile(new URL('../src-tauri/tauri.conf.json', import.meta.url), 'utf8'))

  assert.match(config.app.security.csp, /frame-src blob: https:/)
  assert.doesNotMatch(config.app.security.csp, /frame-src \*/)
})
