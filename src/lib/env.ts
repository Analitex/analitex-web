const DEFAULT_API_BASE_URL = 'http://localhost:5000';
const API_PATH_PREFIX = '/api/v1';

function resolveApiBaseUrl(baseUrl: string) {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');
  return normalizedBaseUrl.endsWith(API_PATH_PREFIX)
    ? normalizedBaseUrl
    : `${normalizedBaseUrl}${API_PATH_PREFIX}`;
}

export const API_BASE_URL = resolveApiBaseUrl(
  import.meta.env.VITE_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL
);
