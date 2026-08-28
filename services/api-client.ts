import {
  clearStoredTokens,
  getStoredAccessToken,
  getStoredRefreshToken,
  storeAuthTokens,
} from './token-storage';

/**
 * Returns true when running inside the Tauri WebView (desktop).
 * Avoids importing the full platform module at this level to keep the bundle clean.
 */
function isDesktopRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/**
 * On desktop (Tauri) we authenticate exclusively with Bearer tokens stored in
 * Windows Credential Manager. HttpOnly cookies are a web-only mechanism.
 * Sending credentials:'include' from tauri://localhost to an external HTTPS origin
 * triggers a CORS preflight that the backend rejects (it does not whitelist tauri://localhost),
 * causing every request to fail with a NETWORK_ERROR before it even reaches the server.
 * On web we keep credentials:'include' so the browser automatically sends the HttpOnly
 * refresh token cookie for server-side session management.
 */
function resolveCredentials(): RequestCredentials {
  return isDesktopRuntime() ? 'omit' : 'include';
}

/**
 * TeachFlow API Client
 * Handles token attachment, refresh token flow, error parsing and standardized requests.
 */

const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

if (!configuredApiBaseUrl) {
  throw new Error('NEXT_PUBLIC_API_URL is required at build time');
}

export const API_BASE_URL = configuredApiBaseUrl.replace(/\/+$/, '');

const parsedApiBaseUrl = new URL(API_BASE_URL);
if (!['http:', 'https:'].includes(parsedApiBaseUrl.protocol)) {
  throw new Error('NEXT_PUBLIC_API_URL must be an absolute HTTP(S) URL');
}
if (
  process.env.NODE_ENV === 'production' &&
  (parsedApiBaseUrl.protocol !== 'https:' || ['localhost', '127.0.0.1'].includes(parsedApiBaseUrl.hostname))
) {
  throw new Error('NEXT_PUBLIC_API_URL must use a non-local HTTPS origin in production');
}

type ApiErrorCategory = 'http' | 'policy_or_network' | 'abort' | 'unknown';
export type ApiErrorCode =
  | 'NETWORK_TIMEOUT'
  | 'NETWORK_ERROR'
  | 'SERVER_STARTING'
  | 'UNAUTHORIZED'
  | 'SERVER_ERROR';

function emitConnectionEvent(name: 'teachflow:server-starting' | 'teachflow:connection-restored') {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(name));
}

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export async function fetchWithResilience(
  url: string,
  options: RequestInit,
  retryTransient = false,
): Promise<Response> {
  const delays = retryTransient ? [0, 1500, 3500] : [0];
  let lastError: unknown;
  for (let attempt = 0; attempt < delays.length; attempt += 1) {
    if (delays[attempt]) await wait(delays[attempt]);
    const controller = options.signal ? null : new AbortController();
    const timeout = controller ? setTimeout(() => controller.abort(), 40_000) : null;
    try {
      const response = await fetch(url, { ...options, signal: options.signal || controller?.signal });
      if ([502, 503, 504].includes(response.status) && attempt < delays.length - 1) {
        emitConnectionEvent('teachflow:server-starting');
        continue;
      }
      if (attempt > 0) emitConnectionEvent('teachflow:connection-restored');
      return response;
    } catch (error) {
      lastError = error;
      if (attempt >= delays.length - 1) throw error;
      emitConnectionEvent('teachflow:server-starting');
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }
  throw lastError;
}

function logApiFailure(input: {
  url: string;
  status: number | null;
  category: ApiErrorCategory;
  requestId: string | null;
}): void {
  if (process.env.NODE_ENV !== 'production') {
    console.error('[TeachFlow API]', {
      ...input,
      apiBase: API_BASE_URL,
      desktop: isDesktopRuntime(),
      credentials: resolveCredentials(),
    });
  }
}

let isRefreshing = false;
let refreshSubscribers: Array<{
  resolve: (token: string) => void;
  reject: (err: any) => void;
}> = [];

export function getAccessToken(): string | null {
  return getStoredAccessToken();
}

export async function setAuthTokens(accessToken: string | null, refreshToken?: string | null): Promise<void> {
  await storeAuthTokens({ accessToken, refreshToken });
}

export function clearAuth(): void {
  void clearStoredTokens();
  if (typeof window !== 'undefined') {
    // Dispatch 'teachflow:auth-cleared' for logout/session-expiry — data loaders must NOT reload on this
    window.dispatchEvent(new CustomEvent('teachflow:auth-cleared', { detail: null }));
  }
}

export async function clearAuthTokens(): Promise<void> {
  await clearStoredTokens();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('teachflow:auth-cleared', { detail: null }));
  }
}

/**
 * Called after a successful login to signal all components to reload their data.
 * This is the only event that should trigger data loaders to re-fetch.
 */
export function notifyAuthStateChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('teachflow:auth-state-changed', { detail: null }));
  }
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach(({ resolve }) => resolve(token));
  refreshSubscribers = [];
}

function onRefreshFailed(err: any) {
  refreshSubscribers.forEach(({ reject }) => reject(err));
  refreshSubscribers = [];
}

function addRefreshSubscriber(resolve: (token: string) => void, reject: (err: any) => void) {
  refreshSubscribers.push({ resolve, reject });
}

export class ApiError extends Error {
  statusCode: number;
  error?: string;
  details?: any;
  code: ApiErrorCode;

  constructor(message: string, statusCode: number, error?: string, details?: any, code?: ApiErrorCode) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.error = error;
    this.details = details;
    this.code = code || (statusCode === 401 ? 'UNAUTHORIZED' : statusCode >= 500 ? 'SERVER_ERROR' : 'SERVER_ERROR');
  }
}

export async function apiClient<T = any>(
  endpoint: string,
  options: RequestInit = {},
  isRetry = false,
): Promise<T> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${cleanEndpoint}`;

  const token = getAccessToken();
  const customHeaders = options.headers instanceof Headers
    ? Object.fromEntries(options.headers.entries())
    : (options.headers as Record<string, string>) || {};

  const isFormData = options.body instanceof FormData;
  const defaultHeaders: Record<string, string> = isFormData ? {} : { 'Content-Type': 'application/json' };
  const headers: Record<string, string> = {
    ...defaultHeaders,
    ...customHeaders,
  };

  // Attach fresh Bearer token
  if (token && !headers['Authorization'] && !headers['authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // If this is a retry after token refresh, force new Bearer token
  if (isRetry && token) {
    headers['Authorization'] = `Bearer ${token}`;
    delete headers['authorization'];
  }

  const config: RequestInit = {
    ...options,
    headers,
    // Web: send HttpOnly cookie for server-side session (credentials:'include').
    // Desktop (Tauri): omit credentials — the backend does not whitelist tauri://localhost,
    // so a credentialed cross-origin request triggers a CORS preflight failure. Bearer
    // tokens in the Authorization header are sufficient for desktop authentication.
    credentials: resolveCredentials(),
  };

  try {
    const response = await fetchWithResilience(url, config, (config.method || 'GET').toUpperCase() === 'GET');

    // Handle 401 Unauthorized -> Refresh Token Flow
    if (
      response.status === 401 &&
      !isRetry &&
      !endpoint.includes('/auth/login') &&
      !endpoint.includes('/auth/register') &&
      !endpoint.includes('/auth/refresh') &&
      !endpoint.includes('/auth/logout')
    ) {
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const refreshToken = await getStoredRefreshToken();
          const refreshRes = await fetchWithResilience(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: refreshToken ? JSON.stringify({ refreshToken }) : undefined,
            credentials: resolveCredentials(),
          }, true);

          if (refreshRes.ok) {
            const data = await refreshRes.json();
            const newToken = data.accessToken || data.tokens?.accessToken;
            if (!newToken) {
              throw new Error('Refresh response missing accessToken');
            }
            await setAuthTokens(newToken, data.refreshToken || data.tokens?.refreshToken);
            isRefreshing = false;
            onRefreshed(newToken);
            return apiClient<T>(endpoint, options, true);
          } else {
            isRefreshing = false;
            const unauthorized = refreshRes.status === 401 || refreshRes.status === 403;
            if (unauthorized) clearAuth();
            const err = unauthorized
              ? new ApiError('Phiên đăng nhập đã hết hạn', 401, undefined, undefined, 'UNAUTHORIZED')
              : new ApiError('Máy chủ đang khởi động, vui lòng chờ...', refreshRes.status, undefined, undefined, 'SERVER_STARTING');
            onRefreshFailed(err);
            throw err;
          }
        } catch (err) {
          isRefreshing = false;
          if (err instanceof ApiError && err.code === 'UNAUTHORIZED') clearAuth();
          onRefreshFailed(err);
          throw err instanceof ApiError
            ? err
            : new ApiError((err as Error).message || 'Không thể kết nối máy chủ', 0, undefined, undefined, 'NETWORK_ERROR');
        }
      } else {
        // Wait for active refreshing to complete
        return new Promise<T>((resolve, reject) => {
          addRefreshSubscriber(
            async (_newToken) => {
              try {
                const retryRes = await apiClient<T>(endpoint, options, true);
                resolve(retryRes);
              } catch (error) {
                reject(error);
              }
            },
            (error) => {
              reject(error);
            },
          );
        });
      }
    }

    // Handle non-ok responses
    if (!response.ok) {
      let errorData: any = {};
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: response.statusText };
      }

      let rawMessage =
        Array.isArray(errorData.message)
          ? errorData.message.join(', ')
          : errorData.message || (response.status === 404 ? 'Không tìm thấy dữ liệu yêu cầu' : `Lỗi ${response.status}: ${response.statusText}`);

      // Map any raw English or fallback error messages to clear Vietnamese
      if (rawMessage.toLowerCase().includes('no translation found') || rawMessage.toLowerCase().includes('oops')) {
        rawMessage = 'Không tìm thấy dữ liệu yêu cầu hoặc thao tác không hợp lệ.';
      } else if (rawMessage === 'Unauthorized' || rawMessage === 'jwt expired') {
        rawMessage = 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.';
      } else if (rawMessage === 'Forbidden' || rawMessage === 'Forbidden resource') {
        rawMessage = 'Bạn không có quyền thực hiện thao tác này.';
      } else if (rawMessage === 'Not Found') {
        rawMessage = 'Không tìm thấy tài nguyên yêu cầu.';
      } else if (rawMessage === 'Internal server error') {
        rawMessage = 'Hệ thống đang bận. Vui lòng thử lại sau.';
      }

      logApiFailure({
        url,
        status: response.status,
        category: 'http',
        requestId: response.headers.get('x-request-id') || errorData.requestId || null,
      });

      const code: ApiErrorCode = response.status === 401
        ? 'UNAUTHORIZED'
        : [502, 503, 504].includes(response.status)
          ? 'SERVER_STARTING'
          : 'SERVER_ERROR';
      throw new ApiError(
        code === 'SERVER_STARTING' ? 'Máy chủ đang khởi động, vui lòng chờ...' : rawMessage,
        response.status,
        errorData.error,
        errorData,
        code,
      );
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    const category: ApiErrorCategory =
      error instanceof DOMException && error.name === 'AbortError'
        ? 'abort'
        : error instanceof TypeError
          ? 'policy_or_network'
          : 'unknown';
    logApiFailure({ url, status: null, category, requestId: null });
    let msg = (error as Error).message || 'Không thể kết nối đến máy chủ';
    if (msg.toLowerCase().includes('no translation found') || msg.toLowerCase().includes('oops')) {
      msg = 'Không tìm thấy dữ liệu yêu cầu.';
    }
    const code: ApiErrorCode = category === 'abort' ? 'NETWORK_TIMEOUT' : 'NETWORK_ERROR';
    throw new ApiError(
      code === 'NETWORK_TIMEOUT' ? 'Kết nối quá thời gian chờ. Vui lòng thử lại.' : msg,
      0,
      undefined,
      undefined,
      code,
    );
  }
}

export const api = {
  get: <T = any>(endpoint: string, headers?: HeadersInit) =>
    apiClient<T>(endpoint, { method: 'GET', headers }),

  post: <T = any>(endpoint: string, body?: any, headers?: HeadersInit) =>
    apiClient<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      headers,
    }),

  put: <T = any>(endpoint: string, body?: any, headers?: HeadersInit) =>
    apiClient<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
      headers,
    }),

  patch: <T = any>(endpoint: string, body?: any, headers?: HeadersInit) =>
    apiClient<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
      headers,
    }),

  delete: <T = any>(endpoint: string, headers?: HeadersInit) =>
    apiClient<T>(endpoint, { method: 'DELETE', headers }),

  postForm: <T = any>(endpoint: string, formData: FormData, headers?: HeadersInit) =>
    apiClient<T>(endpoint, {
      method: 'POST',
      body: formData,
      headers,
    }),

  getBlob: async (endpoint: string, headers?: HeadersInit): Promise<Blob> => {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${cleanEndpoint}`;
    const token = getAccessToken();
    const customHeaders = headers instanceof Headers
      ? Object.fromEntries(headers.entries())
      : (headers as Record<string, string>) || {};
    const reqHeaders: Record<string, string> = {
      ...customHeaders,
    };
    if (token && !reqHeaders['Authorization'] && !reqHeaders['authorization']) {
      reqHeaders['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(url, {
      method: 'GET',
      headers: reqHeaders,
      credentials: resolveCredentials(),
    });
    if (!res.ok) {
      throw new ApiError(`Tải tệp thất bại: ${res.statusText}`, res.status);
    }
    return await res.blob();
  },
};
