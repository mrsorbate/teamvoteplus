import type { Request } from 'express';

const LEGACY_CALENDAR_TOKEN_HEX_REGEX = /^[0-9a-f]{48}$/i;
const COMPACT_CALENDAR_TOKEN_BASE64URL_REGEX = /^[A-Za-z0-9_-]{32}$/;

export const hexTokenToBase64Url = (token: string): string | null => {
  if (!LEGACY_CALENDAR_TOKEN_HEX_REGEX.test(token)) {
    return null;
  }

  return Buffer.from(token, 'hex')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
};

export const base64UrlTokenToHex = (token: string): string | null => {
  if (!COMPACT_CALENDAR_TOKEN_BASE64URL_REGEX.test(token)) {
    return null;
  }

  const padded = token + '='.repeat((4 - (token.length % 4)) % 4);
  const rawBase64 = padded.replace(/-/g, '+').replace(/_/g, '/');
  const decoded = Buffer.from(rawBase64, 'base64');
  if (decoded.length !== 24) {
    return null;
  }
  return decoded.toString('hex');
};

export const getCalendarTokenVariants = (token: string | null | undefined): Set<string> => {
  const normalized = String(token || '').trim();
  const variants = new Set<string>();
  if (!normalized) {
    return variants;
  }

  variants.add(normalized);

  const asBase64Url = hexTokenToBase64Url(normalized);
  if (asBase64Url) {
    variants.add(asBase64Url);
  }

  const asHex = base64UrlTokenToHex(normalized);
  if (asHex) {
    variants.add(asHex);
  }

  return variants;
};

export const getCalendarUrls = (req: Request, teamId: number, token: string | null | undefined) => {
  const normalizedToken = String(token || '').trim();
  if (!normalizedToken) {
    return { calendar_enabled: false, calendar_feed_url: null, calendar_webcal_url: null };
  }

  const compactToken = hexTokenToBase64Url(normalizedToken) || normalizedToken;
  const forwardedProto = String(req.headers?.['x-forwarded-proto'] || '').split(',')[0]?.trim();
  const protocol = forwardedProto || req.protocol || 'http';
  const host = String(req.get('host') || '').trim();
  if (!host) {
    return { calendar_enabled: true, calendar_feed_url: null, calendar_webcal_url: null };
  }

  const calendarFeedUrl = `${protocol}://${host}/api/teams/${teamId}/calendar.ics?token=${encodeURIComponent(compactToken)}`;
  return {
    calendar_enabled: true,
    calendar_feed_url: calendarFeedUrl,
    calendar_webcal_url: calendarFeedUrl.replace(/^https?:\/\//i, 'webcal://'),
  };
};
