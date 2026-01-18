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
export const TIMESTAMP_30_DAYS = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30;
