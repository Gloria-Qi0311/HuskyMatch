/** Minimal API client for the HuskyMatch FastAPI backend. */

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

/** Error carrying the HTTP status and the backend's `detail` message. */
export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** Perform a JSON request against the backend and parse the response. */
export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Check your connection.');
  }

  const text = await res.text();
  const data: unknown = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const detail =
      data && typeof data === 'object' && 'detail' in data
        ? (data as { detail: unknown }).detail
        : null;
    throw new ApiError(res.status, typeof detail === 'string' ? detail : 'Request failed.');
  }

  return data as T;
}
