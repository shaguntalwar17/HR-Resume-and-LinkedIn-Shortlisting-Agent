import { NextRequest, NextResponse } from "next/server";

import { requireSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ candidateId: string }> }
) {
  const { user, errorResponse } = await requireSession(request);
  if (!user || errorResponse) return errorResponse;

  const { candidateId } = await context.params;

  const candidate = await prisma.candidate.findFirst({
    where: {
      id: candidateId,
      organizationId: user.organizationId,
    },
    include: {
      applications: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!candidate) {
    return NextResponse.json({ error: "Candidate not found." }, { status: 404 });
  }

  const entityIds = [candidate.id, ...candidate.applications.map((application) => application.id)];

  const logs = await prisma.auditLog.findMany({
    where: {
      organizationId: user.organizationId,
      entityId: { in: entityIds },
    },
    include: {
      actor: {
        select: {
          name: true,
          email: true,
          role: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({
    candidateId,
    events: logs,
  });
}
