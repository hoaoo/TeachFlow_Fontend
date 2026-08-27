import fs from 'node:fs'
import path from 'node:path'

function normalizeKey(raw) {
  if (!raw || typeof raw !== 'string') return null
  let s = raw.trim()
  if (!s) return null

  // Handle literal escaped newlines
  if (s.includes('\\n')) {
    s = s.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n')
  }

  // If base64-encoded whole file
  if (!s.includes('untrusted comment:')) {
    try {
      const decoded = Buffer.from(s, 'base64').toString('utf8').trim()
      if (decoded.includes('untrusted comment:')) {
        s = decoded
      }
    } catch {}
  }

  // Extract comment and base64 key
  if (s.includes('untrusted comment:')) {
    const lines = s
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
    const commentIdx = lines.findIndex((l) => l.startsWith('untrusted comment:'))
    if (commentIdx !== -1 && lines[commentIdx + 1]) {
      return `${lines[commentIdx]}\n${lines[commentIdx + 1]}`
    }
  }

  // Otherwise wrap single base64 line
  const lines = s
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  const keyLine = lines[0]
  return `untrusted comment: minisign secret key\n${keyLine}`
}

const keyCandidates = {
  SECRET_TAURI_SIGNING_PRIVATE_KEY: process.env.SECRET_TAURI_SIGNING_PRIVATE_KEY,
  SECRET_TAURI_PRIVATE_KEY: process.env.SECRET_TAURI_PRIVATE_KEY,
  SECRET_TAURI_KEY: process.env.SECRET_TAURI_KEY,
  SECRET_SIGNING_KEY: process.env.SECRET_SIGNING_KEY,
  SECRET_UPDATER_KEY: process.env.SECRET_UPDATER_KEY,
  SECRET_TAURI_UPDATER_KEY: process.env.SECRET_TAURI_UPDATER_KEY,
  SECRET_TAURI_UPDATER_PRIVATE_KEY: process.env.SECRET_TAURI_UPDATER_PRIVATE_KEY,
  SECRET_PRIVATE_KEY: process.env.SECRET_PRIVATE_KEY,
}

const pwdCandidates = {
  SECRET_TAURI_SIGNING_PRIVATE_KEY_PASSWORD: process.env.SECRET_TAURI_SIGNING_PRIVATE_KEY_PASSWORD,
  SECRET_TAURI_KEY_PASSWORD: process.env.SECRET_TAURI_KEY_PASSWORD,
  SECRET_SIGNING_KEY_PASSWORD: process.env.SECRET_SIGNING_KEY_PASSWORD,
  SECRET_UPDATER_KEY_PASSWORD: process.env.SECRET_UPDATER_KEY_PASSWORD,
  SECRET_KEY_PASSWORD: process.env.SECRET_KEY_PASSWORD,
  SECRET_PASSWORD: process.env.SECRET_PASSWORD,
}

let selectedKeyName = ''
let selectedKeyRaw = ''
for (const [name, val] of Object.entries(keyCandidates)) {
  if (val && typeof val === 'string' && val.trim().length > 0) {
    selectedKeyName = name
    selectedKeyRaw = val.trim()
    break
  }
}

let selectedPwdName = ''
let selectedPwd = ''
for (const [name, val] of Object.entries(pwdCandidates)) {
  if (val && typeof val === 'string' && val.trim().length > 0) {
    selectedPwdName = name
    selectedPwd = val.trim()
    break
  }
}

console.log('[Signing Diagnostic] Candidate lengths:')
for (const [name, val] of Object.entries(keyCandidates)) {
  console.log(`  ${name}: ${val ? val.length : 0}`)
}

if (!selectedKeyRaw) {
  console.error('[Signing ERROR] No updater private key found in any GitHub Secret!')
  process.exit(1)
}

console.log(`[Signing] Using private key from: ${selectedKeyName} (${selectedKeyRaw.length} chars)`)
if (selectedPwdName) {
  console.log(`[Signing] Using password from: ${selectedPwdName} (${selectedPwd.length} chars)`)
} else {
  console.log('[Signing] Using empty password')
}

const normalized = normalizeKey(selectedKeyRaw)
if (!normalized) {
  console.error('[Signing ERROR] Failed to normalize private key content.')
  process.exit(1)
}

const keyPath = path.resolve(process.cwd(), 'src-tauri', 'tauri.key')
fs.writeFileSync(keyPath, normalized + '\n', { encoding: 'utf8', mode: 0o600 })
console.log(`[Signing] Key file written to: ${keyPath} (${normalized.length} bytes)`)

// Fallback copies
fs.writeFileSync(path.resolve(process.cwd(), 'tauri.key'), normalized + '\n', { encoding: 'utf8', mode: 0o600 })

// Export to GITHUB_ENV
if (process.env.GITHUB_ENV) {
  const envFile = process.env.GITHUB_ENV
  fs.appendFileSync(envFile, `TAURI_SIGNING_PRIVATE_KEY=${keyPath}\n`)
  fs.appendFileSync(envFile, `TAURI_PRIVATE_KEY=${keyPath}\n`)
  fs.appendFileSync(envFile, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD=${selectedPwd}\n`)
  fs.appendFileSync(envFile, `TAURI_KEY_PASSWORD=${selectedPwd}\n`)
  console.log('[Signing] Exported credentials to GITHUB_ENV')
}
