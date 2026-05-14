import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { requireSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { applicationStatusSchema, recommendationSchema } from "@/lib/validation/platform";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { user, errorResponse } = await requireSession(request);
  if (!user || errorResponse) return errorResponse;

  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");
  const statusRaw = searchParams.get("status");
  const recommendationRaw = searchParams.get("recommendation");
  const search = searchParams.get("search")?.trim();
  const minScore = Number.parseFloat(searchParams.get("minScore") ?? "");
  const maxScore = Number.parseFloat(searchParams.get("maxScore") ?? "");

  const where: Prisma.ApplicationEvaluationWhereInput = {
    job: { organizationId: user.organizationId },
    ...(jobId ? { jobId } : {}),
    ...(statusRaw ? { status: applicationStatusSchema.parse(statusRaw) } : {}),
    ...(recommendationRaw ? { recommendation: recommendationSchema.parse(recommendationRaw) } : {}),
    ...(Number.isFinite(minScore) || Number.isFinite(maxScore)
      ? {
          overallScore: {
            gte: Number.isFinite(minScore) ? minScore : undefined,
            lte: Number.isFinite(maxScore) ? maxScore : undefined,
          },
        }
      : {}),
    ...(search
      ? {
          candidate: {
            fullName: {
              contains: search,
            },
          },
        }
      : {}),
  };

  const applications = await prisma.applicationEvaluation.findMany({
    where,
    include: {
      candidate: true,
      job: true,
      assignedHiringManager: true,
      reviews: {
        include: {
          reviewer: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: [{ overallScore: "desc" }, { updatedAt: "desc" }],
  });

  return NextResponse.json({ applications });
}
