import { Prisma, UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { createAuditLog } from "@/lib/audit/logger";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { mapCandidate } from "@/lib/db/mappers";
import { mapParsedCandidateToDb } from "@/lib/parsers/candidate-db-mapper";
import {
  parseCandidateFromLinkedInJson,
  parseCandidateFromResumeText,
} from "@/lib/parsers/candidate-parser";
import { extractTextFromUpload } from "@/lib/parsers/file-parser";
import { ParsedLinkedInInput } from "@/lib/types";
import { saveResumeFile, validateResumeFile } from "@/lib/utils/upload";

export const runtime = "nodejs";

function parseLinkedInJson(raw: string): ParsedLinkedInInput[] {
  if (!raw.trim()) return [];
  const parsed = JSON.parse(raw) as ParsedLinkedInInput | ParsedLinkedInInput[];
  return Array.isArray(parsed) ? parsed : [parsed];
}

export async function POST(request: NextRequest) {
  const { user, errorResponse } = await requireRole(request, [UserRole.ADMIN, UserRole.RECRUITER]);
  if (!user || errorResponse) return errorResponse;

  try {
    const formData = await request.formData();
    const files = formData.getAll("resumeFiles");
    const linkedInJsonRaw = `${formData.get("linkedInJson") ?? ""}`;

    const createdCandidates = [];
    const failedFiles: Array<{ fileName: string; reason: string }> = [];

    for (const value of files) {
      if (!(value instanceof File)) continue;
      if (value.size <= 0) continue;
      try {
        validateResumeFile(value);
        const text = await extractTextFromUpload(value);
        const parsed = parseCandidateFromResumeText(text, value.name, "resume");
        const resumeUrl = await saveResumeFile(value);

        const created = await prisma.candidate.create({
          data: mapParsedCandidateToDb(parsed, user.organizationId, resumeUrl),
        });
        await prisma.resumeDocument.create({
          data: {
            candidateId: created.id,
            fileName: value.name,
            mimeType: value.type || "application/octet-stream",
            sizeBytes: value.size,
            storageUrl: resumeUrl,
            parsedText: text,
          },
        });
        createdCandidates.push(mapCandidate(created));
      } catch (error) {
        failedFiles.push({
          fileName: value.name,
          reason: error instanceof Error ? error.message : "Unknown parse/upload failure",
        });
      }
    }

    try {
      const linkedInProfiles = parseLinkedInJson(linkedInJsonRaw);
      for (const [index, profile] of linkedInProfiles.entries()) {
        const parsed = parseCandidateFromLinkedInJson(profile, `linkedin-profile-${index + 1}.json`);
        const created = await prisma.candidate.create({
          data: {
            ...mapParsedCandidateToDb(parsed, user.organizationId),
            linkedInJson: profile as Prisma.InputJsonValue,
          },
        });
        await prisma.linkedInProfileData.create({
          data: {
            candidateId: created.id,
            payloadJson: profile as Prisma.InputJsonValue,
            source: "manual_json",
          },
        });
        createdCandidates.push(mapCandidate(created));
      }
    } catch (error) {
      failedFiles.push({
        fileName: "LinkedIn JSON",
        reason: error instanceof Error ? error.message : "Invalid LinkedIn JSON.",
      });
    }

    await createAuditLog({
      organizationId: user.organizationId,
      actorId: user.userId,
      action: "CANDIDATE_BULK_UPLOAD",
      entityType: "Candidate",
      entityId: user.organizationId,
      newValue: {
        createdCount: createdCandidates.length,
        failedFiles,
      },
    });

    return NextResponse.json({
      createdCandidates,
      failedFiles,
    });
  } catch (error) {
    console.error("Candidate upload error", error);
    return NextResponse.json({ error: "Failed to upload candidates." }, { status: 500 });
  }
}
