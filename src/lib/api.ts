import { API_BASE_URL } from './env';

type ApiErrorBody = {
  message?: string;
  errors?: Record<string, string[]>;
  statusCode?: number;
};

export class ApiError extends Error {
  status: number;
  details?: ApiErrorBody;

  constructor(message: string, status: number, details?: ApiErrorBody) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

function buildUrl(path: string) {
  return `${API_BASE_URL.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
}

function resolveApiErrorMessage(details?: ApiErrorBody, fallback = 'Request failed') {
  const generalErrors = details?.errors?.GeneralErrors;
  if (generalErrors?.length) {
    return generalErrors[0];
  }

  const flattenedErrors = details?.errors ? Object.values(details.errors).flat().filter(Boolean) : [];
  if (flattenedErrors.length > 0) {
    return flattenedErrors[0];
  }

  return details?.message || fallback;
}

export async function apiPing() {
  const response = await fetch(buildUrl('/health/ready'));
  if (!response.ok) {
    throw new ApiError(response.statusText || 'Health check failed', response.status);
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {}
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }

  const response = await fetch(buildUrl(path), {
    ...options,
    headers,
  });

  if (!response.ok) {
    let details: ApiErrorBody | undefined;
    try {
      details = (await response.json()) as ApiErrorBody;
    } catch {
      details = undefined;
    }
    const message = resolveApiErrorMessage(details, response.statusText || 'Request failed');
    throw new ApiError(message, response.status, details);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
