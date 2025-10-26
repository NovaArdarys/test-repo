import { UAParser } from 'ua-parser-js';
import { Context } from 'hono';

function getClientIp(c: Context): string {
  const forwardedFor = c.req.header('X-Forwarded-For');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  return c.req.header('CF-Connecting-IP') ||
    c.req.header('X-Real-IP') ||
    (c.env as any)?.remoteAddress ||
    'unknown';
}

interface DeviceInfo {
  ip: string;
  userAgent: string;
  deviceType: string;
  browser: string;
  os: string;
  location: {
    city: string;
    country: string;
  };
}

export function parseDeviceInfo(c: Context): DeviceInfo {
  const ip = getClientIp(c);
  const userAgent = c.req.header('User-Agent') || 'unknown';

  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  const deviceType = result.device.type || 'desktop';
  const browser = result.browser.name || 'Unknown Browser';
  const os = result.os.name || 'Unknown OS';

  return {
    ip,
    userAgent,
    deviceType,
    browser,
    os,
    location: {
      city: 'N/A',
      country: 'N/A',
    }
  };
}
