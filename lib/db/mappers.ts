import { ApplicationEvaluation, Candidate, JobRequisition, OrganizationSetting } from "@prisma/client";

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item)).filter(Boolean);
}

function parseObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function mapJob(job: JobRequisition) {
  return {
    ...job,
    requiredSkills: parseStringArray(job.requiredSkills),
    preferredSkills: parseStringArray(job.preferredSkills),
    responsibilities: parseStringArray(job.responsibilities),
    qualifications: parseStringArray(job.qualifications),
    certifications: parseStringArray(job.certifications),
    scoringConfig: (job.scoringConfig ?? null) as Record<string, unknown> | null,
    knockoutCriteria: parseObject(job.knockoutCriteria),
    jdParsedJson: parseObject(job.jdParsedJson),
  };
}

export function mapCandidate(candidate: Candidate) {
  return {
    ...candidate,
    tags: parseStringArray(candidate.tags),
    skills: parseStringArray(candidate.skills),
    education: parseStringArray(candidate.education),
    certifications: parseStringArray(candidate.certifications),
    projects: (candidate.projects as Array<Record<string, unknown>>) ?? [],
    workExperience: (candidate.workExperience as Array<Record<string, unknown>>) ?? [],
    communicationIndicators: parseStringArray(candidate.communicationIndicators),
    sensitiveInfoWarnings: parseStringArray(candidate.sensitiveInfoWarnings),
    linkedInJson: candidate.linkedInJson ?? null,
    embedding: candidate.embedding ?? null,
  };
}

export function mapApplication(application: ApplicationEvaluation) {
  return {
    ...application,
    explanationJson: (application.explanationJson ?? {}) as Record<string, unknown>,
    evidenceJson: (application.evidenceJson ?? {}) as Record<string, unknown>,
    riskFlagsJson: (application.riskFlagsJson ?? {}) as Record<string, unknown>,
  };
}

export function mapOrgSetting(setting: OrganizationSetting | null) {
  if (!setting) return null;
  return {
    ...setting,
    defaultWeights: (setting.defaultWeights ?? {}) as Record<string, number>,
    knockoutCriteria: (setting.knockoutCriteria ?? {}) as Record<string, unknown>,
    reportBranding: (setting.reportBranding ?? {}) as Record<string, unknown>,
  };
}
