// A simple in-memory rate limiter using Map
// Note: In a multi-instance production environment, Redis is preferred.
// But for a single Node.js instance, Map works perfectly.

interface RateLimitData {
  lastRequest: number;
}

const rateLimiterCache = new Map<string, RateLimitData>();

/**
 * Validates if the user is making requests too quickly.
 * @param discordId The user's Discord ID
 * @param action The specific action/endpoint (e.g., 'buy-racing')
 * @param minIntervalMs Minimum milliseconds allowed between requests (Default: 1000ms = 1s)
 * @returns true if allowed, false if rate limited
 */
export function checkRateLimit(discordId: string | number, action: string, minIntervalMs: number = 1000): boolean {
  const key = `${discordId}:${action}`;
  const now = Date.now();
  
  const record = rateLimiterCache.get(key);
  
  if (record) {
    const timeSinceLastRequest = now - record.lastRequest;
    if (timeSinceLastRequest < minIntervalMs) {
      return false; // Rate limited!
    }
  }
  
  // Allowed! Update the last request time
  rateLimiterCache.set(key, { lastRequest: now });
  
  // Cleanup old entries randomly to prevent memory leaks (simple garbage collection)
  if (Math.random() < 0.01 && rateLimiterCache.size > 1000) {
    const expirationTime = now - 60000; // 1 minute old
    for (const [k, v] of rateLimiterCache.entries()) {
      if (v.lastRequest < expirationTime) {
        rateLimiterCache.delete(k);
      }
    }
  }

  return true;
}
