import { Prisma, UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { createAuditLog } from "@/lib/audit/logger";
import { requireRole, requireSession } from "@/lib/auth/guards";
import { mapJob } from "@/lib/db/mappers";
import { prisma } from "@/lib/db/prisma";
import { parseJobDescription } from "@/lib/parsers/jd-parser";
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
          scoreBreakdowns: true,
        },
      },
    },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  return NextResponse.json({ job: mapJob(job) });
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
    const mergedDescription = payload.description ?? existing.description;
    const parsedJd = parseJobDescription(mergedDescription);
    const requiredSkills = payload.requiredSkills ?? (existing.requiredSkills as string[]);
    const preferredSkills = payload.preferredSkills ?? (existing.preferredSkills as string[]);
    const responsibilities = payload.responsibilities ?? ((existing.responsibilities as string[]) ?? []);
    const qualifications = payload.qualifications ?? ((existing.qualifications as string[]) ?? []);
    const certifications = payload.certifications ?? ((existing.certifications as string[]) ?? []);

    const job = await prisma.jobRequisition.update({
      where: { id: existing.id },
      data: {
        title: payload.title ?? existing.title,
        department: payload.department ?? existing.department,
        location: payload.location ?? existing.location,
        employmentType: payload.employmentType ?? existing.employmentType,
        seniority: payload.seniority ?? existing.seniority,
        description: mergedDescription,
        salaryMin: payload.salaryMin ?? existing.salaryMin,
        salaryMax: payload.salaryMax ?? existing.salaryMax,
        requiredSkills: toInputJson(requiredSkills),
        preferredSkills: toInputJson(preferredSkills),
        responsibilities: toNullableInputJson(responsibilities),
        qualifications: toNullableInputJson(qualifications),
        certifications: toNullableInputJson(certifications),
        minExperience: payload.minExperience ?? existing.minExperience,
        maxExperience: payload.maxExperience ?? existing.maxExperience,
        status: payload.status ?? existing.status,
        scoringConfig: toNullableInputJson(payload.scoringConfig ?? existing.scoringConfig),
        knockoutCriteria: toNullableInputJson(payload.knockoutCriteria ?? existing.knockoutCriteria),
        jdParsedJson: toInputJson(parsedJd),
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

    return NextResponse.json({ job: mapJob(job) });
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
