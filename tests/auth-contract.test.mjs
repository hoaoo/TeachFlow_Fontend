import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { getAuthErrorMessage, STRONG_PASSWORD_REGEX, validateEmail, validateRegistration } from '../services/auth-contract.mjs'

test('login and register validation matches the backend password contract', () => {
  assert.equal(validateEmail('teacher@example.com'), '')
  assert.notEqual(validateEmail('invalid'), '')
  assert.equal(STRONG_PASSWORD_REGEX.test('Strong@123'), true)
  assert.equal(STRONG_PASSWORD_REGEX.test('password'), false)
  assert.deepEqual(validateRegistration({ fullName: 'Teacher', email: 'teacher@example.com', password: 'Strong@123', confirmPassword: 'Strong@123' }), {})
  assert.equal(validateRegistration({ fullName: 'Teacher', email: 'teacher@example.com', password: 'Strong@123', confirmPassword: 'Other@123' }).confirmPassword, 'Mật khẩu xác nhận không khớp.')
})

test('auth errors are safe and status-specific', () => {
  assert.equal(getAuthErrorMessage({ statusCode: 401 }), 'Email hoặc mật khẩu không chính xác.')
  assert.equal(getAuthErrorMessage({ statusCode: 403 }), 'Tài khoản hiện đang bị khóa.')
  assert.match(getAuthErrorMessage({ statusCode: 429 }), /quá nhiều lần/)
  assert.match(getAuthErrorMessage({ statusCode: 409 }, 'register'), /Email đã được sử dụng/)
  assert.match(getAuthErrorMessage({ statusCode: 500 }), /kết nối máy chủ/)
})

test('auth UI includes routes, accessibility, loading lock and no demo credentials', async () => {
  const [screen, teacherApp, loginRoute, registerRoute] = await Promise.all([
    readFile(new URL('../components/auth-screen.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/teacher-app.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/login/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/register/page.tsx', import.meta.url), 'utf8'),
  ])
  const bundledSource = screen + teacherApp
  assert.match(screen, /submitLock\.current/)
  assert.match(screen, /Đang đăng nhập/)
  assert.match(screen, /current-password/)
  assert.match(screen, /new-password/)
  assert.match(screen, /aria-live="polite"/)
  assert.match(screen, /profile\.role === 'ADMIN'/)
  assert.match(loginRoute, /initialMode="login"/)
  assert.match(registerRoute, /initialMode="register"/)
  const forbiddenDemoPassword = ['Password', '123@'].join('')
  const forbiddenDemoEmail = ['teacher', '@teachflow.vn'].join('')
  assert.equal(bundledSource.includes(forbiddenDemoPassword), false)
  assert.equal(bundledSource.includes(forbiddenDemoEmail), false)
})

test('auth bootstrap and refresh-cookie contract avoid protected render and refresh loops', async () => {
  const [context, client, tokenStorage, app] = await Promise.all([
    readFile(new URL('../context/auth-context.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../services/api-client.ts', import.meta.url), 'utf8'),
    readFile(new URL('../services/token-storage.ts', import.meta.url), 'utf8'),
    readFile(new URL('../components/teacher-app.tsx', import.meta.url), 'utf8'),
  ])
  assert.match(context, /credentials: 'include'/)
  assert.match(client, /!endpoint\.includes\('\/auth\/register'\)/)
  assert.match(tokenStorage, /class LocalStorageTokenStorage/)
  assert.match(tokenStorage, /class SecureTokenStorage/)
  assert.match(tokenStorage, /localStorage\.setItem\(ACCESS_TOKEN_KEY/)
  assert.doesNotMatch(tokenStorage, /localStorage\.setItem\(REFRESH_TOKEN_KEY/)
  assert.match(tokenStorage, /platform\.secureSet\('refresh_token'/)
  assert.doesNotMatch(client, /localStorage\./)
  assert.match(app, /if \(!isAuthenticated \|\| !user\)/)
  assert.match(app, /return <AuthScreen/)
})
