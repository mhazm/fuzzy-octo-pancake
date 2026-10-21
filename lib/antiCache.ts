import { NextResponse } from "next/server";

export const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
  "Pragma": "no-cache",
  "Expires": "0",
} as const;

export const NO_CACHE_FETCH_OPTIONS: RequestInit = {
  cache: "no-store",
  headers: {
    Pragma: "no-cache",
    "Cache-Control": "no-cache",
  },
};

/**
 * Helper pembungkus NextResponse.json dengan header anti-cache standar Nismara
 */
export function jsonNoCache<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      ...NO_CACHE_HEADERS,
      ...(init?.headers || {}),
    },
  });
}
