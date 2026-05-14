import { Prisma, UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { createAuditLog } from "@/lib/audit/logger";
import { requireRole, requireSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { updateJobSchema } from "@/lib/validation/platform";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ jobId: string }> }
) {
  const { user, errorResponse } = await requireSession(request);
  if (!user || errorResponse) return errorResponse;

  const { jobId } = await context.params;
  const job = await prisma.jobRequisition.findFirst({
    where: { id: jobId, organizationId: user.organizationId },
    include: {
      applications: {
        include: {
          candidate: true,
        },
      },
    },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  return NextResponse.json({ job });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ jobId: string }> }
) {
  const { user, errorResponse } = await requireRole(request, [UserRole.ADMIN, UserRole.RECRUITER]);
  if (!user || errorResponse) return errorResponse;

  try {
    const { jobId } = await context.params;
    const existing = await prisma.jobRequisition.findFirst({
      where: { id: jobId, organizationId: user.organizationId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Job not found." }, { status: 404 });
    }

    const body = await request.json();
    const payload = updateJobSchema.parse(body);

    const job = await prisma.jobRequisition.update({
      where: { id: existing.id },
      data: {
        title: payload.title ?? existing.title,
        department: payload.department ?? existing.department,
        location: payload.location ?? existing.location,
        employmentType: payload.employmentType ?? existing.employmentType,
        seniority: payload.seniority ?? existing.seniority,
        description: payload.description ?? existing.description,
        requiredSkills: toInputJson(payload.requiredSkills ?? existing.requiredSkills),
        preferredSkills: toInputJson(payload.preferredSkills ?? existing.preferredSkills),
        minExperience: payload.minExperience ?? existing.minExperience,
        maxExperience: payload.maxExperience ?? existing.maxExperience,
        status: payload.status ?? existing.status,
        scoringConfig: toNullableInputJson(payload.scoringConfig ?? existing.scoringConfig),
      },
    });

    await createAuditLog({
      organizationId: user.organizationId,
      actorId: user.userId,
      action: "JOB_UPDATED",
      entityType: "JobRequisition",
      entityId: job.id,
      oldValue: existing,
      newValue: job,
    });

    return NextResponse.json({ job });
  } catch (error) {
    console.error("Update job error", error);
    return NextResponse.json({ error: "Failed to update job requisition." }, { status: 500 });
  }
}

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function toNullableInputJson(value: unknown): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput {
  if (value === null || value === undefined) {
    return Prisma.JsonNull;
  }
  return toInputJson(value);
}
