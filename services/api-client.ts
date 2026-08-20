/**
 * TeachFlow API Client
 * Handles token attachment, refresh token flow, error parsing and standardized requests.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

let accessToken: string | null = null;
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

export function getAccessToken(): string | null {
  if (accessToken) return accessToken;
  if (typeof window !== 'undefined') {
    return localStorage.getItem('teachflow_access_token');
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
    window.dispatchEvent(new CustomEvent('teachflow:auth-state-changed', { detail: null }));
  }
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
}

function addRefreshSubscriber(callback: (token: string) => void) {
  refreshSubscribers.push(callback);
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
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const token = getAccessToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const config: RequestInit = {
    ...options,
    headers,
    credentials: 'include', // Support HttpOnly cookies for refresh token
  };

  try {
    const response = await fetch(url, config);

    // Handle 401 Unauthorized -> Refresh Token Flow
    if (response.status === 401 && !isRetry && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
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
            const newToken = data.accessToken;
            setAccessToken(newToken);
            isRefreshing = false;
            onRefreshed(newToken);
            return apiClient<T>(endpoint, options, true);
          } else {
            isRefreshing = false;
            clearAuth();
            throw new ApiError('Phiên đăng nhập đã hết hạn', 401);
          }
        } catch (err) {
          isRefreshing = false;
          clearAuth();
          throw err;
        }
      } else {
        // Wait for refreshing to complete
        return new Promise<T>((resolve, reject) => {
          addRefreshSubscriber(async (newToken) => {
            try {
              const retryRes = await apiClient<T>(endpoint, options, true);
              resolve(retryRes);
            } catch (error) {
              reject(error);
            }
          });
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
