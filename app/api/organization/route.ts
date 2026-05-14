import { UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createAuditLog } from "@/lib/audit/logger";
import { requireRole, requireSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";

const updateOrganizationSchema = z.object({
  name: z.string().min(2),
  industry: z.string().optional(),
});

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { user, errorResponse } = await requireSession(request);
  if (!user || errorResponse) return errorResponse;

  const organization = await prisma.organization.findUnique({
    where: { id: user.organizationId },
  });

  return NextResponse.json({ organization });
}

export async function PATCH(request: NextRequest) {
  const { user, errorResponse } = await requireRole(request, [UserRole.ADMIN]);
  if (!user || errorResponse) return errorResponse;

  try {
    const body = await request.json();
    const payload = updateOrganizationSchema.parse(body);
    const existing = await prisma.organization.findUnique({
      where: { id: user.organizationId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Organization not found." }, { status: 404 });
    }

    const organization = await prisma.organization.update({
      where: { id: user.organizationId },
      data: {
        name: payload.name,
        industry: payload.industry ?? null,
      },
    });

    await createAuditLog({
      organizationId: user.organizationId,
      actorId: user.userId,
      action: "ORGANIZATION_UPDATED",
      entityType: "Organization",
      entityId: organization.id,
      oldValue: existing,
      newValue: organization,
    });

    return NextResponse.json({ organization });
  } catch (error) {
    console.error("Organization update error", error);
    return NextResponse.json({ error: "Failed to update organization." }, { status: 500 });
  }
}
