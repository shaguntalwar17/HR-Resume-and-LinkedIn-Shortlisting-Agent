import { UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { createAuditLog } from "@/lib/audit/logger";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { applicationOverrideSchema } from "@/lib/validation/platform";

export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ applicationId: string }> }
) {
  const { user, errorResponse } = await requireRole(request, [UserRole.ADMIN, UserRole.RECRUITER]);
  if (!user || errorResponse) return errorResponse;

  try {
    const { applicationId } = await context.params;
    const body = await request.json();
    const payload = applicationOverrideSchema.parse(body);

    const existing = await prisma.applicationEvaluation.findFirst({
      where: {
        id: applicationId,
        job: { organizationId: user.organizationId },
      },
    });
    if (!existing) {
      return NextResponse.json({ error: "Application evaluation not found." }, { status: 404 });
    }

    const updated = await prisma.applicationEvaluation.update({
      where: { id: existing.id },
      data: {
        overallScore: payload.overallScore ?? existing.overallScore,
        recommendation: payload.recommendation ?? existing.recommendation,
        status:
          payload.recommendation === "REJECT"
            ? "REJECTED"
            : payload.recommendation === "HOLD"
              ? "HOLD"
              : payload.recommendation
                ? "SHORTLISTED"
                : existing.status,
      },
    });

    await prisma.recruiterReview.create({
      data: {
        applicationId: existing.id,
        reviewerId: user.userId,
        decision:
          payload.recommendation === "REJECT"
            ? "REJECT"
            : payload.recommendation === "HOLD"
              ? "HOLD"
              : "SHORTLIST",
        notes: payload.overallScore
          ? `Manual score override to ${payload.overallScore}.`
          : "Manual recommendation override.",
        overrideReason: payload.overrideReason,
      },
    });

    await createAuditLog({
      organizationId: user.organizationId,
      actorId: user.userId,
      action: "APPLICATION_OVERRIDE",
      entityType: "ApplicationEvaluation",
      entityId: updated.id,
      oldValue: existing,
      newValue: updated,
    });

    return NextResponse.json({ application: updated });
  } catch (error) {
    console.error("Application override error", error);
    return NextResponse.json({ error: "Failed to override application evaluation." }, { status: 500 });
  }
}
