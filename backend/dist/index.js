"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const axios_1 = __importDefault(require("axios"));
const helmet_1 = __importDefault(require("helmet"));
const init_1 = __importDefault(require("./database/init"));
const rateLimit_1 = require("./middleware/rateLimit");
const routes_1 = require("./routes");
const autoGameImport_1 = require("./services/autoGameImport");
const scheduler_1 = require("./services/scheduler");
const auth_1 = require("./middleware/auth");
const upload_1 = require("./middleware/upload");
const logger_1 = require("./utils/logger");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
const apiRateLimitWindowMs = Number(process.env.API_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
const apiRateLimitMax = Number(process.env.API_RATE_LIMIT_MAX || 300);
const authRateLimitMax = Number(process.env.AUTH_RATE_LIMIT_MAX || 20);
const corsOrigins = String(process.env.CORS_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
const apiLimiter = (0, rateLimit_1.createRateLimiter)({
    windowMs: Number.isFinite(apiRateLimitWindowMs) && apiRateLimitWindowMs > 0
        ? apiRateLimitWindowMs
        : 15 * 60 * 1000,
    max: Number.isFinite(apiRateLimitMax) && apiRateLimitMax > 0 ? apiRateLimitMax : 300,
    message: { error: 'Too many requests, please try again later.' },
});
const authLimiter = (0, rateLimit_1.createRateLimiter)({
    windowMs: Number.isFinite(apiRateLimitWindowMs) && apiRateLimitWindowMs > 0
        ? apiRateLimitWindowMs
        : 15 * 60 * 1000,
    max: Number.isFinite(authRateLimitMax) && authRateLimitMax > 0 ? authRateLimitMax : 20,
    message: { error: 'Too many auth attempts, please try again later.' },
});
// trust proxy: 1 trusts X-Forwarded-For from the first hop (MEDIUM-3).
// Only safe when the server is exclusively reachable through a single reverse proxy.
// Set to false if the server is directly Internet-accessible.
app.set('trust proxy', 1);
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: false,
}));
if (corsOrigins.length > 0) {
    app.use((0, cors_1.default)({ origin: corsOrigins }));
}
else if (process.env.NODE_ENV === 'production') {
    // Production with no CORS_ORIGIN set: reject all cross-origin requests (#3)
    app.use((0, cors_1.default)({ origin: false }));
}
else {
    app.use((0, cors_1.default)());
}
app.use(express_1.default.json());
app.use('/api', apiLimiter);
// Serve uploaded files — timestamp-suffixed filenames make these immutable (#11)
app.use('/uploads', express_1.default.static('uploads', { maxAge: '7d', immutable: true }));
// Root route
app.get('/', (req, res) => {
    res.json({
        name: 'teamvote+ API',
        version: '1.0.0',
        status: 'running',
        endpoints: {
            health: '/api/health',
            auth: {
                register: 'POST /api/auth/register',
                login: 'POST /api/auth/login',
                me: 'GET /api/auth/me'
            },
            teams: {
                list: 'GET /api/teams',
                create: 'POST /api/teams',
                details: 'GET /api/teams/:id',
                members: 'GET /api/teams/:id/members'
            },
            events: {
                list: 'GET /api/events?team_id=:id',
                create: 'POST /api/events',
                details: 'GET /api/events/:id',
                respond: 'POST /api/events/:id/response'
            },
            stats: {
                team: 'GET /api/stats/team/:id',
                player: 'GET /api/stats/player/:id'
            }
        },
        documentation: 'See README.md for complete API documentation'
    });
});
// Health check
app.get('/api/health', (req, res) => {
    try {
        init_1.default.prepare('SELECT 1 as ok').get();
        return res.json({
            status: 'ok',
            db: 'ok',
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('Health DB check failed:', error);
        return res.status(503).json({
            status: 'degraded',
            db: 'error',
            error: 'database_unavailable',
            timestamp: new Date().toISOString(),
        });
    }
});
// Badge proxy rate limiter — unauthenticated endpoint (HIGH-5)
const badgeProxyLimiter = (0, rateLimit_1.createRateLimiter)({
    windowMs: 60 * 1000,
    max: 30,
    message: { error: 'Too many badge proxy requests.' },
});
// Image proxy for fussball.de team badges (CORS workaround)
// Must be registered before generic authenticated /api routers.
app.get('/api/badge-proxy', badgeProxyLimiter, async (req, res) => {
    const url = String(req.query.url || '');
    let parsedUrl;
    try {
        parsedUrl = new URL(url);
    }
    catch {
        return res.status(400).end();
    }
    const hostname = parsedUrl.hostname.toLowerCase();
    const isFussballDomain = hostname === 'fussball.de' || hostname.endsWith('.fussball.de');
    if ((parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') || !isFussballDomain) {
        return res.status(400).end();
    }
    try {
        const response = await axios_1.default.get(parsedUrl.toString(), {
            responseType: 'arraybuffer',
            timeout: 8000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Referer': 'https://www.fussball.de/',
            },
        });
        const contentType = String(response.headers['content-type'] || 'image/png');
        res.set('Content-Type', contentType);
        res.set('Cache-Control', 'public, max-age=86400');
        res.send(response.data);
    }
    catch {
        res.status(502).end();
    }
});
// Routes (#17)
(0, routes_1.registerRoutes)(app, authLimiter);
// File upload endpoint (duplicate of admin route — kept for compatibility, auth-guarded)
app.post('/api/admin/upload/logo', auth_1.authenticate, upload_1.upload.single('logo'), (req, res) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file provided' });
        }
        const logoPath = `/uploads/${req.file.filename}`;
        init_1.default.prepare(`
      UPDATE organizations
      SET logo = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `).run(logoPath);
        const org = init_1.default.prepare('SELECT * FROM organizations WHERE id = 1').get();
        res.json(org);
    }
    catch (error) {
        console.error('Logo upload error:', error);
        res.status(500).json({ error: 'Failed to upload logo' });
    }
});
// Error handler — never leak internal details for 5xx errors (#5)
app.use((err, _req, res, _next) => {
    const status = err.status ?? err.statusCode ?? 500;
    logger_1.logger.error(err.stack ?? err.message);
    if (status >= 500) {
        res.status(status).json({ error: 'Internal server error' });
    }
    else {
        res.status(status).json({ error: err.message || 'Request error' });
    }
});
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    (0, autoGameImport_1.startAutoGameImportJob)();
    (0, scheduler_1.startScheduler)();
});
//# sourceMappingURL=index.js.map