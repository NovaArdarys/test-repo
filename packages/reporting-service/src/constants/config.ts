export const EXCHANGE_NAME = {
  REPORTING_EVENTS: 'REPORTING_EVENTS',
  USER_EVENTS: 'USER_EVENTS',
  LOG_EVENTS: 'LOG_EVENTS',
};

export const REDIS_PERMIISONS_KEY_PREFIX = 'permissions:role:';

/**
 * Returns a Unix timestamp (seconds) 30 days from the time of calling.
 * NOTE: Previous implementation was a module-load-time constant — this fix
 * ensures every issuance gets an accurate 30-day TTL.
 */
export const getTimestamp30Days = (): number =>
  Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30;

/**
 * Allowed CORS origins — keep in sync across all services.
 * TODO: extract to a shared workspace constant once a packages/shared module exists.
 */
export const ALLOWED_ORIGINS = [
  'localhost',
  'https://sip-mbg.bappenas.go.id',
  'http://localhost:5173',
  'http://128.199.77.145:3001',
  'https://dev-mbg.midigi.id',
];
