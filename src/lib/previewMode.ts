export const PREVIEW_ROUTE_PREFIX = '/preview';

export function isPreviewPath(pathname: string) {
  return pathname === PREVIEW_ROUTE_PREFIX || pathname.startsWith(`${PREVIEW_ROUTE_PREFIX}/`);
}

export function isPreviewMode() {
  return typeof window !== 'undefined' && isPreviewPath(window.location.pathname);
}
