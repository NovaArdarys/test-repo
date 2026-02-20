export const DRIVER_ROUTING_FIELDS = [
  "portionCapacity",
  "isActive",
  "isDeleted",
] as const;

type DriverRoutingField = typeof DRIVER_ROUTING_FIELDS[number];

export function driverRoutingSensitiveDiff<T extends Record<string, any>>(
  before: T,
  after: T
): boolean {
  return DRIVER_ROUTING_FIELDS.some((field: DriverRoutingField) => {
    return before[field] !== after[field];
  });
}
