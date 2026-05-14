import {
  ApplicationRecommendation,
  ApplicationStatus,
  Candidate,
  JobRequisition,
  Prisma,
} from "@prisma/client";

import { calculateSemanticMatchScore } from "@/lib/ai/semantic";
import { computeSkillMatch, normalizeSkills } from "@/lib/utils/skill-normalizer";
import { clamp, extractEvidenceSnippet } from "@/lib/utils/text";

interface ScoringWeights {
  mandatorySkills: number;
  preferredSkills: number;
  experience: number;
  domain: number;
  education: number;
  projects: number;
  communication: number;
  semantic: number;
}

interface ScoringConfigInput {
  weights?: Partial<ScoringWeights>;
  minimumScoreThreshold?: number;
  knockoutCriteria?: {
    minimumMandatorySkillMatchPercentage?: number;
    minimumExperienceYears?: number;
    rejectOnMissingMandatorySkillsCount?: number;
  };
}

const DEFAULT_PLATFORM_WEIGHTS: ScoringWeights = {
  mandatorySkills: 0.25,
  preferredSkills: 0.1,
  experience: 0.2,
  domain: 0.1,
  education: 0.1,
  projects: 0.1,
  communication: 0.08,
  semantic: 0.07,
};

function normalizeWeightConfig(input?: Partial<ScoringWeights>): ScoringWeights {
  const merged = { ...DEFAULT_PLATFORM_WEIGHTS, ...(input ?? {}) };
  const total = Object.values(merged).reduce((acc, value) => acc + value, 0);
  if (total <= 0) return DEFAULT_PLATFORM_WEIGHTS;

  return {
    mandatorySkills: merged.mandatorySkills / total,
    preferredSkills: merged.preferredSkills / total,
    experience: merged.experience / total,
    domain: merged.domain / total,
    education: merged.education / total,
    projects: merged.projects / total,
    communication: merged.communication / total,
    semantic: merged.semantic / total,
  };
}

function recommendationFromScore(score: number, threshold = 70): ApplicationRecommendation {
  if (score >= 85) return "STRONG_SHORTLIST";
  if (score >= threshold) return "SHORTLIST";
  if (score >= 50) return "HOLD";
  return "REJECT";
}

function statusFromRecommendation(recommendation: ApplicationRecommendation): ApplicationStatus {
  if (recommendation === "STRONG_SHORTLIST" || recommendation === "SHORTLIST") return "SHORTLISTED";
  if (recommendation === "REJECT") return "REJECTED";
  return "HOLD";
}

export async function evaluateApplicationFit(input: {
  job: JobRequisition & { requiredSkills: unknown; preferredSkills: unknown; scoringConfig: unknown };
  candidate: Candidate & {
    skills: unknown;
    education: unknown;
    certifications: unknown;
    projects: unknown;
    communicationIndicators: unknown;
    sensitiveInfoWarnings: unknown;
  };
  scoringVersion?: string;
  orgSetting?: {
    minimumScoreThreshold?: number;
    knockoutCriteria?: {
      minimumMandatorySkillMatchPercentage?: number;
      minimumExperienceYears?: number;
      rejectOnMissingMandatorySkillsCount?: number;
    };
  };
}) {
  const requiredSkills = normalizeSkills((Array.isArray(input.job.requiredSkills) ? input.job.requiredSkills : []) as string[]);
  const preferredSkills = normalizeSkills((Array.isArray(input.job.preferredSkills) ? input.job.preferredSkills : []) as string[]);
  const candidateSkills = normalizeSkills((Array.isArray(input.candidate.skills) ? input.candidate.skills : []) as string[]);

  const skillMatch = computeSkillMatch(requiredSkills, candidateSkills);
  const preferredMatch = computeSkillMatch(preferredSkills, candidateSkills);

  const mandatorySkillsScore = clamp(skillMatch.matchPercentage / 10, 0, 10);
  const preferredSkillsScore = clamp(preferredMatch.matchPercentage / 10, 0, 10);

  const minimumYears = input.job.minExperience ?? 0;
  const candidateYears = input.candidate.experienceYears ?? 0;
  const experienceScore = clamp(minimumYears ? (candidateYears / minimumYears) * 7.5 : 8, 0, 10);
  const seniorityBonus = input.job.maxExperience && candidateYears > input.job.maxExperience ? -0.6 : 0.4;
  const normalizedExperienceScore = clamp(experienceScore + seniorityBonus, 0, 10);

  const domainHint = `${input.job.department ?? ""} ${input.job.title}`.toLowerCase();
  const candidateText = `${input.candidate.currentTitle ?? ""} ${input.candidate.currentCompany ?? ""} ${input.candidate.parsedResumeText}`.toLowerCase();
  const domainScore = clamp(domainHint && candidateText.includes(domainHint.split(" ")[0] ?? "") ? 8.6 : 6.1, 0, 10);

  const educationArray = Array.isArray(input.candidate.education) ? (input.candidate.education as string[]) : [];
  const certificationsArray = Array.isArray(input.candidate.certifications)
    ? (input.candidate.certifications as string[])
    : [];
  const educationScore = clamp(5.5 + Math.min(2.5, educationArray.length * 0.6) + Math.min(2, certificationsArray.length * 0.4), 0, 10);

  const projectsArray = Array.isArray(input.candidate.projects) ? (input.candidate.projects as Array<Record<string, unknown>>) : [];
  const projectText = projectsArray.map((project) => `${project.name ?? ""} ${project.description ?? ""}`).join(" ");
  const projectRelevanceMatch = requiredSkills.filter((skill) => projectText.toLowerCase().includes(skill)).length;
  const projectScore = clamp(4 + projectsArray.length * 1.2 + projectRelevanceMatch * 0.9, 0, 10);

  const communicationIndicators = Array.isArray(input.candidate.communicationIndicators)
    ? (input.candidate.communicationIndicators as string[])
    : [];
  const communicationScore = clamp(5 + communicationIndicators.length * 1.3, 0, 10);

  const semanticMatchScore = await calculateSemanticMatchScore(
    input.job.description,
    input.candidate.parsedResumeText,
    requiredSkills,
    candidateSkills
  );
  const semanticScore = clamp(semanticMatchScore / 10, 0, 10);

  const rawConfig = (input.job.scoringConfig ?? {}) as ScoringConfigInput;
  const weights = normalizeWeightConfig(rawConfig.weights);

  const overallScore = Number(
    (
      (mandatorySkillsScore * weights.mandatorySkills +
        preferredSkillsScore * weights.preferredSkills +
        normalizedExperienceScore * weights.experience +
        domainScore * weights.domain +
        educationScore * weights.education +
        projectScore * weights.projects +
        communicationScore * weights.communication +
        semanticScore * weights.semantic) *
      10
    ).toFixed(2)
  );

  const effectiveThreshold =
    rawConfig.minimumScoreThreshold ??
    input.orgSetting?.minimumScoreThreshold ??
    70;
  const effectiveKnockout = {
    ...(input.orgSetting?.knockoutCriteria ?? {}),
    ...(rawConfig.knockoutCriteria ?? {}),
  };

  const riskFlags: string[] = [];
  if (skillMatch.missingSkills.length >= 3) {
    riskFlags.push(`Missing critical mandatory skills: ${skillMatch.missingSkills.slice(0, 5).join(", ")}`);
  }
  if (candidateYears < minimumYears) {
    riskFlags.push(`Experience below minimum threshold (${minimumYears} years).`);
  }
  const sensitiveWarnings = Array.isArray(input.candidate.sensitiveInfoWarnings)
    ? (input.candidate.sensitiveInfoWarnings as string[])
    : [];
  if (sensitiveWarnings.length) {
    riskFlags.push("Sensitive personal attributes detected and ignored in scoring.");
  }

  let recommendation = recommendationFromScore(overallScore, effectiveThreshold);
  if (
    effectiveKnockout.minimumMandatorySkillMatchPercentage &&
    skillMatch.matchPercentage < effectiveKnockout.minimumMandatorySkillMatchPercentage
  ) {
    recommendation = "REJECT";
    riskFlags.push("Knockout criteria triggered: mandatory skills threshold unmet.");
  }
  if (
    effectiveKnockout.minimumExperienceYears &&
    candidateYears < effectiveKnockout.minimumExperienceYears
  ) {
    recommendation = "REJECT";
    riskFlags.push("Knockout criteria triggered: minimum experience requirement unmet.");
  }
  if (
    effectiveKnockout.rejectOnMissingMandatorySkillsCount &&
    skillMatch.missingSkills.length >= effectiveKnockout.rejectOnMissingMandatorySkillsCount
  ) {
    recommendation = "REJECT";
    riskFlags.push("Knockout criteria triggered: too many missing mandatory skills.");
  }

  const confidenceScore = clamp(
    4 +
      mandatorySkillsScore * 0.35 +
      normalizedExperienceScore * 0.2 +
      semanticScore * 0.25 -
      riskFlags.length * 0.4,
    0,
    10
  );

  const explanation = {
    summary:
      recommendation === "REJECT"
        ? "Candidate does not currently satisfy key requirements for this requisition."
        : recommendation === "STRONG_SHORTLIST"
          ? "Candidate strongly aligns with the role requirements and should proceed quickly."
          : "Candidate has partial fit and merits recruiter review.",
    weights,
    matchedSkills: skillMatch.matchedSkills,
    missingSkills: skillMatch.missingSkills,
    preferredMatchedSkills: preferredMatch.matchedSkills,
    recommendationReason: {
      mandatorySkills: `${skillMatch.matchPercentage}% mandatory skill alignment`,
      preferredSkills: `${preferredMatch.matchPercentage}% preferred skill alignment`,
      experience: `${candidateYears} years vs minimum ${minimumYears}`,
      semantic: `${semanticMatchScore}% semantic similarity`,
    },
  };

  const evidence = {
    mandatorySkillEvidence: extractEvidenceSnippet(
      input.candidate.parsedResumeText,
      skillMatch.matchedSkills
    ),
    projectEvidence: extractEvidenceSnippet(input.candidate.parsedResumeText, ["project", "portfolio", "github"]),
    impactEvidence: extractEvidenceSnippet(input.candidate.parsedResumeText, ["%", "improved", "reduced", "launched"]),
  };

  return {
    overallScore,
    skillsScore: Number(((mandatorySkillsScore + preferredSkillsScore) / 2).toFixed(2)),
    experienceScore: Number(normalizedExperienceScore.toFixed(2)),
    educationScore: Number(educationScore.toFixed(2)),
    domainScore: Number(domainScore.toFixed(2)),
    communicationScore: Number(communicationScore.toFixed(2)),
    cultureFitScore: null,
    mandatorySkillsScore: Number(mandatorySkillsScore.toFixed(2)),
    preferredSkillsScore: Number(preferredSkillsScore.toFixed(2)),
    projectScore: Number(projectScore.toFixed(2)),
    semanticScore: Number(semanticScore.toFixed(2)),
    confidenceScore: Number(confidenceScore.toFixed(2)),
    scoringVersion: input.scoringVersion ?? "v2.1.0",
    recommendation,
    explanationJson: toInputJson(explanation),
    evidenceJson: toInputJson(evidence),
    riskFlagsJson: toInputJson({
      flags: riskFlags,
    }),
    status: statusFromRecommendation(recommendation),
  };
}

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
