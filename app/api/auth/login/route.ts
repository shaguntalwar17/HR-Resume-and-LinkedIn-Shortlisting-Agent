import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

import { createSessionToken, setSessionCookie } from "@/lib/auth/session";
import { getServerEnv } from "@/lib/config/server-env";
import { prisma } from "@/lib/db/prisma";
import { bootstrapDemoDataIfEmpty } from "@/lib/demo-data/bootstrap-db";
import { ensureDatabaseSchema } from "@/lib/db/ensure-schema";
import {
  evaluateRateLimit,
  getRequestFingerprint,
  rateLimitExceededResponse,
} from "@/lib/security/rate-limit";
import { loginSchema } from "@/lib/validation/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const env = getServerEnv();
    const rateLimit = evaluateRateLimit({
      namespace: "auth-login",
      fingerprint: getRequestFingerprint(request),
      limit: env.LOGIN_RATE_LIMIT_MAX_REQUESTS,
      windowMs: env.LOGIN_RATE_LIMIT_WINDOW_MS,
    });
    if (!rateLimit.allowed) {
      return rateLimitExceededResponse(rateLimit);
    }

    const body = await request.json();
    const payload = loginSchema.parse(body);
    await ensureDatabaseSchema();
    if (env.ENABLE_DEMO_MODE) {
      await bootstrapDemoDataIfEmpty(prisma);
    }

    const user = await prisma.user.findUnique({
      where: { email: payload.email.toLowerCase() },
      include: { organization: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const isValid = await bcrypt.compare(payload.password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const token = await createSessionToken({
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      organizationName: user.organization.name,
    });

    const response = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        organizationName: user.organization.name,
      },
    });
    setSessionCookie(response, token);
    return response;
  } catch (error) {
    console.error("Login error", error);
    return NextResponse.json({ error: "Unable to sign in." }, { status: 500 });
  }
}
