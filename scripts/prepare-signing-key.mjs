import fs from 'node:fs'
import path from 'node:path'

function normalizeKey(raw) {
  if (!raw || typeof raw !== 'string') return null
  let trimmed = raw.trim()

  // 1. Direct text starting with untrusted comment
  if (trimmed.startsWith('untrusted comment:')) {
    return trimmed.replace(/\r\n/g, '\n')
  }

  // 2. Base64-encoded whole file
  try {
    const decoded = Buffer.from(trimmed, 'base64').toString('utf8').trim()
    if (decoded.startsWith('untrusted comment:')) {
      return decoded.replace(/\r\n/g, '\n')
    }
  } catch {}

  // 3. Raw single-line secret key without comment
  return `untrusted comment: minisign secret key\n${trimmed}`
}

const rawKey =
  process.env.TAURI_SIGNING_PRIVATE_KEY ||
  process.env.TAURI_PRIVATE_KEY ||
  process.env.SIGNING_KEY ||
  ''

const rawPwd =
  process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD ||
  process.env.TAURI_KEY_PASSWORD ||
  process.env.SIGNING_PWD ||
  ''

const keyContent = normalizeKey(rawKey)

if (keyContent) {
  const keyPath = path.resolve(process.cwd(), 'src-tauri', 'tauri.key')
  fs.writeFileSync(keyPath, keyContent, { encoding: 'utf8', mode: 0o600 })
  console.log(`[Signing] Key written successfully to ${keyPath} (${keyContent.length} bytes)`)

  // Export to GITHUB_ENV if running in GitHub Actions
  if (process.env.GITHUB_ENV) {
    const envFile = process.env.GITHUB_ENV
    fs.appendFileSync(envFile, `TAURI_SIGNING_PRIVATE_KEY=${keyPath}\n`)
    fs.appendFileSync(envFile, `TAURI_PRIVATE_KEY=${keyPath}\n`)
    fs.appendFileSync(envFile, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD=${rawPwd.trim()}\n`)
    fs.appendFileSync(envFile, `TAURI_KEY_PASSWORD=${rawPwd.trim()}\n`)
    console.log('[Signing] Exported TAURI_SIGNING_PRIVATE_KEY and password to GITHUB_ENV')
  }
} else {
  console.warn('[Signing] No valid private key detected in environment')
}
