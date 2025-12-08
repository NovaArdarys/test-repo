const MAX_PRIORITY = 2_097_152;

export const getPriorityByDate = (date: string) => {
  const base = new Date(date).getTime();
  return Math.floor((base / 10_000_000_000) % MAX_PRIORITY);
};