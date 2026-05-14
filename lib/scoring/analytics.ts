import { CandidateProfile, EvaluationRun, Recommendation } from "@/lib/types";

export interface DashboardAnalytics {
  totalCandidates: number;
  averageScore: number;
  topCandidateName: string;
  topCandidateScore: number;
  recommendationBreakdown: Array<{ name: Recommendation; value: number }>;
  scoreDistribution: Array<{ range: string; count: number }>;
  mostCommonMissingSkills: Array<{ skill: string; count: number }>;
  skillGapDistribution: Array<{ candidate: string; missingCount: number; matchedCount: number }>;
  candidateComparison: Array<{
    candidate: string;
    skillsMatch: number;
    experienceRelevance: number;
    educationCerts: number;
    projectPortfolio: number;
    communicationQuality: number;
  }>;
}

export function buildDashboardAnalytics(
  run: Pick<EvaluationRun, "evaluations" | "candidates">
): DashboardAnalytics {
  const { evaluations } = run;
  const totalCandidates = evaluations.length;
  const averageScore =
    totalCandidates === 0
      ? 0
      : Number((evaluations.reduce((acc, item) => acc + item.totalScore, 0) / totalCandidates).toFixed(2));

  const topCandidate = evaluations[0];
  const recommendationOrder: Recommendation[] = [
    "Strong Shortlist",
    "Shortlist",
    "Review Manually",
    "Not Recommended",
  ];

  const recommendationBreakdown = recommendationOrder.map((name) => ({
    name,
    value: evaluations.filter((item) => item.recommendation === name).length,
  }));

  const buckets: Array<{ label: string; min: number; max: number }> = [
    { label: "0-39", min: 0, max: 39.99 },
    { label: "40-54", min: 40, max: 54.99 },
    { label: "55-69", min: 55, max: 69.99 },
    { label: "70-84", min: 70, max: 84.99 },
    { label: "85-100", min: 85, max: 100 },
  ];

  const scoreDistribution = buckets.map((bucket) => ({
    range: bucket.label,
    count: evaluations.filter(
      (item) => item.totalScore >= bucket.min && item.totalScore <= bucket.max
    ).length,
  }));

  const missingSkillCounts = new Map<string, number>();
  evaluations.forEach((evaluation) => {
    evaluation.missingSkills.forEach((skill) => {
      missingSkillCounts.set(skill, (missingSkillCounts.get(skill) ?? 0) + 1);
    });
  });

  const mostCommonMissingSkills = Array.from(missingSkillCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([skill, count]) => ({ skill, count }));

  const skillGapDistribution = evaluations.map((evaluation) => ({
    candidate: evaluation.candidateName,
    missingCount: evaluation.missingSkills.length,
    matchedCount: evaluation.matchedSkills.length,
  }));

  const candidateComparison = evaluations.slice(0, 6).map((evaluation) => ({
    candidate: evaluation.candidateName,
    skillsMatch: evaluation.dimensionScores.skillsMatch.rawScore,
    experienceRelevance: evaluation.dimensionScores.experienceRelevance.rawScore,
    educationCerts: evaluation.dimensionScores.educationCerts.rawScore,
    projectPortfolio: evaluation.dimensionScores.projectPortfolio.rawScore,
    communicationQuality: evaluation.dimensionScores.communicationQuality.rawScore,
  }));

  return {
    totalCandidates,
    averageScore,
    topCandidateName: topCandidate?.candidateName ?? "N/A",
    topCandidateScore: topCandidate?.totalScore ?? 0,
    recommendationBreakdown,
    scoreDistribution,
    mostCommonMissingSkills,
    skillGapDistribution,
    candidateComparison,
  };
}

export function mapCandidatesById(candidates: CandidateProfile[]) {
  return new Map(candidates.map((candidate) => [candidate.id, candidate]));
}
