import { CandidateSource, Prisma } from "@prisma/client";

import { CandidateProfile } from "@/lib/types";

export function mapParsedCandidateToDb(
  candidate: CandidateProfile,
  organizationId: string,
  resumeUrl?: string
) {
  return {
    organizationId,
    fullName: candidate.name,
    email: candidate.email ?? null,
    phone: candidate.contact ?? null,
    location: null,
    currentTitle: candidate.currentRole,
    currentCompany: candidate.workExperience[0]?.company ?? null,
    experienceYears: candidate.totalExperienceYears,
    source: mapCandidateSource(candidate.sourceType),
    resumeUrl: resumeUrl ?? null,
    parsedResumeText: candidate.rawText,
    linkedInJson:
      candidate.sourceType === "linkedin"
        ? toJsonValue({ sourceName: candidate.sourceName })
        : undefined,
    tags: toJsonValue([]),
    skills: toJsonValue(candidate.skills),
    education: toJsonValue(candidate.education),
    certifications: toJsonValue(candidate.certifications),
    projects: toJsonValue(candidate.projects),
    workExperience: toJsonValue(candidate.workExperience),
    communicationIndicators: toJsonValue(candidate.communicationQualityIndicators),
    sensitiveInfoWarnings: toJsonValue(candidate.sensitiveInfoWarnings),
    embedding: undefined,
  };
}

function mapCandidateSource(sourceType: CandidateProfile["sourceType"]): CandidateSource {
  if (sourceType === "linkedin") return "LINKEDIN_JSON";
  if (sourceType === "demo") return "DEMO";
  return "RESUME_UPLOAD";
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
