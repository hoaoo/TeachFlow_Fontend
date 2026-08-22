/**
 * TeachFlow API Client
 * Handles token attachment, refresh token flow, error parsing and standardized requests.
 */

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api').replace(/\/+$/, '');

let accessToken: string | null = null;
let isRefreshing = false;
let refreshSubscribers: Array<{
  resolve: (token: string) => void;
  reject: (err: any) => void;
}> = [];

export function getAccessToken(): string | null {
  if (accessToken) return accessToken;
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('teachflow_access_token');
    if (stored) {
      accessToken = stored;
      return stored;
    }
  }
  return null;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('teachflow_access_token', token);
    } else {
      localStorage.removeItem('teachflow_access_token');
    }
  }
}

export function clearAuth(): void {
  setAccessToken(null);
  if (typeof window !== 'undefined') {
    // Dispatch 'teachflow:auth-cleared' for logout/session-expiry — data loaders must NOT reload on this
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

  constructor(message: string, statusCode: number, error?: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.error = error;
    this.details = details;
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

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
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
    credentials: 'include', // Support HttpOnly cookies for refresh token cross-origin
  };

  try {
    const response = await fetch(url, config);

    // Handle 401 Unauthorized -> Refresh Token Flow
    if (
      response.status === 401 &&
      !isRetry &&
      !endpoint.includes('/auth/login') &&
      !endpoint.includes('/auth/refresh') &&
      !endpoint.includes('/auth/logout')
    ) {
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
          });

          if (refreshRes.ok) {
            const data = await refreshRes.json();
            const newToken = data.accessToken || data.tokens?.accessToken;
            if (!newToken) {
              throw new Error('Refresh response missing accessToken');
            }
            setAccessToken(newToken);
            isRefreshing = false;
            onRefreshed(newToken);
            return apiClient<T>(endpoint, options, true);
          } else {
            isRefreshing = false;
            clearAuth();
            const err = new ApiError('Phiên đăng nhập đã hết hạn', 401);
            onRefreshFailed(err);
            throw err;
          }
        } catch (err) {
          isRefreshing = false;
          clearAuth();
          onRefreshFailed(err);
          throw err instanceof ApiError ? err : new ApiError((err as Error).message || 'Lỗi làm mới token', 401);
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

      const errorMessage =
        Array.isArray(errorData.message)
          ? errorData.message.join(', ')
          : errorData.message || `Lỗi ${response.status}: ${response.statusText}`;

      throw new ApiError(errorMessage, response.status, errorData.error, errorData);
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
    throw new ApiError((error as Error).message || 'Không thể kết nối đến máy chủ', 500);
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
};
