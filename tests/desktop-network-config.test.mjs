import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const BACKEND_ORIGIN = 'https://hoan-dev081202.onrender.com'

test('desktop production CSP only allows its own origin, Tauri IPC, and the production backend', async () => {
  const config = JSON.parse(await readFile(new URL('../src-tauri/tauri.conf.json', import.meta.url), 'utf8'))
  const csp = config.app.security.csp
  const connectSrc = csp.match(/connect-src ([^;]+);/)?.[1].split(/\s+/)

  assert.deepEqual(connectSrc, ["'self'", 'ipc:', 'http://ipc.localhost', BACKEND_ORIGIN])
  assert.equal(csp.includes('connect-src *'), false)
  assert.equal(csp.includes('teachflow-fontend.onrender.com'), false)
  assert.equal(csp.includes('localhost:3000'), false)
})

test('API client requires the build-time URL and logs only safe diagnostic fields', async () => {
  const client = await readFile(new URL('../services/api-client.ts', import.meta.url), 'utf8')

  assert.match(client, /process\.env\.NEXT_PUBLIC_API_URL\?\.trim\(\)/)
  assert.doesNotMatch(client, /NEXT_PUBLIC_API_URL\s*\|\|/)
  assert.match(client, /url: string;[\s\S]*status: number \| null;[\s\S]*category: ApiErrorCategory;[\s\S]*requestId: string \| null;/)
  assert.doesNotMatch(client, /console\.(?:log|error)\([^\n]*(?:password|accessToken|refreshToken|Authorization)/)
})
