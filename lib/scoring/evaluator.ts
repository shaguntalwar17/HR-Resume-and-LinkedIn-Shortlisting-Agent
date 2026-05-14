import {
  CandidateEvaluation,
  CandidateProfile,
  ConfidenceLevel,
  DEFAULT_WEIGHTS,
  DIMENSION_LABELS,
  DimensionScore,
  JobDescriptionParsed,
  Recommendation,
  RECOMMENDATION_THRESHOLDS,
  ScoreDimensionKey,
} from "@/lib/types";
import { computeSkillMatch, normalizeSkills } from "@/lib/utils/skill-normalizer";
import { clamp, extractEvidenceSnippet } from "@/lib/utils/text";

function toWeightedContribution(rawScore: number, weight: number): number {
  return Number((rawScore * weight * 10).toFixed(2));
}

function recommendationFromScore(score: number): Recommendation {
  if (score >= RECOMMENDATION_THRESHOLDS.strongShortlist) return "Strong Shortlist";
  if (score >= RECOMMENDATION_THRESHOLDS.shortlist) return "Shortlist";
  if (score >= RECOMMENDATION_THRESHOLDS.reviewManually) return "Review Manually";
  return "Not Recommended";
}

function scoreSkillsDimension(
  jd: JobDescriptionParsed,
  candidate: CandidateProfile
): {
  rawScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  matchPercentage: number;
  justification: string;
  evidenceSnippets: string[];
} {
  const { matchedSkills, missingSkills, matchPercentage } = computeSkillMatch(
    jd.requiredSkills,
    candidate.skills
  );

  let rawScore = 2;
  if (matchPercentage >= 85) rawScore = 9.4;
  else if (matchPercentage >= 70) rawScore = 7.8;
  else if (matchPercentage >= 50) rawScore = 6.2;
  else if (matchPercentage >= 30) rawScore = 4.3;

  const preferred = normalizeSkills(jd.preferredSkills);
  const preferredOverlap = preferred.filter((skill) =>
    normalizeSkills(candidate.skills).includes(skill)
  ).length;
  rawScore = clamp(rawScore + Math.min(0.8, preferredOverlap * 0.2), 0, 10);

  return {
    rawScore: Number(rawScore.toFixed(2)),
    matchedSkills,
    missingSkills,
    matchPercentage,
    justification:
      matchPercentage >= 85
        ? "Excellent alignment with the required skill stack."
        : matchPercentage >= 50
          ? "Partial skill alignment with notable gaps."
          : "Low match with critical required skills.",
    evidenceSnippets: [
      extractEvidenceSnippet(candidate.rawText, matchedSkills.length ? matchedSkills : candidate.skills),
    ],
  };
}

function isAdjacentDomain(jdDomain: string, candidateDomain: string): boolean {
  const normalizedJd = jdDomain.toLowerCase();
  const normalizedCandidate = candidateDomain.toLowerCase();

  if (normalizedJd === normalizedCandidate) return true;
  if (
    (normalizedJd.includes("ai") || normalizedJd.includes("saas")) &&
    normalizedCandidate.includes("technology")
  ) {
    return true;
  }

  const adjacencyMap: Record<string, string[]> = {
    "hr tech": ["ai / saas", "general technology"],
    fintech: ["ai / saas", "general technology"],
    ecommerce: ["ai / saas", "general technology"],
    "health tech": ["ai / saas", "general technology"],
    "ai / saas": ["general technology", "fintech", "hr tech"],
  };

  return (adjacencyMap[normalizedJd] ?? []).includes(normalizedCandidate);
}

function scoreExperienceDimension(jd: JobDescriptionParsed, candidate: CandidateProfile) {
  const minYears = Math.max(0, jd.minimumExperienceYears);
  const years = candidate.totalExperienceYears;
  const yearRatio = minYears === 0 ? 1 : clamp(years / minYears, 0, 1.4);

  let domainScore = 2;
  if (candidate.domainIndustry.toLowerCase() === jd.domainIndustry.toLowerCase()) {
    domainScore = 5;
  } else if (isAdjacentDomain(jd.domainIndustry, candidate.domainIndustry)) {
    domainScore = 3.8;
  } else {
    domainScore = 2.2;
  }

  const yearScore = clamp(yearRatio * 4.2, 0.5, 5);
  const rawScore = clamp(domainScore + yearScore, 0, 10);

  const justification =
    rawScore >= 8.5
      ? "Experience strongly aligns with required domain and seniority."
      : rawScore >= 5.5
        ? "Experience is partially relevant but not a perfect fit."
        : "Experience relevance is limited for this role.";

  return {
    rawScore: Number(rawScore.toFixed(2)),
    justification,
    evidenceSnippets: [
      extractEvidenceSnippet(candidate.rawText, [candidate.currentRole, candidate.domainIndustry]),
    ],
  };
}

function scoreEducationDimension(jd: JobDescriptionParsed, candidate: CandidateProfile) {
  const candidateEducationText = candidate.education.join(" ").toLowerCase();
  const jdEducation = jd.educationRequirements.join(" ").toLowerCase();

  let base = 4;
  if (!jdEducation || jdEducation.length < 2) {
    base = 6;
  } else if (
    (jdEducation.includes("bachelor") && /(bachelor|b\.tech|bsc|be)/.test(candidateEducationText)) ||
    (jdEducation.includes("master") && /(master|mba|msc|m\.tech)/.test(candidateEducationText)) ||
    (jdEducation.includes("phd") && /phd/.test(candidateEducationText))
  ) {
    base = 7;
  }

  const jdCerts = normalizeSkills(jd.certifications);
  const candidateCerts = normalizeSkills(candidate.certifications);
  const relevantCertCount = jdCerts.filter((cert) => candidateCerts.includes(cert)).length;
  const bonus = Math.min(3, candidate.certifications.length * 0.4 + relevantCertCount * 0.6);
  const rawScore = clamp(base + bonus, 0, 10);

  const justification =
    rawScore >= 8.5
      ? "Education baseline is met with additional relevant certifications."
      : rawScore >= 6
        ? "Education requirements are largely met."
        : "Education/certification evidence is below the role baseline.";

  return {
    rawScore: Number(rawScore.toFixed(2)),
    justification,
    evidenceSnippets: [
      extractEvidenceSnippet(candidate.rawText, [
        "bachelor",
        "master",
        "certified",
        ...candidate.certifications,
      ]),
    ],
  };
}

function scoreProjectDimension(jd: JobDescriptionParsed, candidate: CandidateProfile) {
  const requiredSkills = normalizeSkills(jd.requiredSkills);
  const relevantProjects = candidate.projects.filter((project) => {
    const projectSkills = normalizeSkills([
      ...project.technologies,
      ...project.description.split(/[,;| ]/g),
    ]);
    return requiredSkills.some((skill) => projectSkills.includes(skill));
  });

  const projectCountScore = Math.min(5, candidate.projects.length * 1.8);
  const relevanceScore = Math.min(4.5, relevantProjects.length * 1.8);
  const portfolioBonus = candidate.projects.some((project) => project.link) ? 0.7 : 0;
  const rawScore = clamp(projectCountScore + relevanceScore + portfolioBonus, 0, 10);

  const justification =
    rawScore >= 8.5
      ? "Strong, role-relevant project portfolio with clear evidence."
      : rawScore >= 6
        ? "Project exposure is adequate but depth is moderate."
        : "Limited project/portfolio evidence for role fit.";

  return {
    rawScore: Number(rawScore.toFixed(2)),
    justification,
    evidenceSnippets: [
      extractEvidenceSnippet(candidate.rawText, ["project", "github", "portfolio", ...requiredSkills]),
    ],
  };
}

function scoreCommunicationDimension(candidate: CandidateProfile) {
  const text = candidate.rawText;
  const lines = text.split(/\r?\n/).filter(Boolean);
  const bulletRatio = lines.length === 0 ? 0 : lines.filter((line) => /^[-*•]/.test(line)).length / lines.length;
  const hasQuantified = /\d+%|\d+\+|\d+x/.test(text);
  const longLinePenalty = lines.some((line) => line.length > 220) ? 0.8 : 0;
  const indicatorBoost = Math.min(2.5, candidate.communicationQualityIndicators.length * 0.9);
  let rawScore = 4.8 + bulletRatio * 4 + (hasQuantified ? 1 : 0) + indicatorBoost - longLinePenalty;
  rawScore = clamp(rawScore, 0, 10);

  const justification =
    rawScore >= 8.5
      ? "Resume communication is crisp, structured, and impact-driven."
      : rawScore >= 6
        ? "Communication quality is adequate with room for clarity improvements."
        : "Communication structure appears weak or inconsistent.";

  return {
    rawScore: Number(rawScore.toFixed(2)),
    justification,
    evidenceSnippets: [extractEvidenceSnippet(text, ["led", "improved", "launched", "project"])],
  };
}

function buildDimensionScore(
  key: ScoreDimensionKey,
  weight: number,
  rawScore: number,
  justification: string,
  evidenceSnippets: string[]
): DimensionScore {
  return {
    key,
    label: DIMENSION_LABELS[key],
    rawScore: Number(clamp(rawScore, 0, 10).toFixed(2)),
    weightedContribution: toWeightedContribution(rawScore, weight),
    weight,
    justification,
    evidenceSnippets,
  };
}

function deriveConfidence(
  missingSkills: string[],
  matchedSkills: string[],
  candidate: CandidateProfile
): ConfidenceLevel {
  const signalScore =
    matchedSkills.length * 2 +
    candidate.projects.length +
    candidate.workExperience.length +
    candidate.certifications.length;
  const riskScore = missingSkills.length + candidate.sensitiveInfoWarnings.length;

  if (signalScore >= 12 && riskScore <= 3) return "High";
  if (signalScore >= 7 && riskScore <= 6) return "Medium";
  return "Low";
}

export function evaluateCandidate(
  jd: JobDescriptionParsed,
  candidate: CandidateProfile,
  weights: Record<ScoreDimensionKey, number> = DEFAULT_WEIGHTS
): CandidateEvaluation {
  const skills = scoreSkillsDimension(jd, candidate);
  const experience = scoreExperienceDimension(jd, candidate);
  const education = scoreEducationDimension(jd, candidate);
  const project = scoreProjectDimension(jd, candidate);
  const communication = scoreCommunicationDimension(candidate);

  const dimensionScores = {
    skillsMatch: buildDimensionScore(
      "skillsMatch",
      weights.skillsMatch,
      skills.rawScore,
      skills.justification,
      skills.evidenceSnippets
    ),
    experienceRelevance: buildDimensionScore(
      "experienceRelevance",
      weights.experienceRelevance,
      experience.rawScore,
      experience.justification,
      experience.evidenceSnippets
    ),
    educationCerts: buildDimensionScore(
      "educationCerts",
      weights.educationCerts,
      education.rawScore,
      education.justification,
      education.evidenceSnippets
    ),
    projectPortfolio: buildDimensionScore(
      "projectPortfolio",
      weights.projectPortfolio,
      project.rawScore,
      project.justification,
      project.evidenceSnippets
    ),
    communicationQuality: buildDimensionScore(
      "communicationQuality",
      weights.communicationQuality,
      communication.rawScore,
      communication.justification,
      communication.evidenceSnippets
    ),
  };

  const totalScore = Number(
    (
      (dimensionScores.skillsMatch.rawScore * weights.skillsMatch +
        dimensionScores.experienceRelevance.rawScore * weights.experienceRelevance +
        dimensionScores.educationCerts.rawScore * weights.educationCerts +
        dimensionScores.projectPortfolio.rawScore * weights.projectPortfolio +
        dimensionScores.communicationQuality.rawScore * weights.communicationQuality) *
      10
    ).toFixed(2)
  );

  const recommendation = recommendationFromScore(totalScore);
  const riskFlags: string[] = [];

  if (skills.missingSkills.length >= 3) {
    riskFlags.push(`Missing critical skills: ${skills.missingSkills.slice(0, 4).join(", ")}`);
  }

  if (candidate.totalExperienceYears < jd.minimumExperienceYears) {
    riskFlags.push("Experience is below minimum requirement.");
  }

  if (candidate.sensitiveInfoWarnings.length) {
    riskFlags.push("Sensitive personal attributes detected and ignored in scoring.");
  }

  const keyStrengths = [
    skills.matchedSkills.length
      ? `Matched skills: ${skills.matchedSkills.slice(0, 4).join(", ")}`
      : "No strong required skill overlap",
    `Domain: ${candidate.domainIndustry}`,
    candidate.projects.length ? `${candidate.projects.length} project references found` : "Limited project evidence",
  ];

  const keyGaps = [
    skills.missingSkills.length
      ? `Missing skills: ${skills.missingSkills.slice(0, 4).join(", ")}`
      : "No major skill gaps",
    candidate.totalExperienceYears < jd.minimumExperienceYears
      ? `Experience shortfall: ${jd.minimumExperienceYears - candidate.totalExperienceYears} years`
      : "Experience meets baseline",
  ];

  const confidence = deriveConfidence(skills.missingSkills, skills.matchedSkills, candidate);

  return {
    candidateId: candidate.id,
    candidateName: candidate.name,
    totalScore,
    recommendation,
    confidence,
    riskFlags,
    keyStrengths,
    keyGaps,
    skillsMatchPercentage: skills.matchPercentage,
    matchedSkills: skills.matchedSkills,
    missingSkills: skills.missingSkills,
    dimensionScores,
    recruiterSummary: `${candidate.name} is ${recommendation.toLowerCase()} with a ${totalScore}/100 fit score.`,
    evaluatedAt: new Date().toISOString(),
  };
}

export function rankCandidates(
  jd: JobDescriptionParsed,
  candidates: CandidateProfile[],
  weights: Record<ScoreDimensionKey, number> = DEFAULT_WEIGHTS
): CandidateEvaluation[] {
  return candidates
    .map((candidate) => evaluateCandidate(jd, candidate, weights))
    .sort((a, b) => b.totalScore - a.totalScore);
}

export function recalculateWithOverrides(
  evaluation: CandidateEvaluation,
  weights: Record<ScoreDimensionKey, number> = DEFAULT_WEIGHTS
) {
  const totalScore = Number(
    (
      (evaluation.dimensionScores.skillsMatch.rawScore * weights.skillsMatch +
        evaluation.dimensionScores.experienceRelevance.rawScore * weights.experienceRelevance +
        evaluation.dimensionScores.educationCerts.rawScore * weights.educationCerts +
        evaluation.dimensionScores.projectPortfolio.rawScore * weights.projectPortfolio +
        evaluation.dimensionScores.communicationQuality.rawScore * weights.communicationQuality) *
      10
    ).toFixed(2)
  );

  return {
    ...evaluation,
    totalScore,
    recommendation: recommendationFromScore(totalScore),
    confidence: totalScore >= 80 ? "High" : totalScore >= 60 ? "Medium" : "Low",
  } satisfies CandidateEvaluation;
}
