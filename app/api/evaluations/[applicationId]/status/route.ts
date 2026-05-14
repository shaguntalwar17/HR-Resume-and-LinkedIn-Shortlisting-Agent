import { UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { createAuditLog } from "@/lib/audit/logger";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { applicationStatusUpdateSchema } from "@/lib/validation/platform";

export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ applicationId: string }> }
) {
  const { user, errorResponse } = await requireRole(request, [
    UserRole.ADMIN,
    UserRole.RECRUITER,
    UserRole.HIRING_MANAGER,
  ]);
  if (!user || errorResponse) return errorResponse;

  try {
    const { applicationId } = await context.params;
    const body = await request.json();
    const payload = applicationStatusUpdateSchema.parse(body);

    const existing = await prisma.applicationEvaluation.findFirst({
      where: {
        id: applicationId,
        job: { organizationId: user.organizationId },
      },
      include: { job: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Application evaluation not found." }, { status: 404 });
    }

    const updated = await prisma.applicationEvaluation.update({
      where: { id: existing.id },
      data: {
        status: payload.status,
        recommendation: payload.recommendation ?? existing.recommendation,
        assignedHiringManagerId: payload.assignHiringManagerId ?? existing.assignedHiringManagerId,
      },
    });

    if (payload.notes) {
      await prisma.recruiterReview.create({
        data: {
          applicationId: existing.id,
          reviewerId: user.userId,
          decision: "COMMENT",
          notes: payload.notes,
        },
      });
    }

    await createAuditLog({
      organizationId: user.organizationId,
      actorId: user.userId,
      action: "APPLICATION_STATUS_UPDATED",
      entityType: "ApplicationEvaluation",
      entityId: updated.id,
      oldValue: existing,
      newValue: updated,
    });

    return NextResponse.json({ application: updated });
  } catch (error) {
    console.error("Update application status error", error);
    return NextResponse.json({ error: "Failed to update application status." }, { status: 500 });
  }
}
