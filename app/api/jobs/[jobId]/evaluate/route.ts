import { UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { createAuditLog } from "@/lib/audit/logger";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { evaluateApplicationFit } from "@/lib/scoring/platform-evaluator";
import { evaluateCandidatesSchema } from "@/lib/validation/platform";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ jobId: string }> }
) {
  const { user, errorResponse } = await requireRole(request, [UserRole.ADMIN, UserRole.RECRUITER]);
  if (!user || errorResponse) return errorResponse;

  try {
    const { jobId } = await context.params;
    const body = await request.json();
    const payload = evaluateCandidatesSchema.parse({
      ...body,
      jobId,
    });

    const job = await prisma.jobRequisition.findFirst({
      where: { id: payload.jobId, organizationId: user.organizationId },
    });
    if (!job) {
      return NextResponse.json({ error: "Job requisition not found." }, { status: 404 });
    }

    const organizationSetting = await prisma.organizationSetting.findUnique({
      where: { organizationId: user.organizationId },
    });

    const candidates = await prisma.candidate.findMany({
      where: {
        organizationId: user.organizationId,
        ...(payload.candidateIds?.length ? { id: { in: payload.candidateIds } } : {}),
      },
      orderBy: { updatedAt: "desc" },
    });

    const evaluationResults = [];
    for (const candidate of candidates) {
      const score = await evaluateApplicationFit({
        job,
        candidate,
        orgSetting: organizationSetting
          ? {
              minimumScoreThreshold: organizationSetting.minimumScoreThreshold,
              knockoutCriteria: (organizationSetting.knockoutCriteria ?? undefined) as
                | {
                    minimumMandatorySkillMatchPercentage?: number;
                    minimumExperienceYears?: number;
                    rejectOnMissingMandatorySkillsCount?: number;
                  }
                | undefined,
            }
          : undefined,
      });

      const existingApplication = await prisma.applicationEvaluation.findUnique({
        where: { jobId_candidateId: { jobId: job.id, candidateId: candidate.id } },
      });

      const application = existingApplication
        ? await prisma.applicationEvaluation.update({
            where: { id: existingApplication.id },
            data: {
              ...score,
              status: "EVALUATED",
            },
          })
        : await prisma.applicationEvaluation.create({
            data: {
              jobId: job.id,
              candidateId: candidate.id,
              ...score,
              status: "EVALUATED",
            },
          });

      evaluationResults.push(application);
    }

    await createAuditLog({
      organizationId: user.organizationId,
      actorId: user.userId,
      action: "BULK_EVALUATION_RUN",
      entityType: "JobRequisition",
      entityId: job.id,
      newValue: {
        evaluatedCandidates: evaluationResults.length,
      },
    });

    return NextResponse.json({
      jobId: job.id,
      evaluatedCount: evaluationResults.length,
      applications: evaluationResults,
    });
  } catch (error) {
    console.error("Bulk evaluate error", error);
    return NextResponse.json({ error: "Failed to evaluate candidates." }, { status: 500 });
  }
}
