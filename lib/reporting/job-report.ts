import { format } from "date-fns";

import {
  ApplicationEvaluation,
  Candidate,
  JobRequisition,
  RecruiterReview,
  ScoreBreakdown,
  User,
} from "@prisma/client";

function esc(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

type ApplicationWithRelations = ApplicationEvaluation & {
  candidate: Candidate;
  scoreBreakdowns: ScoreBreakdown[];
  reviews: Array<RecruiterReview & { reviewer: User }>;
};

export function buildJobReportPayload(input: {
  organizationName: string;
  job: JobRequisition;
  applications: ApplicationWithRelations[];
}) {
  const ranked = [...input.applications].sort((a, b) => b.overallScore - a.overallScore);
  const shortlistedCount = ranked.filter((item) =>
    ["SHORTLISTED", "HIRED"].includes(item.status)
  ).length;

  return {
    organization: input.organizationName,
    generatedAt: new Date().toISOString(),
    job: {
      id: input.job.id,
      title: input.job.title,
      department: input.job.department,
      location: input.job.location,
      seniority: input.job.seniority,
      employmentType: input.job.employmentType,
      salaryMin: input.job.salaryMin,
      salaryMax: input.job.salaryMax,
      minExperience: input.job.minExperience,
      status: input.job.status,
      requiredSkills: input.job.requiredSkills,
      preferredSkills: input.job.preferredSkills,
      responsibilities: input.job.responsibilities,
      qualifications: input.job.qualifications,
      certifications: input.job.certifications,
      knockoutCriteria: input.job.knockoutCriteria,
    },
    executiveSummary: {
      totalEvaluated: ranked.length,
      shortlistedCount,
      averageScore: ranked.length
        ? Number(
            (
              ranked.reduce((acc, item) => acc + item.overallScore, 0) /
              ranked.length
            ).toFixed(2)
          )
        : 0,
    },
    methodology: {
      scoringVersion: ranked[0]?.scoringVersion ?? "v2.1.0",
      note: "AI-assisted scoring with deterministic fallback. Human review is mandatory before final hiring decisions.",
    },
    candidates: ranked.map((application, index) => ({
      rank: index + 1,
      applicationId: application.id,
      candidateId: application.candidateId,
      name: application.candidate.fullName,
      currentTitle: application.candidate.currentTitle,
      experienceYears: application.candidate.experienceYears,
      overallScore: application.overallScore,
      recommendation: application.recommendation,
      status: application.status,
      strengths: (application.explanationJson as Record<string, unknown>)?.matchedSkills ?? [],
      gaps: (application.explanationJson as Record<string, unknown>)?.missingSkills ?? [],
      explanation: application.explanationJson,
      evidence: application.evidenceJson,
      riskFlags: application.riskFlagsJson,
      scoreBreakdown: application.scoreBreakdowns.map((row) => ({
        dimension: row.dimension,
        weight: row.weight,
        rawScore: row.rawScore,
        weightedScore: row.weightedScore,
        justification: row.justification,
        evidence: row.evidenceJson,
      })),
      reviews: application.reviews.map((review) => ({
        reviewer: review.reviewer.name,
        decision: review.decision,
        notes: review.notes,
        overrideReason: review.overrideReason,
        createdAt: review.createdAt,
      })),
    })),
    responsibleAiDisclaimer:
      "This platform assists recruiters with transparent recommendations. It does not replace human judgement. Sensitive attributes are ignored during scoring.",
  };
}

export function buildJobReportHtml(input: ReturnType<typeof buildJobReportPayload>) {
  const rows = input.candidates
    .map(
      (candidate) => `
      <tr>
        <td>${candidate.rank}</td>
        <td>${esc(candidate.name)}</td>
        <td>${candidate.overallScore}</td>
        <td>${esc(candidate.recommendation)}</td>
        <td>${esc(candidate.status)}</td>
        <td>${esc((candidate.strengths as string[]).slice(0, 4).join(", "))}</td>
        <td>${esc((candidate.gaps as string[]).slice(0, 4).join(", "))}</td>
      </tr>
    `
    )
    .join("");

  const details = input.candidates
    .map(
      (candidate) => {
        const dimensionRows = (candidate.scoreBreakdown as Array<{
          dimension: string;
          rawScore: number;
          weight: number;
          weightedScore: number;
          justification: string;
        }>)
          .map(
            (row) =>
              `<li><strong>${esc(row.dimension)}:</strong> ${row.rawScore.toFixed(2)}/10 | weight ${(row.weight * 100).toFixed(0)}% | weighted ${row.weightedScore.toFixed(2)} - ${esc(row.justification)}</li>`
          )
          .join("");

        return `
      <section>
        <h3>${esc(candidate.name)} (${candidate.overallScore}/100)</h3>
        <p><strong>Recommendation:</strong> ${esc(candidate.recommendation)} | <strong>Status:</strong> ${esc(candidate.status)}</p>
        <p><strong>Current Role:</strong> ${esc(candidate.currentTitle ?? "N/A")} | <strong>Experience:</strong> ${candidate.experienceYears} years</p>
        <p><strong>Strengths:</strong> ${esc((candidate.strengths as string[]).join(", ") || "N/A")}</p>
        <p><strong>Gaps:</strong> ${esc((candidate.gaps as string[]).join(", ") || "N/A")}</p>
        <p><strong>Dimension Breakdown:</strong></p>
        <ul>${dimensionRows || "<li>No score breakdown recorded.</li>"}</ul>
      </section>
      `
      }
    )
    .join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>HireWise AI Job Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; color: #0f172a; line-height: 1.4; }
    table { border-collapse: collapse; width: 100%; margin-top: 12px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px; font-size: 13px; vertical-align: top; }
    th { background: #f1f5f9; }
    section { border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; margin-top: 14px; }
    .disclaimer { background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 10px; margin-top: 16px; }
  </style>
</head>
<body>
  <h1>${esc(input.organization)} - Hiring Intelligence Report</h1>
  <p>Generated: ${esc(format(new Date(input.generatedAt), "PPpp"))}</p>
  <p><strong>Job:</strong> ${esc(input.job.title)} | <strong>Department:</strong> ${esc(input.job.department ?? "N/A")} | <strong>Location:</strong> ${esc(input.job.location ?? "N/A")}</p>
  <p><strong>Total Evaluated:</strong> ${input.executiveSummary.totalEvaluated} | <strong>Shortlisted:</strong> ${input.executiveSummary.shortlistedCount} | <strong>Average Score:</strong> ${input.executiveSummary.averageScore}</p>
  <h2>Ranked Candidate Table</h2>
  <table>
    <thead>
      <tr>
        <th>Rank</th>
        <th>Candidate</th>
        <th>Score</th>
        <th>Recommendation</th>
        <th>Status</th>
        <th>Strengths</th>
        <th>Gaps</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <h2>Candidate Details</h2>
  ${details}
  <section>
    <h2>Methodology</h2>
    <p>${esc(input.methodology.note)}</p>
    <p>Scoring version: ${esc(input.methodology.scoringVersion)}</p>
  </section>
  <p class="disclaimer">${esc(input.responsibleAiDisclaimer)}</p>
</body>
</html>`;
}
