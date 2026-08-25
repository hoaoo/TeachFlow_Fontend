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
    credentials: 'include', // Support HttpOnly cookies for refresh token cross-origin
  };

  try {
    const response = await fetch(url, config);

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

      throw new ApiError(rawMessage, response.status, errorData.error, errorData);
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
    let msg = (error as Error).message || 'Không thể kết nối đến máy chủ';
    if (msg.toLowerCase().includes('no translation found') || msg.toLowerCase().includes('oops')) {
      msg = 'Không tìm thấy dữ liệu yêu cầu.';
    }
    throw new ApiError(msg, 500);
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
      credentials: 'include',
    });
    if (!res.ok) {
      throw new ApiError(`Tải tệp thất bại: ${res.statusText}`, res.status);
    }
    return await res.blob();
  },
};
