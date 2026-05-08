export const emailConfig = {
  host: process.env.EMAIL_HOST || 'smtp.example.com',
  port: parseInt(process.env.EMAIL_PORT || '587', 10),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER || 'your-email@example.com',
    pass: process.env.EMAIL_PASS || 'your-email-password',
  },
  requireTLS: true
};

export const REDIS_PERMIISONS_KEY_PREFIX = 'permissions:role:';
export const REDIS_MENUS_KEY_PREFIX = 'menus:role:';

/**
 * Returns a Unix timestamp (seconds) 30 days from the time of calling.
 * NOTE: Previous implementation was a module-load-time constant — this fix
 * ensures every request gets an accurate 30-day TTL.
 */
export const getTimestamp30Days = (): number =>
  Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30;

/**
 * Allowed CORS origins. Centralised here to avoid duplication across
 * every service's index.ts. Consumed via @/constants/config.
 */
export const ALLOWED_ORIGINS = [
  'localhost',
  'https://sip-mbg.bappenas.go.id',
  'http://localhost:5173',
  'http://128.199.77.145:3001',
  'https://dev-mbg.midigi.id',
];
