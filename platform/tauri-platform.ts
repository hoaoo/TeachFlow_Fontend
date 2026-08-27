import type {
  NativeNotification,
  PlatformAdapter,
  SaveFileOptions,
  UpdateProgress,
  UpdateSession,
} from './platform'

const cleanSuggestedName = (name: string) => {
  const cleaned = name.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_').replace(/[. ]+$/g, '').trim()
  return cleaned.slice(0, 180) || 'TeachFlow-export'
}

export class TauriPlatform implements PlatformAdapter {
  isDesktop() { return true }

  async showNotification(notification: NativeNotification, requestPermission = false): Promise<boolean> {
    const { isPermissionGranted, requestPermission: request, sendNotification } = await import('@tauri-apps/plugin-notification')
    let granted = await isPermissionGranted()
    if (!granted && requestPermission) granted = (await request()) === 'granted'
    if (!granted) return false
    sendNotification({ title: notification.title, body: notification.body })
    return true
  }

  async saveFile(data: Blob, options: SaveFileOptions): Promise<string | null> {
    const [{ save }, { writeFile }, { invoke }] = await Promise.all([
      import('@tauri-apps/plugin-dialog'),
      import('@tauri-apps/plugin-fs'),
      import('@tauri-apps/api/core'),
    ])
    const selectedPath = await save({
      defaultPath: cleanSuggestedName(options.suggestedName),
      filters: options.filters,
      title: 'Lưu file TeachFlow',
    })
    if (!selectedPath) return null
    await writeFile(selectedPath, new Uint8Array(await data.arrayBuffer()))
    await invoke('register_saved_file', { path: selectedPath })
    return selectedPath
  }

  async openFile(path: string) {
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('open_saved_file', { path })
  }

  async revealFile(path: string) {
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('reveal_saved_file', { path })
  }

  async checkForUpdate(): Promise<UpdateSession | null> {
    const { check } = await import('@tauri-apps/plugin-updater')
    const update = await check()
    if (!update) return null
    return {
      version: update.version,
      currentVersion: update.currentVersion,
      body: update.body ?? null,
      date: update.date ? String(update.date) : null,
      downloadAndInstall: async (onProgress) => {
        let downloaded = 0
        let total: number | null = null
        await update.downloadAndInstall((event) => {
          if (event.event === 'Started') total = event.data.contentLength ?? null
          if (event.event === 'Progress') downloaded += event.data.chunkLength
          if (event.event === 'Finished' && total !== null) downloaded = total
          const progress: UpdateProgress = {
            downloaded,
            total,
            percent: total && total > 0 ? Math.min(100, Math.round(downloaded / total * 100)) : 0,
          }
          onProgress(progress)
        })
      },
    }
  }

  async relaunch() {
    const { relaunch } = await import('@tauri-apps/plugin-process')
    await relaunch()
  }

  async getAppVersion() {
    const { getVersion } = await import('@tauri-apps/api/app')
    return getVersion()
  }

  async secureGet(key: string) {
    const { invoke } = await import('@tauri-apps/api/core')
    return invoke<string | null>('secure_get', { key })
  }

  async secureSet(key: string, value: string | null) {
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('secure_set', { key, value })
  }

  async isAutostartEnabled() {
    const { isEnabled } = await import('@tauri-apps/plugin-autostart')
    return isEnabled()
  }

  async setAutostartEnabled(enabled: boolean) {
    const { enable, disable } = await import('@tauri-apps/plugin-autostart')
    if (enabled) await enable()
    else await disable()
  }

  async setCloseToTray(enabled: boolean) {
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('set_close_to_tray', { enabled })
  }

  async onCheckForUpdateRequested(callback: () => void) {
    const { listen } = await import('@tauri-apps/api/event')
    return listen('teachflow://check-update', callback)
  }
}
