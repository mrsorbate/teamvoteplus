const level = (process.env.LOG_LEVEL || 'info').toLowerCase();
const levels = { debug: 0, info: 1, warn: 2, error: 3 } as const;
const minLevel = levels[level as keyof typeof levels] ?? levels.info;

const stamp = () => new Date().toISOString();

export const logger = {
  debug: (...args: unknown[]) => {
    if (minLevel <= levels.debug) console.debug(`[${stamp()}] [DEBUG]`, ...args);
  },
  info: (...args: unknown[]) => {
    if (minLevel <= levels.info) console.log(`[${stamp()}] [INFO]`, ...args);
  },
  warn: (...args: unknown[]) => {
    if (minLevel <= levels.warn) console.warn(`[${stamp()}] [WARN]`, ...args);
  },
  error: (...args: unknown[]) => {
    if (minLevel <= levels.error) console.error(`[${stamp()}] [ERROR]`, ...args);
  },
};
