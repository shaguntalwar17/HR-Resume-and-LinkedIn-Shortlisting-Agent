import { IntegrationProvider } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { getServerEnv } from "@/lib/config/server-env";
import { ensureDatabaseSchema } from "@/lib/db/ensure-schema";
import { prisma } from "@/lib/db/prisma";
import {
  evaluateRateLimit,
  getRequestFingerprint,
  rateLimitExceededResponse,
} from "@/lib/security/rate-limit";

export const runtime = "nodejs";

function parseProvider(value: string): IntegrationProvider | null {
  const upper = value.toUpperCase();
  if (upper === "GREENHOUSE") return "GREENHOUSE";
  if (upper === "LEVER") return "LEVER";
  if (upper === "WORKDAY") return "WORKDAY";
  if (upper === "BAMBOOHR") return "BAMBOOHR";
  if (upper === "GENERIC_WEBHOOK") return "GENERIC_WEBHOOK";
  return null;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ provider: string }> }
) {
  try {
    const env = getServerEnv();
    const rateLimit = evaluateRateLimit({
      namespace: "integration-webhook",
      fingerprint: getRequestFingerprint(request),
      limit: env.WEBHOOK_RATE_LIMIT_MAX_REQUESTS,
      windowMs: env.WEBHOOK_RATE_LIMIT_WINDOW_MS,
    });
    if (!rateLimit.allowed) {
      return rateLimitExceededResponse(rateLimit);
    }

    const sharedSecret = env.WEBHOOK_SHARED_SECRET;
    if (env.NODE_ENV === "production" && !sharedSecret) {
      return NextResponse.json(
        { error: "Webhook route is not configured. WEBHOOK_SHARED_SECRET is required in production." },
        { status: 503 }
      );
    }
    if (sharedSecret) {
      const headerSecret = request.headers.get("x-hirewise-webhook-secret");
      const authHeader = request.headers.get("authorization");
      const bearerToken =
        authHeader?.toLowerCase().startsWith("bearer ") ? authHeader.slice("bearer ".length) : null;

      if (headerSecret !== sharedSecret && bearerToken !== sharedSecret) {
        return NextResponse.json({ error: "Unauthorized webhook request." }, { status: 401 });
      }
    }

    await ensureDatabaseSchema();
    const { provider: providerRaw } = await context.params;
    const provider = parseProvider(providerRaw);
    if (!provider) {
      return NextResponse.json({ error: "Unsupported integration provider." }, { status: 400 });
    }

    const payload = await request.json();
    const organizationId =
      typeof payload.organizationId === "string" ? payload.organizationId : null;
    if (!organizationId) {
      return NextResponse.json({ error: "organizationId is required in payload." }, { status: 400 });
    }

    const log = await prisma.webhookIngestionLog.create({
      data: {
        organizationId,
        provider,
        payloadJson: payload,
        processed: true,
      },
    });

    return NextResponse.json({
      message: "Webhook payload received and logged.",
      webhookLogId: log.id,
      provider,
    });
  } catch (error) {
    console.error("Webhook ingestion error", error);
    return NextResponse.json({ error: "Failed to process webhook payload." }, { status: 500 });
  }
}
