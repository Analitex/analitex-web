import { API_BASE_URL } from './env';

type ApiErrorBody = {
  title?: string;
  detail?: string;
  message?: string;
  errors?: Record<string, string[]>;
  statusCode?: number;
  errorCode?: string;
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

const IN_FLIGHT_REQUESTS = new Map<string, Promise<unknown>>();
const RESPONSE_CACHE = new Map<string, { expiresAt: number; value: unknown }>();
const RESPONSE_CACHE_TTL_MS = 5_000;

function isDedupableRequest(path: string, options: RequestInit & { token?: string | null }) {
  const method = (options.method ?? 'GET').toUpperCase();
  if (method === 'GET') return true;
  if (method !== 'POST') return false;

  return (
    path.startsWith('/metadata/') ||
    path.startsWith('/overview/') ||
    path.startsWith('/analytics/') ||
    path.startsWith('/reporting/')
  );
}

function buildRequestKey(path: string, options: RequestInit & { token?: string | null }) {
  const method = (options.method ?? 'GET').toUpperCase();
  const body = typeof options.body === 'string' ? options.body : '';
  return JSON.stringify({
    method,
    path: buildUrl(path),
    token: options.token ?? null,
    body,
  });
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

  return details?.detail || details?.message || details?.title || fallback;
}

function getAuthHeaders(options: RequestInit & { token?: string | null }, accept = 'application/json') {
  const headers = new Headers(options.headers);
  headers.set('Accept', accept);

  if (typeof options.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }

  return headers;
}

function getHeaderFilename(contentDisposition: string | null) {
  if (!contentDisposition) return null;

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1].replace(/"/g, ''));
  }

  const match = contentDisposition.match(/filename="?([^";]+)"?/i);
  return match?.[1] ?? null;
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
  const canDeduplicate = isDedupableRequest(path, options);
  const requestKey = buildRequestKey(path, options);
  if (canDeduplicate) {
    const cachedResponse = RESPONSE_CACHE.get(requestKey);
    if (cachedResponse && cachedResponse.expiresAt > Date.now()) {
      return cachedResponse.value as T;
    }
    if (cachedResponse) {
      RESPONSE_CACHE.delete(requestKey);
    }
  }

  if (canDeduplicate) {
    const existingRequest = IN_FLIGHT_REQUESTS.get(requestKey);
    if (existingRequest) {
      return existingRequest as Promise<T>;
    }
  }

  const headers = getAuthHeaders(options);

  const requestPromise = (async () => {
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
  })();

  if (canDeduplicate) {
    IN_FLIGHT_REQUESTS.set(requestKey, requestPromise);
  }

  try {
    const response = await requestPromise;
    if (canDeduplicate) {
      RESPONSE_CACHE.set(requestKey, {
        expiresAt: Date.now() + RESPONSE_CACHE_TTL_MS,
        value: response,
      });
    }
    return response;
  } finally {
    if (canDeduplicate) {
      IN_FLIGHT_REQUESTS.delete(requestKey);
    }
  }
}

export async function apiDownload(
  path: string,
  options: RequestInit & { token?: string | null } = {}
): Promise<{ blob: Blob; filename: string | null }> {
  const response = await fetch(buildUrl(path), {
    ...options,
    headers: getAuthHeaders(options, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
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

  return {
    blob: await response.blob(),
    filename: getHeaderFilename(response.headers.get('Content-Disposition')),
  };
}
