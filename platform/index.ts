import type { PlatformAdapter } from './platform'
import { TauriPlatform } from './tauri-platform'
import { WebPlatform } from './web-platform'

export * from './platform'

let adapter: PlatformAdapter | null = null

export function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

export function getPlatform(): PlatformAdapter {
  if (!adapter) adapter = isTauriRuntime() ? new TauriPlatform() : new WebPlatform()
  return adapter
}
