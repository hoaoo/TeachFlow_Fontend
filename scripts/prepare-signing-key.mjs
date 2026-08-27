import fs from 'node:fs'
import path from 'node:path'

const FALLBACK_KEY_BASE64 =
  'dW50cnVzdGVkIGNvbW1lbnQ6IHJzaWduIGVuY3J5cHRlZCBzZWNyZXQga2V5ClJXRlRZMEl5aXlxd000ZE5rd1lsWkhuc256WENCS3ZHc3RZaVgwTnhUU0R6a25aM1ppQUFBQkFBQUFBQUFBQUFBQUlBQUFBQXA5ODVxakRrOTY4UzNMbXVRSnVQV1VFRWxMNEhrMEN1Z0xCYXcrU0xWNmNmMW1CamVTRkRZXzVPMGszSmxubzJ2eG5hWjE5V0FmL3AxVkNQY2Y5S1RYeVdpdDdmUUJGSG5lMXpjT2FFakp2bkxZejR2V3UrWm9zRzhvamMxV08ySVowVllsSXcvMTg9Cg=='

function normalizeKey(raw) {
  if (!raw || typeof raw !== 'string') return null
  let s = raw.trim()
  if (!s) return null

  if (s.includes('\\n')) {
    s = s.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n')
  }

  if (!s.includes('untrusted comment:')) {
    try {
      const decoded = Buffer.from(s, 'base64').toString('utf8').trim()
      if (decoded.includes('untrusted comment:')) {
        s = decoded
      }
    } catch {}
  }

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
  TAURI_SIGNING_PRIVATE_KEY: process.env.TAURI_SIGNING_PRIVATE_KEY,
  TAURI_PRIVATE_KEY: process.env.TAURI_PRIVATE_KEY,
}

const pwdCandidates = {
  SECRET_TAURI_SIGNING_PRIVATE_KEY_PASSWORD: process.env.SECRET_TAURI_SIGNING_PRIVATE_KEY_PASSWORD,
  SECRET_TAURI_KEY_PASSWORD: process.env.SECRET_TAURI_KEY_PASSWORD,
  SECRET_SIGNING_KEY_PASSWORD: process.env.SECRET_SIGNING_KEY_PASSWORD,
  SECRET_UPDATER_KEY_PASSWORD: process.env.SECRET_UPDATER_KEY_PASSWORD,
  SECRET_KEY_PASSWORD: process.env.SECRET_KEY_PASSWORD,
  SECRET_PASSWORD: process.env.SECRET_PASSWORD,
  TAURI_SIGNING_PRIVATE_KEY_PASSWORD: process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD,
  TAURI_KEY_PASSWORD: process.env.TAURI_KEY_PASSWORD,
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

let finalKeyContent = ''
if (selectedKeyRaw) {
  console.log(`[Signing] Using private key from environment variable: ${selectedKeyName}`)
  finalKeyContent = normalizeKey(selectedKeyRaw)
} else {
  console.log('[Signing] Using fallback project updater key')
  finalKeyContent = normalizeKey(FALLBACK_KEY_BASE64)
}

if (!finalKeyContent) {
  console.error('[Signing ERROR] Failed to determine signing key content.')
  process.exit(1)
}

const keyPath = path.resolve(process.cwd(), 'src-tauri', 'tauri.key')
fs.writeFileSync(keyPath, finalKeyContent + '\n', { encoding: 'utf8', mode: 0o600 })
console.log(`[Signing] Normalized private key written to: ${keyPath} (${finalKeyContent.length} bytes)`)

const rootKeyPath = path.resolve(process.cwd(), 'tauri.key')
fs.writeFileSync(rootKeyPath, finalKeyContent + '\n', { encoding: 'utf8', mode: 0o600 })

if (process.env.GITHUB_ENV) {
  const envFile = process.env.GITHUB_ENV
  fs.appendFileSync(envFile, `TAURI_SIGNING_PRIVATE_KEY=${keyPath}\n`)
  fs.appendFileSync(envFile, `TAURI_PRIVATE_KEY=${keyPath}\n`)
  fs.appendFileSync(envFile, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD=${selectedPwd}\n`)
  fs.appendFileSync(envFile, `TAURI_KEY_PASSWORD=${selectedPwd}\n`)
  console.log('[Signing] Exported TAURI_SIGNING_PRIVATE_KEY to GITHUB_ENV')
}
