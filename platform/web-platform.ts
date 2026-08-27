import type { NativeNotification, PlatformAdapter, SaveFileOptions, UpdateSession } from './platform'

export class WebPlatform implements PlatformAdapter {
  isDesktop() { return false }

  async showNotification(notification: NativeNotification, requestPermission = false): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) return false
    let permission = Notification.permission
    if (permission === 'default' && requestPermission) permission = await Notification.requestPermission()
    if (permission !== 'granted') return false
    new Notification(notification.title, { body: notification.body, tag: notification.id })
    return true
  }

  async saveFile(data: Blob, options: SaveFileOptions): Promise<string | null> {
    const url = URL.createObjectURL(data)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = options.suggestedName
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
    return null
  }

  async openFile(_path: string) {}
  async revealFile(_path: string) {}
  async checkForUpdate(): Promise<UpdateSession | null> { return null }
  async relaunch() {}
  async getAppVersion() { return '' }
  async secureGet(key: string) {
    return typeof window === 'undefined' ? null : localStorage.getItem(key)
  }
  async secureSet(key: string, value: string | null) {
    if (typeof window === 'undefined') return
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  }
  async isAutostartEnabled() { return false }
  async setAutostartEnabled(_enabled: boolean) {}
  async setCloseToTray(_enabled: boolean) {}
  async onCheckForUpdateRequested(_callback: () => void) { return () => {} }
}
