import { Prisma, UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { createAuditLog } from "@/lib/audit/logger";
import { requireRole, requireSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { integrationUpdateSchema } from "@/lib/validation/platform";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { user, errorResponse } = await requireSession(request);
  if (!user || errorResponse) return errorResponse;

  const integrations = await prisma.integrationConfig.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { provider: "asc" },
  });

  return NextResponse.json({ integrations });
}

export async function PATCH(request: NextRequest) {
  const { user, errorResponse } = await requireRole(request, [UserRole.ADMIN, UserRole.RECRUITER]);
  if (!user || errorResponse) return errorResponse;

  try {
    const body = await request.json();
    const payload = integrationUpdateSchema.parse(body);

    const existing = await prisma.integrationConfig.findUnique({
      where: {
        organizationId_provider: {
          organizationId: user.organizationId,
          provider: payload.provider,
        },
      },
    });
    const resolvedConfig = payload.configJson ?? existing?.configJson ?? {};

    const integration = existing
      ? await prisma.integrationConfig.update({
          where: { id: existing.id },
          data: {
            status: payload.status,
            configJson: toInputJson(resolvedConfig),
            lastSyncAt: payload.status === "CONNECTED" ? new Date() : existing.lastSyncAt,
          },
        })
      : await prisma.integrationConfig.create({
          data: {
            organizationId: user.organizationId,
            provider: payload.provider,
            status: payload.status,
            configJson: toInputJson(resolvedConfig),
            lastSyncAt: payload.status === "CONNECTED" ? new Date() : null,
          },
        });

    await createAuditLog({
      organizationId: user.organizationId,
      actorId: user.userId,
      action: "INTEGRATION_UPDATED",
      entityType: "IntegrationConfig",
      entityId: integration.id,
      oldValue: existing,
      newValue: integration,
    });

    return NextResponse.json({ integration });
  } catch (error) {
    console.error("Integration update error", error);
    return NextResponse.json({ error: "Failed to update integration config." }, { status: 500 });
  }
}

function toInputJson(value: unknown): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput {
  if (value === null) {
    return Prisma.JsonNull;
  }
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
