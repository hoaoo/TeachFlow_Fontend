import fs from 'node:fs'
import path from 'node:path'

function normalizeKey(raw) {
  if (!raw || typeof raw !== 'string') return null
  let trimmed = raw.trim()
  if (!trimmed) return null

  // 1. Direct text starting with untrusted comment
  if (trimmed.includes('untrusted comment:')) {
    const idx = trimmed.indexOf('untrusted comment:')
    return trimmed.slice(idx).replace(/\r\n/g, '\n').trim()
  }

  // 2. Base64-encoded whole file
  try {
    const decoded = Buffer.from(trimmed, 'base64').toString('utf8').trim()
    if (decoded.includes('untrusted comment:')) {
      const idx = decoded.indexOf('untrusted comment:')
      return decoded.slice(idx).replace(/\r\n/g, '\n').trim()
    }
  } catch {}

  // 3. Raw base64 string without untrusted comment
  return `untrusted comment: minisign secret key\n${trimmed}`
}

const keyEnvVars = [
  'TAURI_SIGNING_PRIVATE_KEY',
  'TAURI_PRIVATE_KEY',
  'TAURI_KEY',
  'SIGNING_KEY',
  'UPDATER_KEY',
  'TAURI_UPDATER_KEY',
  'TAURI_UPDATER_PRIVATE_KEY',
  'PRIVATE_KEY',
]

const pwdEnvVars = [
  'TAURI_SIGNING_PRIVATE_KEY_PASSWORD',
  'TAURI_KEY_PASSWORD',
  'SIGNING_KEY_PASSWORD',
  'UPDATER_KEY_PASSWORD',
  'KEY_PASSWORD',
  'PASSWORD',
]

let foundKey = ''
let foundKeyVar = ''
for (const varName of keyEnvVars) {
  const val = process.env[varName]
  if (val && typeof val === 'string' && val.trim().length > 0) {
    foundKey = val
    foundKeyVar = varName
    break
  }
}

let foundPwd = ''
let foundPwdVar = ''
for (const varName of pwdEnvVars) {
  const val = process.env[varName]
  if (val !== undefined && val !== null && typeof val === 'string' && val.trim().length > 0) {
    foundPwd = val.trim()
    foundPwdVar = varName
    break
  }
}

if (!foundKey) {
  console.error('[Signing ERROR] No private key found in any of:', keyEnvVars.join(', '))
  console.error('[Signing ERROR] Please ensure TAURI_SIGNING_PRIVATE_KEY is set in GitHub Secrets.')
  process.exit(1)
}

console.log(`[Signing] Detected private key from variable: ${foundKeyVar} (raw length: ${foundKey.length})`)
if (foundPwdVar) {
  console.log(`[Signing] Detected password from variable: ${foundPwdVar}`)
} else {
  console.log(`[Signing] No password specified (empty password)`)
}

const keyContent = normalizeKey(foundKey)
if (!keyContent) {
  console.error('[Signing ERROR] Failed to normalize private key content.')
  process.exit(1)
}

const keyPath = path.resolve(process.cwd(), 'src-tauri', 'tauri.key')
fs.writeFileSync(keyPath, keyContent + '\n', { encoding: 'utf8', mode: 0o600 })
console.log(`[Signing] Normalized private key written to: ${keyPath} (${keyContent.length} bytes)`)

// Also write to root directory for fallback
const rootKeyPath = path.resolve(process.cwd(), 'tauri.key')
fs.writeFileSync(rootKeyPath, keyContent + '\n', { encoding: 'utf8', mode: 0o600 })

// Export to GITHUB_ENV if running in GitHub Actions
if (process.env.GITHUB_ENV) {
  const envFile = process.env.GITHUB_ENV
  fs.appendFileSync(envFile, `TAURI_SIGNING_PRIVATE_KEY=${keyPath}\n`)
  fs.appendFileSync(envFile, `TAURI_PRIVATE_KEY=${keyPath}\n`)
  fs.appendFileSync(envFile, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD=${foundPwd}\n`)
  fs.appendFileSync(envFile, `TAURI_KEY_PASSWORD=${foundPwd}\n`)
  console.log('[Signing] Exported TAURI_SIGNING_PRIVATE_KEY to GITHUB_ENV')
}
