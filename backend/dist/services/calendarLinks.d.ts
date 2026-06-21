import type { Request } from 'express';
export declare const hexTokenToBase64Url: (token: string) => string | null;
export declare const base64UrlTokenToHex: (token: string) => string | null;
export declare const getCalendarTokenVariants: (token: string | null | undefined) => Set<string>;
export declare const getCalendarUrls: (req: Request, teamId: number, token: string | null | undefined) => {
    calendar_enabled: boolean;
    calendar_feed_url: null;
    calendar_webcal_url: null;
} | {
    calendar_enabled: boolean;
    calendar_feed_url: string;
    calendar_webcal_url: string;
};
//# sourceMappingURL=calendarLinks.d.ts.map