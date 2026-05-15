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

interface RubricWeights {
  skillsMatch: number;
  experienceRelevance: number;
  educationCerts: number;
  projectPortfolio: number;
  communicationQuality: number;
}

interface ScoringConfigInput {
  weights?: Record<string, number>;
  minimumScoreThreshold?: number;
  knockoutCriteria?: {
    minimumMandatorySkillMatchPercentage?: number;
    minimumExperienceYears?: number;
    rejectOnMissingMandatorySkillsCount?: number;
  };
}

interface ScoreBreakdownEntry {
  dimension: string;
  weight: number;
  rawScore: number;
  weightedScore: number;
  justification: string;
  evidence: string[];
}

const DEFAULT_RUBRIC_WEIGHTS: RubricWeights = {
  skillsMatch: 0.3,
  experienceRelevance: 0.25,
  educationCerts: 0.15,
  projectPortfolio: 0.2,
  communicationQuality: 0.1,
};

function normalizeRubricWeights(input?: Record<string, number>): RubricWeights {
  const mapped: RubricWeights = {
    skillsMatch:
      input?.skillsMatch ??
      ((input?.mandatorySkills ?? DEFAULT_RUBRIC_WEIGHTS.skillsMatch) +
        (input?.preferredSkills ?? 0)),
    experienceRelevance:
      input?.experienceRelevance ??
      ((input?.experience ?? DEFAULT_RUBRIC_WEIGHTS.experienceRelevance) +
        (input?.domain ?? 0)),
    educationCerts: input?.educationCerts ?? input?.education ?? DEFAULT_RUBRIC_WEIGHTS.educationCerts,
    projectPortfolio:
      input?.projectPortfolio ?? input?.projects ?? DEFAULT_RUBRIC_WEIGHTS.projectPortfolio,
    communicationQuality:
      input?.communicationQuality ??
      input?.communication ??
      DEFAULT_RUBRIC_WEIGHTS.communicationQuality,
  };

  const total = Object.values(mapped).reduce((sum, value) => sum + value, 0);
  if (total <= 0) return DEFAULT_RUBRIC_WEIGHTS;

  return {
    skillsMatch: mapped.skillsMatch / total,
    experienceRelevance: mapped.experienceRelevance / total,
    educationCerts: mapped.educationCerts / total,
    projectPortfolio: mapped.projectPortfolio / total,
    communicationQuality: mapped.communicationQuality / total,
  };
}

function recommendationFromScore(score: number, threshold = 70): ApplicationRecommendation {
  if (score >= 85) return "STRONG_SHORTLIST";
  if (score >= threshold) return "SHORTLIST";
  if (score >= 55) return "HOLD";
  return "REJECT";
}

function statusFromRecommendation(recommendation: ApplicationRecommendation): ApplicationStatus {
  if (recommendation === "STRONG_SHORTLIST" || recommendation === "SHORTLIST") return "SHORTLISTED";
  if (recommendation === "REJECT") return "REJECTED";
  return "HOLD";
}

function toWeightedScore(rawScore: number, weight: number) {
  return Number((rawScore * weight * 10).toFixed(2));
}

export async function evaluateApplicationFit(input: {
  job: JobRequisition & {
    requiredSkills: unknown;
    preferredSkills: unknown;
    scoringConfig: unknown;
    knockoutCriteria: unknown;
  };
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
  const requiredSkills = normalizeSkills(
    (Array.isArray(input.job.requiredSkills) ? input.job.requiredSkills : []) as string[]
  );
  const preferredSkills = normalizeSkills(
    (Array.isArray(input.job.preferredSkills) ? input.job.preferredSkills : []) as string[]
  );
  const candidateSkills = normalizeSkills(
    (Array.isArray(input.candidate.skills) ? input.candidate.skills : []) as string[]
  );

  const skillMatch = computeSkillMatch(requiredSkills, candidateSkills);
  const preferredMatch = computeSkillMatch(preferredSkills, candidateSkills);

  const mandatorySkillsScore = clamp(skillMatch.matchPercentage / 10, 0, 10);
  const preferredSkillsScore = clamp(preferredMatch.matchPercentage / 10, 0, 10);

  const minimumYears = input.job.minExperience ?? 0;
  const candidateYears = input.candidate.experienceYears ?? 0;
  const baseExperienceScore = clamp(minimumYears ? (candidateYears / minimumYears) * 7.5 : 8, 0, 10);
  const seniorityBonus = input.job.maxExperience && candidateYears > input.job.maxExperience ? -0.6 : 0.4;
  const normalizedExperienceScore = clamp(baseExperienceScore + seniorityBonus, 0, 10);

  const domainHint = `${input.job.department ?? ""} ${input.job.title}`.toLowerCase();
  const candidateText = `${input.candidate.currentTitle ?? ""} ${input.candidate.currentCompany ?? ""} ${input.candidate.parsedResumeText}`.toLowerCase();
  const domainScore = clamp(domainHint && candidateText.includes(domainHint.split(" ")[0] ?? "") ? 8.6 : 6.1, 0, 10);

  const educationArray = Array.isArray(input.candidate.education)
    ? (input.candidate.education as string[])
    : [];
  const certificationsArray = Array.isArray(input.candidate.certifications)
    ? (input.candidate.certifications as string[])
    : [];
  const educationScore = clamp(
    5.5 + Math.min(2.5, educationArray.length * 0.6) + Math.min(2, certificationsArray.length * 0.4),
    0,
    10
  );

  const projectsArray = Array.isArray(input.candidate.projects)
    ? (input.candidate.projects as Array<Record<string, unknown>>)
    : [];
  const projectText = projectsArray
    .map((project) => `${project.name ?? ""} ${project.description ?? ""}`)
    .join(" ");
  const projectRelevanceMatch = requiredSkills.filter((skill) =>
    projectText.toLowerCase().includes(skill)
  ).length;
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

  const skillsMatchScore = clamp(mandatorySkillsScore * 0.75 + preferredSkillsScore * 0.25, 0, 10);
  const experienceRelevanceScore = clamp(
    normalizedExperienceScore * 0.65 + domainScore * 0.35,
    0,
    10
  );
  const educationCertsScore = educationScore;
  const projectPortfolioScore = projectScore;
  const communicationQualityScore = communicationScore;

  const rawConfig = (input.job.scoringConfig ?? {}) as ScoringConfigInput;
  const rubricWeights = normalizeRubricWeights(rawConfig.weights);

  const scoreBreakdown: ScoreBreakdownEntry[] = [
    {
      dimension: "Skills Match",
      weight: rubricWeights.skillsMatch,
      rawScore: Number(skillsMatchScore.toFixed(2)),
      weightedScore: toWeightedScore(skillsMatchScore, rubricWeights.skillsMatch),
      justification:
        skillMatch.matchPercentage >= 85
          ? "Excellent mandatory skill coverage with strong role-fit technologies."
          : skillMatch.matchPercentage >= 50
            ? "Partial mandatory skill coverage with visible gaps to address."
            : "Insufficient mandatory skill coverage for this requisition baseline.",
      evidence: [
        extractEvidenceSnippet(input.candidate.parsedResumeText, skillMatch.matchedSkills),
      ].filter(Boolean),
    },
    {
      dimension: "Experience Relevance",
      weight: rubricWeights.experienceRelevance,
      rawScore: Number(experienceRelevanceScore.toFixed(2)),
      weightedScore: toWeightedScore(experienceRelevanceScore, rubricWeights.experienceRelevance),
      justification:
        candidateYears >= minimumYears && domainScore >= 8
          ? "Experience and domain context strongly align with seniority expectations."
          : candidateYears >= Math.max(1, minimumYears * 0.75)
            ? "Experience is adjacent to target role but may need ramp-up in domain depth."
            : "Experience relevance is below expected level for this role.",
      evidence: [
        extractEvidenceSnippet(input.candidate.parsedResumeText, [
          input.candidate.currentTitle ?? "experience",
          input.job.title,
        ]),
      ].filter(Boolean),
    },
    {
      dimension: "Education & Certifications",
      weight: rubricWeights.educationCerts,
      rawScore: Number(educationCertsScore.toFixed(2)),
      weightedScore: toWeightedScore(educationCertsScore, rubricWeights.educationCerts),
      justification:
        educationCertsScore >= 8.5
          ? "Education baseline is met and strengthened by relevant certifications."
          : educationCertsScore >= 6
            ? "Education requirements are broadly met with moderate certification depth."
            : "Education/certification signal is below role expectations.",
      evidence: [
        extractEvidenceSnippet(input.candidate.parsedResumeText, [
          "bachelor",
          "master",
          "certification",
          ...certificationsArray,
        ]),
      ].filter(Boolean),
    },
    {
      dimension: "Project / Portfolio",
      weight: rubricWeights.projectPortfolio,
      rawScore: Number(projectPortfolioScore.toFixed(2)),
      weightedScore: toWeightedScore(projectPortfolioScore, rubricWeights.projectPortfolio),
      justification:
        projectPortfolioScore >= 8.5
          ? "Portfolio demonstrates strong, role-relevant execution evidence."
          : projectPortfolioScore >= 6
            ? "Project evidence is present but relevance/depth is mixed."
            : "Limited project evidence tied to the job requirements.",
      evidence: [
        extractEvidenceSnippet(input.candidate.parsedResumeText, [
          "project",
          "portfolio",
          "github",
          ...requiredSkills.slice(0, 4),
        ]),
      ].filter(Boolean),
    },
    {
      dimension: "Communication Quality",
      weight: rubricWeights.communicationQuality,
      rawScore: Number(communicationQualityScore.toFixed(2)),
      weightedScore: toWeightedScore(communicationQualityScore, rubricWeights.communicationQuality),
      justification:
        communicationQualityScore >= 8.5
          ? "Resume communication is crisp, structured, and outcome-oriented."
          : communicationQualityScore >= 6
            ? "Communication quality is adequate with room to improve clarity."
            : "Communication quality appears weak or inconsistently structured.",
      evidence: [
        extractEvidenceSnippet(input.candidate.parsedResumeText, [
          "led",
          "improved",
          "launched",
          "%",
        ]),
      ].filter(Boolean),
    },
  ];

  const overallScore = Number(
    scoreBreakdown.reduce((sum, entry) => sum + entry.weightedScore, 0).toFixed(2)
  );

  const effectiveThreshold = rawConfig.minimumScoreThreshold ?? input.orgSetting?.minimumScoreThreshold ?? 70;
  const jobKnockoutCriteria =
    (input.job.knockoutCriteria as
      | {
          minimumMandatorySkillMatchPercentage?: number;
          minimumExperienceYears?: number;
          rejectOnMissingMandatorySkillsCount?: number;
        }
      | null) ?? {};

  const effectiveKnockout = {
    ...(input.orgSetting?.knockoutCriteria ?? {}),
    ...(rawConfig.knockoutCriteria ?? {}),
    ...jobKnockoutCriteria,
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
  if (effectiveKnockout.minimumExperienceYears && candidateYears < effectiveKnockout.minimumExperienceYears) {
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
      skillsMatchScore * 0.3 +
      experienceRelevanceScore * 0.2 +
      communicationQualityScore * 0.1 +
      semanticScore * 0.2 -
      riskFlags.length * 0.35,
    0,
    10
  );

  const strengths = [
    skillMatch.matchedSkills.length
      ? `Matched skills: ${skillMatch.matchedSkills.slice(0, 5).join(", ")}`
      : "No core skill strengths detected",
    candidateYears >= minimumYears
      ? `Experience meets baseline (${candidateYears} years)`
      : `Experience below baseline (${candidateYears} years vs ${minimumYears} required)`,
    projectPortfolioScore >= 7
      ? "Project portfolio shows relevant implementation depth"
      : "Project portfolio signal is moderate",
  ];

  const gaps = [
    skillMatch.missingSkills.length
      ? `Missing skills: ${skillMatch.missingSkills.slice(0, 5).join(", ")}`
      : "No major mandatory skill gaps",
    educationCertsScore < 6.5
      ? "Education/certification alignment needs manual validation"
      : "Education baseline appears aligned",
  ];

  const explanation = {
    summary:
      recommendation === "REJECT"
        ? "Candidate does not currently satisfy key requirements for this requisition."
        : recommendation === "STRONG_SHORTLIST"
          ? "Candidate strongly aligns with the role requirements and should proceed quickly."
          : "Candidate has partial fit and merits recruiter review.",
    rubricWeights,
    matchedSkills: skillMatch.matchedSkills,
    missingSkills: skillMatch.missingSkills,
    preferredMatchedSkills: preferredMatch.matchedSkills,
    recommendationReason: {
      skillsMatch: `${skillMatch.matchPercentage}% mandatory skill alignment`,
      experienceRelevance: `${candidateYears} years vs minimum ${minimumYears}`,
      educationCerts: `${educationArray.length} education signals and ${certificationsArray.length} certifications`,
      projectPortfolio: `${projectsArray.length} projects with ${projectRelevanceMatch} directly relevant`,
      communicationQuality: `${communicationIndicators.length} communication quality indicators detected`,
    },
    strengths,
    gaps,
    scoreBreakdown,
  };

  const evidence = {
    mandatorySkillEvidence: extractEvidenceSnippet(input.candidate.parsedResumeText, skillMatch.matchedSkills),
    projectEvidence: extractEvidenceSnippet(input.candidate.parsedResumeText, ["project", "portfolio", "github"]),
    impactEvidence: extractEvidenceSnippet(input.candidate.parsedResumeText, ["%", "improved", "reduced", "launched"]),
    scoreBreakdownEvidence: scoreBreakdown.map((entry) => ({ dimension: entry.dimension, evidence: entry.evidence })),
  };

  return {
    overallScore,
    skillsScore: Number(skillsMatchScore.toFixed(2)),
    experienceScore: Number(experienceRelevanceScore.toFixed(2)),
    educationScore: Number(educationCertsScore.toFixed(2)),
    domainScore: Number(domainScore.toFixed(2)),
    communicationScore: Number(communicationQualityScore.toFixed(2)),
    cultureFitScore: null,
    mandatorySkillsScore: Number(mandatorySkillsScore.toFixed(2)),
    preferredSkillsScore: Number(preferredSkillsScore.toFixed(2)),
    projectScore: Number(projectPortfolioScore.toFixed(2)),
    semanticScore: Number(semanticScore.toFixed(2)),
    confidenceScore: Number(confidenceScore.toFixed(2)),
    scoringVersion: input.scoringVersion ?? "v2.2.0",
    recommendation,
    explanationJson: toInputJson(explanation),
    evidenceJson: toInputJson(evidence),
    riskFlagsJson: toInputJson({ flags: riskFlags }),
    status: statusFromRecommendation(recommendation),
    scoreBreakdown,
  };
}

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
