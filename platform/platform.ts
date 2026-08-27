export type NativeNotification = {
  id?: string
  title: string
  body: string
}

export type SaveFileOptions = {
  suggestedName: string
  filters?: Array<{ name: string; extensions: string[] }>
}

export type UpdateProgress = {
  downloaded: number
  total: number | null
  percent: number
}

export type UpdateSession = {
  version: string
  currentVersion: string
  body: string | null
  date: string | null
  downloadAndInstall: (onProgress: (progress: UpdateProgress) => void) => Promise<void>
}

export interface PlatformAdapter {
  isDesktop(): boolean
  showNotification(notification: NativeNotification, requestPermission?: boolean): Promise<boolean>
  saveFile(data: Blob, options: SaveFileOptions): Promise<string | null>
  openFile(path: string): Promise<void>
  revealFile(path: string): Promise<void>
  checkForUpdate(): Promise<UpdateSession | null>
  relaunch(): Promise<void>
  getAppVersion(): Promise<string>
  secureGet(key: string): Promise<string | null>
  secureSet(key: string, value: string | null): Promise<void>
  isAutostartEnabled(): Promise<boolean>
  setAutostartEnabled(enabled: boolean): Promise<void>
  setCloseToTray(enabled: boolean): Promise<void>
  onCheckForUpdateRequested(callback: () => void): Promise<() => void>
}
