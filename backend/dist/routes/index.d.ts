import type { Application } from 'express';
import type { createRateLimiter } from '../middleware/rateLimit';
type RateLimiterMiddleware = ReturnType<typeof createRateLimiter>;
export declare function registerRoutes(app: Application, authLimiter: RateLimiterMiddleware): void;
export {};
//# sourceMappingURL=index.d.ts.map