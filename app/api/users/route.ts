import { UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createAuditLog } from "@/lib/audit/logger";
import { requireRole, requireSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";

const updateRoleSchema = z.object({
  userId: z.string(),
  role: z.nativeEnum(UserRole),
});

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { user, errorResponse } = await requireSession(request);
  if (!user || errorResponse) return errorResponse;

  const users = await prisma.user.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ users });
}

export async function PATCH(request: NextRequest) {
  const { user, errorResponse } = await requireRole(request, [UserRole.ADMIN]);
  if (!user || errorResponse) return errorResponse;

  try {
    const body = await request.json();
    const payload = updateRoleSchema.parse(body);
    const existing = await prisma.user.findFirst({
      where: { id: payload.userId, organizationId: user.organizationId },
    });
    if (!existing) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: { role: payload.role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    await createAuditLog({
      organizationId: user.organizationId,
      actorId: user.userId,
      action: "USER_ROLE_UPDATED",
      entityType: "User",
      entityId: existing.id,
      oldValue: { role: existing.role },
      newValue: { role: updated.role },
    });

    return NextResponse.json({ user: updated });
  } catch (error) {
    console.error("Update user role error", error);
    return NextResponse.json({ error: "Failed to update user role." }, { status: 500 });
  }
}
