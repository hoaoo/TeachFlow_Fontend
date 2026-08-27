import { getPlatform } from '@/platform'

const ACCESS_TOKEN_KEY = 'teachflow_access_token'
const REFRESH_TOKEN_KEY = 'teachflow_refresh_token'

export interface TokenStorage {
  initialize(): Promise<void>
  getAccessToken(): string | null
  getRefreshToken(): Promise<string | null>
  setTokens(tokens: { accessToken: string | null; refreshToken?: string | null }): Promise<void>
  clear(): Promise<void>
}

export class LocalStorageTokenStorage implements TokenStorage {
  private accessToken: string | null = null

  async initialize() {
    if (typeof window !== 'undefined') this.accessToken = localStorage.getItem(ACCESS_TOKEN_KEY)
  }

  getAccessToken() { return this.accessToken }
  async getRefreshToken() { return null }

  async setTokens(tokens: { accessToken: string | null }) {
    this.accessToken = tokens.accessToken
    if (typeof window === 'undefined') return
    if (tokens.accessToken) localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken)
    else localStorage.removeItem(ACCESS_TOKEN_KEY)
  }

  async clear() {
    this.accessToken = null
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ACCESS_TOKEN_KEY)
      localStorage.removeItem(REFRESH_TOKEN_KEY)
    }
  }
}

export class SecureTokenStorage implements TokenStorage {
  private accessToken: string | null = null
  private refreshToken: string | null = null

  async initialize() {
    const platform = getPlatform()
    const legacyAccess = typeof window !== 'undefined' ? localStorage.getItem(ACCESS_TOKEN_KEY) : null
    const legacyRefresh = typeof window !== 'undefined' ? localStorage.getItem(REFRESH_TOKEN_KEY) : null
    this.accessToken = await platform.secureGet('access_token')
    this.refreshToken = await platform.secureGet('refresh_token')
    if (!this.accessToken && legacyAccess) {
      this.accessToken = legacyAccess
      await platform.secureSet('access_token', legacyAccess)
    }
    if (!this.refreshToken && legacyRefresh) {
      this.refreshToken = legacyRefresh
      await platform.secureSet('refresh_token', legacyRefresh)
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ACCESS_TOKEN_KEY)
      localStorage.removeItem(REFRESH_TOKEN_KEY)
    }
  }

  getAccessToken() { return this.accessToken }
  async getRefreshToken() { return this.refreshToken }

  async setTokens(tokens: { accessToken: string | null; refreshToken?: string | null }) {
    const platform = getPlatform()
    this.accessToken = tokens.accessToken
    await platform.secureSet('access_token', tokens.accessToken)
    if (tokens.refreshToken !== undefined) {
      this.refreshToken = tokens.refreshToken
      await platform.secureSet('refresh_token', tokens.refreshToken)
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ACCESS_TOKEN_KEY)
      localStorage.removeItem(REFRESH_TOKEN_KEY)
    }
  }

  async clear() {
    this.accessToken = null
    this.refreshToken = null
    const platform = getPlatform()
    await Promise.all([
      platform.secureSet('access_token', null),
      platform.secureSet('refresh_token', null),
    ])
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ACCESS_TOKEN_KEY)
      localStorage.removeItem(REFRESH_TOKEN_KEY)
    }
  }
}

let storage: TokenStorage | null = null
let initialization: Promise<void> | null = null

function currentStorage() {
  if (!storage) storage = getPlatform().isDesktop() ? new SecureTokenStorage() : new LocalStorageTokenStorage()
  return storage
}

export function initializeTokenStorage() {
  if (!initialization) initialization = currentStorage().initialize()
  return initialization
}

export function getStoredAccessToken() { return currentStorage().getAccessToken() }
export function getStoredRefreshToken() { return currentStorage().getRefreshToken() }
export function storeAuthTokens(tokens: { accessToken: string | null; refreshToken?: string | null }) {
  return currentStorage().setTokens(tokens)
}
export function clearStoredTokens() { return currentStorage().clear() }
