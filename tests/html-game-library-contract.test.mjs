import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('HTML game service matches the backend read, admin mutation, play, and lesson attachment routes', async () => {
  const service = await readFile(new URL('../services/html-game-service.ts', import.meta.url), 'utf8')

  assert.match(service, /api\.get<HtmlGame\[]>\(`\/html-games\$\{suffix\}`\)/)
  assert.match(service, /api\.get<HtmlGamePlay>\(`\/html-games\/\$\{id\}\/play`\)/)
  assert.match(service, /api\.post<HtmlGame>\('\/admin\/html-games', payload\)/)
  assert.match(service, /`\/admin\/html-games\/\$\{id\}\/package`/)
  assert.match(service, /`\/admin\/html-games\/\$\{id\}\/status`/)
  assert.match(service, /`\/lesson-plans\/\$\{lessonPlanId\}\/html-games\/\$\{htmlGameId\}`/)
})

test('game execution uses a sandboxed iframe and never injects uploaded HTML into the app DOM', async () => {
  const component = await readFile(new URL('../components/html-game-library-view.tsx', import.meta.url), 'utf8')

  assert.match(component, /<iframe[\s\S]*sandbox="allow-scripts allow-forms"[\s\S]*referrerPolicy="no-referrer"/)
  assert.doesNotMatch(component, /srcDoc=/)
  assert.doesNotMatch(component, /dangerouslySetInnerHTML/)
  assert.doesNotMatch(component, /allow-same-origin/)
})

test('admin and teacher navigation expose the HTML game library', async () => {
  const app = await readFile(new URL('../components/teacher-app.tsx', import.meta.url), 'utf8')
  const navigation = await readFile(new URL('../lib/mock-data.ts', import.meta.url), 'utf8')

  assert.match(app, /view === 'Trò chơi HTML'[\s\S]*<HtmlGameLibraryView/)
  assert.match(navigation, /label: 'Trò chơi HTML', icon: 'Gamepad2'/)
})

test('desktop CSP permits HTTPS game frames without broadening API connections', async () => {
  const config = JSON.parse(await readFile(new URL('../src-tauri/tauri.conf.json', import.meta.url), 'utf8'))

  assert.match(config.app.security.csp, /frame-src https:/)
  assert.doesNotMatch(config.app.security.csp, /frame-src \*/)
})
