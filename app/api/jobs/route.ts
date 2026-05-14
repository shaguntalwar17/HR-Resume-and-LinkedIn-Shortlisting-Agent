import { Prisma, UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { createAuditLog } from "@/lib/audit/logger";
import { requireRole, requireSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { createJobSchema } from "@/lib/validation/platform";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { user, errorResponse } = await requireSession(request);
  if (!user || errorResponse) return errorResponse;

  const jobs = await prisma.jobRequisition.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: {
        select: {
          applications: true,
        },
      },
    },
  });

  return NextResponse.json({ jobs });
}

export async function POST(request: NextRequest) {
  const { user, errorResponse } = await requireRole(request, [UserRole.ADMIN, UserRole.RECRUITER]);
  if (!user || errorResponse) return errorResponse;

  try {
    const body = await request.json();
    const payload = createJobSchema.parse(body);

    const job = await prisma.jobRequisition.create({
      data: {
        organizationId: user.organizationId,
        title: payload.title,
        department: payload.department ?? null,
        location: payload.location ?? null,
        employmentType: payload.employmentType ?? null,
        seniority: payload.seniority ?? null,
        description: payload.description,
        requiredSkills: toInputJson(payload.requiredSkills),
        preferredSkills: toInputJson(payload.preferredSkills),
        minExperience: payload.minExperience,
        maxExperience: payload.maxExperience ?? null,
        status: payload.status,
        scoringConfig: payload.scoringConfig ? toInputJson(payload.scoringConfig) : Prisma.JsonNull,
        createdById: user.userId,
      },
    });

    await createAuditLog({
      organizationId: user.organizationId,
      actorId: user.userId,
      action: "JOB_CREATED",
      entityType: "JobRequisition",
      entityId: job.id,
      newValue: job,
    });

    return NextResponse.json({ job }, { status: 201 });
  } catch (error) {
    console.error("Create job error", error);
    return NextResponse.json({ error: "Failed to create job requisition." }, { status: 500 });
  }
}

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
