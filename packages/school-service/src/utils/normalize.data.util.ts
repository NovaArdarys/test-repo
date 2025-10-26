export const normalizeArrayKeys = (obj: Record<string, any>) => {
  const result: Record<string, any> = {};

  Object.entries(obj).forEach(([key, value]) => {
    if (key.endsWith("[]")) {
      const newKey = key.slice(0, -2);
      result[newKey] = Array.isArray(value) ? value : [value];
    } else {
      result[key] = value;
    }
  });

  return result;
};