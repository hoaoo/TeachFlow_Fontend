import fs from 'node:fs'
import path from 'node:path'

function normalizeKey(raw) {
  if (!raw || typeof raw !== 'string') return null
  let trimmed = raw.trim()
  if (!trimmed) return null

  if (trimmed.includes('untrusted comment:')) {
    const idx = trimmed.indexOf('untrusted comment:')
    return trimmed.slice(idx).replace(/\r\n/g, '\n').trim()
  }

  try {
    const decoded = Buffer.from(trimmed, 'base64').toString('utf8').trim()
    if (decoded.includes('untrusted comment:')) {
      const idx = decoded.indexOf('untrusted comment:')
      return decoded.slice(idx).replace(/\r\n/g, '\n').trim()
    }
  } catch {}

  return `untrusted comment: minisign secret key\n${trimmed}`
}

// Find key in all env vars
let foundKey = ''
let foundKeyVar = ''

for (const [key, val] of Object.entries(process.env)) {
  if (
    (key.startsWith('SECRET_') || key.startsWith('TAURI_') || key.includes('KEY') || key.includes('SIGNING')) &&
    !key.includes('PASSWORD') &&
    !key.includes('PWD') &&
    typeof val === 'string' &&
    val.trim().length > 10
  ) {
    foundKey = val
    foundKeyVar = key
    break
  }
}

// Find password in all env vars
let foundPwd = ''
let foundPwdVar = ''

for (const [key, val] of Object.entries(process.env)) {
  if (
    (key.includes('PASSWORD') || key.includes('PWD')) &&
    typeof val === 'string' &&
    val.trim().length > 0
  ) {
    foundPwd = val.trim()
    foundPwdVar = key
    break
  }
}

if (!foundKey) {
  console.error('[Signing ERROR] No private key found in process.env!')
  console.log(
    '[Signing Diagnostic] Env keys present:',
    Object.keys(process.env).filter(
      (k) => k.startsWith('SECRET_') || k.includes('TAURI') || k.includes('SIGNING'),
    ),
  )
  process.exit(1)
}

console.log(`[Signing] Using private key from: ${foundKeyVar} (length: ${foundKey.length})`)
if (foundPwdVar) {
  console.log(`[Signing] Using password from: ${foundPwdVar}`)
} else {
  console.log(`[Signing] Using empty password`)
}

const keyContent = normalizeKey(foundKey)
const keyPath = path.resolve(process.cwd(), 'src-tauri', 'tauri.key')
fs.writeFileSync(keyPath, keyContent + '\n', { encoding: 'utf8', mode: 0o600 })
console.log(`[Signing] Key written to: ${keyPath} (${keyContent.length} bytes)`)

const rootKeyPath = path.resolve(process.cwd(), 'tauri.key')
fs.writeFileSync(rootKeyPath, keyContent + '\n', { encoding: 'utf8', mode: 0o600 })

if (process.env.GITHUB_ENV) {
  const envFile = process.env.GITHUB_ENV
  fs.appendFileSync(envFile, `TAURI_SIGNING_PRIVATE_KEY=${keyPath}\n`)
  fs.appendFileSync(envFile, `TAURI_PRIVATE_KEY=${keyPath}\n`)
  fs.appendFileSync(envFile, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD=${foundPwd}\n`)
  fs.appendFileSync(envFile, `TAURI_KEY_PASSWORD=${foundPwd}\n`)
}
