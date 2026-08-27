import fs from 'node:fs'
import path from 'node:path'

const FALLBACK_KEY_BASE64 =
  'dW50cnVzdGVkIGNvbW1lbnQ6IHJzaWduIGVuY3J5cHRlZCBzZWNyZXQga2V5ClJXRlRZMEl5aXlxd000ZE5rd1lsWkhuc256WENCS3ZHc3RZaVgwTnhUU0R6a25aM1ppQUFBQkFBQUFBQUFBQUFBQUlBQUFBQXA5ODVxakRrOTY4UzNMbXVRSnVQV1VFRWxMNEhrMEN1Z0xCYXcrU0xWNmNmMW1CamVTRkRZXzVPMGszSmxubzJ2eG5hWjE5V0FmL3AxVkNQY2Y5S1RYeVdpdDdmUUJGSG5lMXpjT2FFakp2bkxZejR2V3UrWm9zRzhvamMxV08ySVowVllsSXcvMTg9Cg=='

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

let finalKeyBase64 = ''
if (selectedKeyRaw) {
  console.log(`[Signing] Using private key from environment: ${selectedKeyName}`)
  finalKeyBase64 = selectedKeyRaw
} else {
  console.log('[Signing] Using fallback project updater key')
  finalKeyBase64 = FALLBACK_KEY_BASE64.trim()
}

// Ensure key is written in standard Tauri base64 key file format
const keyPath = path.resolve(process.cwd(), 'src-tauri', 'tauri.key')
fs.writeFileSync(keyPath, finalKeyBase64 + '\n', { encoding: 'utf8', mode: 0o600 })
console.log(`[Signing] Key file written to: ${keyPath} (${finalKeyBase64.length} bytes)`)

const rootKeyPath = path.resolve(process.cwd(), 'tauri.key')
fs.writeFileSync(rootKeyPath, finalKeyBase64 + '\n', { encoding: 'utf8', mode: 0o600 })

if (process.env.GITHUB_ENV) {
  const envFile = process.env.GITHUB_ENV
  fs.appendFileSync(envFile, `TAURI_SIGNING_PRIVATE_KEY_PATH=${keyPath}\n`)
  fs.appendFileSync(envFile, `TAURI_PRIVATE_KEY_PATH=${keyPath}\n`)
  fs.appendFileSync(envFile, `TAURI_SIGNING_PRIVATE_KEY=${finalKeyBase64}\n`)
  fs.appendFileSync(envFile, `TAURI_PRIVATE_KEY=${finalKeyBase64}\n`)
  fs.appendFileSync(envFile, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD=${selectedPwd}\n`)
  fs.appendFileSync(envFile, `TAURI_KEY_PASSWORD=${selectedPwd}\n`)
  console.log('[Signing] Exported credentials to GITHUB_ENV')
}
