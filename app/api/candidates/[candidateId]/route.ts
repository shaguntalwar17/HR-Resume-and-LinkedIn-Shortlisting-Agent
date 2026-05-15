import { UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createAuditLog } from "@/lib/audit/logger";
import { requireRole, requireSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { mapCandidate } from "@/lib/db/mappers";

const updateCandidateSchema = z.object({
  fullName: z.string().min(2).optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  currentTitle: z.string().nullable().optional(),
  currentCompany: z.string().nullable().optional(),
  experienceYears: z.number().nonnegative().optional(),
  tags: z.array(z.string()).optional(),
});

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
      resumeDocuments: true,
      linkedInProfiles: true,
      applications: {
        include: {
          job: true,
          reviews: {
            include: {
              reviewer: true,
            },
          },
        },
      },
    },
  });

  if (!candidate) {
    return NextResponse.json({ error: "Candidate not found." }, { status: 404 });
  }

  return NextResponse.json({ candidate: mapCandidate(candidate) });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ candidateId: string }> }
) {
  const { user, errorResponse } = await requireRole(request, [UserRole.ADMIN, UserRole.RECRUITER]);
  if (!user || errorResponse) return errorResponse;

  try {
    const { candidateId } = await context.params;
    const existing = await prisma.candidate.findFirst({
      where: { id: candidateId, organizationId: user.organizationId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Candidate not found." }, { status: 404 });
    }

    const body = await request.json();
    const payload = updateCandidateSchema.parse(body);

    const updated = await prisma.candidate.update({
      where: { id: existing.id },
      data: {
        fullName: payload.fullName ?? existing.fullName,
        email: payload.email ?? existing.email,
        phone: payload.phone ?? existing.phone,
        location: payload.location ?? existing.location,
        currentTitle: payload.currentTitle ?? existing.currentTitle,
        currentCompany: payload.currentCompany ?? existing.currentCompany,
        experienceYears: payload.experienceYears ?? existing.experienceYears,
        tags: payload.tags ?? (existing.tags as string[]),
      },
    });

    await createAuditLog({
      organizationId: user.organizationId,
      actorId: user.userId,
      action: "CANDIDATE_UPDATED",
      entityType: "Candidate",
      entityId: updated.id,
      oldValue: existing,
      newValue: updated,
    });

    return NextResponse.json({ candidate: mapCandidate(updated) });
  } catch (error) {
    console.error("Update candidate error", error);
    return NextResponse.json({ error: "Failed to update candidate." }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ candidateId: string }> }
) {
  const { user, errorResponse } = await requireRole(request, [UserRole.ADMIN, UserRole.RECRUITER]);
  if (!user || errorResponse) return errorResponse;

  try {
    const { candidateId } = await context.params;
    const existing = await prisma.candidate.findFirst({
      where: { id: candidateId, organizationId: user.organizationId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Candidate not found." }, { status: 404 });
    }

    await prisma.candidate.delete({ where: { id: existing.id } });

    await createAuditLog({
      organizationId: user.organizationId,
      actorId: user.userId,
      action: "CANDIDATE_DELETED",
      entityType: "Candidate",
      entityId: existing.id,
      oldValue: existing,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete candidate error", error);
    return NextResponse.json({ error: "Failed to delete candidate." }, { status: 500 });
  }
}
