/**
 * Простой in-memory sliding-window rate limiter.
 * На serverless каждый инстанс считает independently — для v1 достаточно
 * (как в brainburg-admin: без Redis — in-memory).
 */
type Bucket = { hits: number[] };

const buckets = new Map<string, Bucket>();

/** Превышен ли лимит: не более `limit` запросов за `windowMs`. */
export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs);
  if (bucket.hits.length >= limit) {
    buckets.set(key, bucket);
    return true;
  }
  bucket.hits.push(now);
  buckets.set(key, bucket);
  return false;
}

/** IP-адрес запроса (за прокси Vercel берём x-forwarded-for). */
export function requestIp(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? "unknown";
}
