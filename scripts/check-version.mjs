import { readFile } from 'node:fs/promises'

const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
const tauriConfig = JSON.parse(await readFile(new URL('../src-tauri/tauri.conf.json', import.meta.url), 'utf8'))
const cargo = await readFile(new URL('../src-tauri/Cargo.toml', import.meta.url), 'utf8')
const cargoVersion = cargo.match(/^version\s*=\s*"([^"]+)"/m)?.[1]
const versions = {
  'package.json': packageJson.version,
  'tauri.conf.json': tauriConfig.version,
  'Cargo.toml': cargoVersion,
}
const unique = new Set(Object.values(versions))
if (unique.size !== 1) {
  console.error('TeachFlow version mismatch:', versions)
  process.exit(1)
}
if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(packageJson.version)) {
  console.error('TeachFlow version must be valid SemVer:', packageJson.version)
  process.exit(1)
}
console.log('TeachFlow version ' + packageJson.version + ' is synchronized.')
