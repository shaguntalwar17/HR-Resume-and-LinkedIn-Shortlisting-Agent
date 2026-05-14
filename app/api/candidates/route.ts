import { CandidateSource, Prisma, UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createAuditLog } from "@/lib/audit/logger";
import { requireRole, requireSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { mapCandidate } from "@/lib/db/mappers";

const createCandidateSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  currentTitle: z.string().optional(),
  currentCompany: z.string().optional(),
  experienceYears: z.number().nonnegative().default(0),
  source: z.nativeEnum(CandidateSource).default(CandidateSource.REFERRAL),
  parsedResumeText: z.string().min(10),
  skills: z.array(z.string()).default([]),
  education: z.array(z.string()).default([]),
  certifications: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
});

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { user, errorResponse } = await requireSession(request);
  if (!user || errorResponse) return errorResponse;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim();
  const skill = searchParams.get("skill")?.trim();
  const minExperience = Number.parseFloat(searchParams.get("minExperience") ?? "");
  const maxExperience = Number.parseFloat(searchParams.get("maxExperience") ?? "");

  const where: Prisma.CandidateWhereInput = {
    organizationId: user.organizationId,
  };

  if (search) {
    where.OR = [
      { fullName: { contains: search } },
      { currentTitle: { contains: search } },
      { currentCompany: { contains: search } },
    ];
  }

  if (Number.isFinite(minExperience) || Number.isFinite(maxExperience)) {
    where.experienceYears = {
      gte: Number.isFinite(minExperience) ? minExperience : undefined,
      lte: Number.isFinite(maxExperience) ? maxExperience : undefined,
    };
  }

  const candidates = await prisma.candidate.findMany({
    where,
    include: {
      applications: {
        include: {
          job: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const filteredCandidates = skill
    ? candidates.filter((candidate) =>
        ((candidate.skills as string[]) ?? []).some((entry) =>
          entry.toLowerCase().includes(skill.toLowerCase())
        )
      )
    : candidates;

  return NextResponse.json({
    candidates: filteredCandidates.map(mapCandidate),
  });
}

export async function POST(request: NextRequest) {
  const { user, errorResponse } = await requireRole(request, [UserRole.ADMIN, UserRole.RECRUITER]);
  if (!user || errorResponse) return errorResponse;

  try {
    const body = await request.json();
    const payload = createCandidateSchema.parse(body);
    const candidate = await prisma.candidate.create({
      data: {
        organizationId: user.organizationId,
        fullName: payload.fullName,
        email: payload.email ?? null,
        phone: payload.phone ?? null,
        location: payload.location ?? null,
        currentTitle: payload.currentTitle ?? null,
        currentCompany: payload.currentCompany ?? null,
        experienceYears: payload.experienceYears,
        source: payload.source,
        resumeUrl: null,
        parsedResumeText: payload.parsedResumeText,
        linkedInJson: undefined,
        tags: payload.tags,
        skills: payload.skills,
        education: payload.education,
        certifications: payload.certifications,
        projects: [],
        workExperience: [],
        communicationIndicators: [],
        sensitiveInfoWarnings: [],
        embedding: undefined,
      },
    });

    await createAuditLog({
      organizationId: user.organizationId,
      actorId: user.userId,
      action: "CANDIDATE_CREATED",
      entityType: "Candidate",
      entityId: candidate.id,
      newValue: candidate,
    });

    return NextResponse.json({ candidate: mapCandidate(candidate) }, { status: 201 });
  } catch (error) {
    console.error("Create candidate error", error);
    return NextResponse.json({ error: "Failed to create candidate." }, { status: 500 });
  }
}
