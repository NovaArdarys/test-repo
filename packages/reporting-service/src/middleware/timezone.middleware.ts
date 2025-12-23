import { toZonedTime, format } from "date-fns-tz";

const DEFAULT_TZ = "Asia/Jakarta";

// FIELD YANG BOLEH DI-CONVERT
const DATE_KEYS = new Set([
  "createdAt",
  "updatedAt",
  "deletedAt",
  "startAt",
  "endAt",
  "timestamp"
]);

// cache formatter per timezone
const formatterCache = new Map<string, (d: Date) => string>();

function getFormatter(tz: string) {
  if (formatterCache.has(tz)) return formatterCache.get(tz)!;

  const fn = (d: Date) =>
    format(toZonedTime(d, tz), "yyyy-MM-dd'T'HH:mm:ss.SSS");

  formatterCache.set(tz, fn);
  return fn;
}

export function applyTimezoneOptimized<T>(
  input: T,
  tz = DEFAULT_TZ
): T {
  if (!input || typeof input !== "object") return input;

  const formatDate = getFormatter(tz);

  const root = Array.isArray(input) ? [] : {};
  const stack: Array<{ src: any; target: any; }> = [
    { src: input, target: root }
  ];

  while (stack.length) {
    const { src, target } = stack.pop()!;

    for (const key of Object.keys(src)) {
      const val = src[key];

      // 🎯 HANYA FIELD TANGGAL
      if (DATE_KEYS.has(key) && typeof val === "string") {
        const d = new Date(val);
        target[key] = isNaN(d.getTime()) ? val : formatDate(d);
        continue;
      }

      // OBJECT / ARRAY
      if (val && typeof val === "object") {
        const child = Array.isArray(val) ? [] : {};
        target[key] = child;
        stack.push({ src: val, target: child });
        continue;
      }

      // PRIMITIVE
      target[key] = val;
    }
  }

  return root as T;
}
