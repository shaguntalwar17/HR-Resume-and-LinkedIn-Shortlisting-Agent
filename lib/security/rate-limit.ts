import { NextRequest, NextResponse } from "next/server";

type RateLimitWindow = {
  count: number;
  expiresAt: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

declare global {
  var __hirewiseRateLimitStore: Map<string, RateLimitWindow> | undefined;
}

const store = global.__hirewiseRateLimitStore ?? new Map<string, RateLimitWindow>();
if (!global.__hirewiseRateLimitStore) {
  global.__hirewiseRateLimitStore = store;
}

export function getRequestFingerprint(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown-ip";
  const userAgent = request.headers.get("user-agent") ?? "unknown-agent";
  return `${ip}:${userAgent.slice(0, 120)}`;
}

export function evaluateRateLimit(input: {
  namespace: string;
  fingerprint: string;
  limit: number;
  windowMs: number;
}): RateLimitResult {
  const now = Date.now();
  const key = `${input.namespace}:${input.fingerprint}`;
  const current = store.get(key);

  if (!current || current.expiresAt <= now) {
    store.set(key, {
      count: 1,
      expiresAt: now + input.windowMs,
    });
    return {
      allowed: true,
      remaining: Math.max(0, input.limit - 1),
      retryAfterSeconds: Math.ceil(input.windowMs / 1000),
    };
  }

  current.count += 1;
  store.set(key, current);

  const remaining = Math.max(0, input.limit - current.count);
  if (current.count > input.limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((current.expiresAt - now) / 1000)),
    };
  }

  return {
    allowed: true,
    remaining,
    retryAfterSeconds: Math.max(1, Math.ceil((current.expiresAt - now) / 1000)),
  };
}

export function rateLimitExceededResponse(result: RateLimitResult) {
  return NextResponse.json(
    {
      error: "Too many requests. Please try again later.",
      retryAfterSeconds: result.retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSeconds),
        "X-RateLimit-Remaining": String(result.remaining),
      },
    }
  );
}
