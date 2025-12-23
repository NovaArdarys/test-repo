import { toZonedTime, format } from "date-fns-tz";

const DEFAULT_TZ = "Asia/Jakarta";

/**
 * Paksa semua string date → UTC lalu convert
 */
function tryConvertDate(value: any, tz: string) {
  if (typeof value !== "string") return value;

  const d = new Date(value);
  if (isNaN(d.getTime())) return value;

  return format(
    toZonedTime(d, tz),
    "yyyy-MM-dd'T'HH:mm:ss.SSS"
  );
}

export function applyTimezoneIterative<T>(
  input: T,
  tz = DEFAULT_TZ
): T {
  // primitive langsung
  if (input === null || typeof input !== "object") {
    return tryConvertDate(input, tz) as T;
  }

  // root clone
  const root = Array.isArray(input) ? [] : {};
  const stack: Array<{ src: any; target: any; }> = [
    { src: input, target: root }
  ];

  while (stack.length) {
    const { src, target } = stack.pop()!;

    for (const key of Object.keys(src)) {
      const val = src[key];

      // STRING DATE
      if (typeof val === "string") {
        target[key] = tryConvertDate(val, tz);
        continue;
      }

      // ARRAY / OBJECT
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
