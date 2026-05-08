import { Context } from 'hono';

/**
 * Builds the standard audit-field payload from the Hono request context.
 * Extracted from register.controller.ts for reuse across multiple controllers.
 */
export const getAuditFields = (c: Context) => ({
  createdBy: c.get('userId'),
  updatedBy: c.get('userId'),
  userId: c.get('userId'),
  domain: c.get('domain'),
  subDomain: c.get('subDomain'),
  kitchenId: c.get('kitchenId') as string[],
  driverId: c.get('driverId') as string[],
  beneficiaryId: c.get('beneficiaryId') as string[],
  driverKitchenId: c.get('driverKitchenId') as string[],
  updatedAt: new Date(),
  createdAt: new Date(),
  isAppManager: c.get('isAppManager') as boolean,
});
