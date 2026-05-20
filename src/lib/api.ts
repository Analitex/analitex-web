import { API_BASE_URL } from './env';

type ApiErrorBody = {
  title?: string;
  detail?: string;
  message?: string;
  errors?: Record<string, string[]>;
  statusCode?: number;
  errorCode?: string;
};

type ApiRequestOptions = RequestInit & {
  token?: string | null;
  skipAuthRefresh?: boolean;
};

type ApiAuthHandlers = {
  getAccessToken: () => string | null;
  getExpiresAt: () => string | null;
  refreshAccessToken: () => Promise<string | null>;
  onUnauthorized: () => void;
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
const TOKEN_REFRESH_SKEW_MS = 60_000;
let authHandlers: ApiAuthHandlers | null = null;
let activeRefresh: Promise<string | null> | null = null;

export function configureApiAuthHandlers(handlers: ApiAuthHandlers | null) {
  authHandlers = handlers;
}

function isDedupableRequest(path: string, options: ApiRequestOptions) {
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

function buildRequestKey(path: string, options: ApiRequestOptions) {
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

function getAuthHeaders(options: ApiRequestOptions, accept = 'application/json') {
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

function isTokenExpiring(expiresAt: string | null) {
  if (!expiresAt) return false;
  const expiresTime = Date.parse(expiresAt);
  return Number.isFinite(expiresTime) && expiresTime <= Date.now() + TOKEN_REFRESH_SKEW_MS;
}

async function refreshAccessToken() {
  if (!authHandlers) return null;
  if (!activeRefresh) {
    activeRefresh = authHandlers.refreshAccessToken().finally(() => {
      activeRefresh = null;
    });
  }
  return activeRefresh;
}

async function resolveRequestToken(options: ApiRequestOptions) {
  if (!options.token || options.skipAuthRefresh || !authHandlers) return options.token ?? null;

  const currentToken = authHandlers.getAccessToken();
  if (currentToken && currentToken !== options.token) {
    return currentToken;
  }

  if (!isTokenExpiring(authHandlers.getExpiresAt())) {
    return options.token;
  }

  return (await refreshAccessToken()) ?? options.token;
}

async function fetchJson<T>(path: string, options: ApiRequestOptions): Promise<T> {
  const response = await fetch(buildUrl(path), {
    ...options,
    headers: getAuthHeaders(options),
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
  options: ApiRequestOptions = {}
): Promise<T> {
  const requestToken = await resolveRequestToken(options);
  const requestOptions = { ...options, token: requestToken };
  const canDeduplicate = isDedupableRequest(path, requestOptions);
  const requestKey = buildRequestKey(path, requestOptions);
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

  const requestPromise = (async () => {
    try {
      return await fetchJson<T>(path, requestOptions);
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.status === 401 &&
        requestToken &&
        !requestOptions.skipAuthRefresh &&
        authHandlers
      ) {
        const refreshedToken = await refreshAccessToken();
        if (refreshedToken) {
          return await fetchJson<T>(path, { ...requestOptions, token: refreshedToken });
        }
        authHandlers.onUnauthorized();
      }
      throw error;
    }
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
  options: ApiRequestOptions = {}
): Promise<{ blob: Blob; filename: string | null }> {
  const requestToken = await resolveRequestToken(options);
  const requestOptions = { ...options, token: requestToken };
  let response = await fetch(buildUrl(path), {
    ...requestOptions,
    headers: getAuthHeaders(requestOptions, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
  });

  if (response.status === 401 && requestToken && !requestOptions.skipAuthRefresh && authHandlers) {
    const refreshedToken = await refreshAccessToken();
    if (refreshedToken) {
      response = await fetch(buildUrl(path), {
        ...requestOptions,
        token: refreshedToken,
        headers: getAuthHeaders(
          { ...requestOptions, token: refreshedToken },
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ),
      });
    } else {
      authHandlers.onUnauthorized();
    }
  }

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
