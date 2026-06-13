import type { Request } from 'express';

const normalizeBaseUrl = (value: string) => value.replace(/\/+$/, '');

const isLocalhostBaseUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '::1';
  } catch {
    return false;
  }
};

export const getPublicFrontendBaseUrl = (req: Request): string => {
  const envFrontendUrl = String(process.env.FRONTEND_URL || '').trim();
  const originHeader = String(req.headers.origin || '').trim();
  const refererHeader = String(req.headers.referer || '').trim();
  const requestOrigin = originHeader || (() => {
    if (!refererHeader) return '';
    try {
      const refererUrl = new URL(refererHeader);
      return `${refererUrl.protocol}//${refererUrl.host}`;
    } catch {
      return '';
    }
  })();

  if (envFrontendUrl && (!isLocalhostBaseUrl(envFrontendUrl) || !requestOrigin || isLocalhostBaseUrl(requestOrigin))) {
    return normalizeBaseUrl(envFrontendUrl);
  }

  if (originHeader) {
    return normalizeBaseUrl(originHeader);
  }

  if (refererHeader) {
    try {
      const refererUrl = new URL(refererHeader);
      return normalizeBaseUrl(`${refererUrl.protocol}//${refererUrl.host}`);
    } catch (_error) {
      // Continue with proxy/request fallbacks.
    }
  }

  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const forwardedHost = String(req.headers['x-forwarded-host'] || '').split(',')[0].trim();
  if (forwardedProto && forwardedHost) {
    return normalizeBaseUrl(`${forwardedProto}://${forwardedHost}`);
  }

  return normalizeBaseUrl(`${req.protocol}://${req.get('host') || 'localhost:5174'}`);
};
