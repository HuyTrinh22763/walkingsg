import { API_BASE_URL, IS_DEV } from '../constants/api';

export interface ApiResponse<T = any> {
  message?: string;
  status?: number;
  metadata?: T;
}

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: any;
  token?: string | null;
  clientId?: string | null;
  headers?: Record<string, string>;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const {
    method = 'GET',
    body,
    token,
    clientId,
    headers: customHeaders = {},
  } = options;

  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };

  if (token) {
    headers['authorization'] = token;
  }

  if (clientId) {
    headers['x-client-id'] = clientId;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data: any = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const errorMessage =
      data?.message ||
      data?.detail ||
      `Request failed with status ${response.status}`;
    const err = new Error(errorMessage);
    if (IS_DEV) {
      console.error(`[apiClient Error] ${method} ${url} -> ${response.status}`, {
        message: errorMessage,
        data,
        stack: err.stack,
      });
    }
    throw err;
  }

  return (data?.metadata !== undefined ? data.metadata : data) as T;
}
