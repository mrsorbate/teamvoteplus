"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const level = (process.env.LOG_LEVEL || 'info').toLowerCase();
const levels = { debug: 0, info: 1, warn: 2, error: 3 };
const minLevel = levels[level] ?? levels.info;
const stamp = () => new Date().toISOString();
exports.logger = {
    debug: (...args) => {
        if (minLevel <= levels.debug)
            console.debug(`[${stamp()}] [DEBUG]`, ...args);
    },
    info: (...args) => {
        if (minLevel <= levels.info)
            console.log(`[${stamp()}] [INFO]`, ...args);
    },
    warn: (...args) => {
        if (minLevel <= levels.warn)
            console.warn(`[${stamp()}] [WARN]`, ...args);
    },
    error: (...args) => {
        if (minLevel <= levels.error)
            console.error(`[${stamp()}] [ERROR]`, ...args);
    },
};
//# sourceMappingURL=logger.js.map