import { UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { createAuditLog } from "@/lib/audit/logger";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { recruiterReviewSchema } from "@/lib/validation/platform";

export const runtime = "nodejs";

export async function POST(
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
    const payload = recruiterReviewSchema.parse(body);

    const application = await prisma.applicationEvaluation.findFirst({
      where: {
        id: applicationId,
        job: { organizationId: user.organizationId },
      },
      include: {
        job: true,
      },
    });
    if (!application) {
      return NextResponse.json({ error: "Application evaluation not found." }, { status: 404 });
    }

    const review = await prisma.recruiterReview.create({
      data: {
        applicationId: application.id,
        reviewerId: user.userId,
        decision: payload.decision,
        notes: payload.notes,
        overrideReason: payload.overrideReason,
      },
    });

    const updatedStatus =
      payload.decision === "SHORTLIST"
        ? "REVIEWED"
        : payload.decision === "REJECT"
          ? "REJECTED"
          : payload.decision === "HOLD"
            ? "HOLD"
            : "REVIEWED";

    const updatedApplication = await prisma.applicationEvaluation.update({
      where: { id: application.id },
      data: { status: updatedStatus },
    });

    await createAuditLog({
      organizationId: user.organizationId,
      actorId: user.userId,
      action: "APPLICATION_REVIEW_ADDED",
      entityType: "ApplicationEvaluation",
      entityId: application.id,
      newValue: {
        reviewId: review.id,
        decision: review.decision,
      },
    });

    return NextResponse.json({ review, application: updatedApplication }, { status: 201 });
  } catch (error) {
    console.error("Create review error", error);
    return NextResponse.json({ error: "Failed to add recruiter review." }, { status: 500 });
  }
}
