import { format } from "date-fns";

import { DIMENSION_LABELS, EvaluationRun } from "@/lib/types";

function esc(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function buildReportFileName(prefix: string): string {
  return `${prefix}-${format(new Date(), "yyyyMMdd-HHmmss")}`;
}

export function buildEvaluationMethodologyText(): string {
  return `Candidates are scored across five weighted dimensions: Skills Match (30%), Experience Relevance (25%), Education & Certs (15%), Project / Portfolio (20%), and Communication Quality (10%). Scores are calculated transparently from evidence in resume/LinkedIn content. Sensitive attributes (gender, age, religion, nationality, marital status) are ignored during scoring. Human recruiters remain the final decision-makers and can override AI recommendations with audit logging.`;
}

export function buildReportHtml(run: EvaluationRun): string {
  const generatedOn = new Date();
  const rows = run.evaluations
    .map(
      (evaluation, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${esc(evaluation.candidateName)}</td>
        <td>${evaluation.totalScore}</td>
        <td>${esc(evaluation.recommendation)}</td>
        <td>${evaluation.skillsMatchPercentage}%</td>
        <td>${esc(evaluation.keyStrengths.join("; "))}</td>
        <td>${esc(evaluation.keyGaps.join("; "))}</td>
      </tr>
    `
    )
    .join("");

  const candidateBreakdowns = run.evaluations
    .map((evaluation) => {
      const dimensions = Object.keys(evaluation.dimensionScores)
        .map((key) => {
          const score = evaluation.dimensionScores[key as keyof typeof evaluation.dimensionScores];
          return `<li><strong>${esc(DIMENSION_LABELS[score.key])}:</strong> ${score.rawScore}/10 (Weighted ${score.weightedContribution}) - ${esc(score.justification)}</li>`;
        })
        .join("");

      return `
      <section style="margin-bottom: 24px;">
        <h3>${esc(evaluation.candidateName)} (${evaluation.totalScore}/100)</h3>
        <p><strong>Recommendation:</strong> ${esc(evaluation.recommendation)} | <strong>Confidence:</strong> ${esc(evaluation.confidence)}</p>
        <p><strong>Recruiter Summary:</strong> ${esc(evaluation.recruiterSummary)}</p>
        <ul>${dimensions}</ul>
        <p><strong>Risk Flags:</strong> ${esc(evaluation.riskFlags.join("; ") || "None")}</p>
      </section>
    `;
    })
    .join("");

  const overrides = run.overrideHistory.length
    ? run.overrideHistory
        .map(
          (entry) =>
            `<li>${esc(format(new Date(entry.timestamp), "PPpp"))} - ${esc(entry.candidateId)}: ${esc(entry.oldRecommendation)} -> ${esc(entry.newRecommendation)} (${esc(entry.reason)})</li>`
        )
        .join("")
    : "<li>No overrides logged.</li>";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>HireWise AI Report</title>
  <style>
    body { font-family: Arial, sans-serif; color: #0f172a; margin: 24px; line-height: 1.45; }
    h1,h2,h3 { margin-bottom: 8px; }
    .muted { color: #475569; }
    table { border-collapse: collapse; width: 100%; margin-top: 12px; }
    th,td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-size: 13px; vertical-align: top; }
    th { background: #f1f5f9; }
    section { border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin-top: 16px; }
    .banner { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 12px; }
  </style>
</head>
<body>
  <h1>HireWise AI — Resume & LinkedIn Shortlisting Report</h1>
  <p class="muted">Generated on ${esc(format(generatedOn, "PPpp"))}</p>

  <section>
    <h2>Job Description Summary</h2>
    <p><strong>Role:</strong> ${esc(run.jd.roleTitle)}</p>
    <p><strong>Domain:</strong> ${esc(run.jd.domainIndustry)} | <strong>Minimum Experience:</strong> ${run.jd.minimumExperienceYears} years</p>
    <p><strong>Required Skills:</strong> ${esc(run.jd.requiredSkills.join(", ") || "Not specified")}</p>
    <p><strong>Preferred Skills:</strong> ${esc(run.jd.preferredSkills.join(", ") || "Not specified")}</p>
  </section>

  <section>
    <h2>Evaluation Methodology</h2>
    <p>${esc(buildEvaluationMethodologyText())}</p>
  </section>

  <section>
    <h2>Ranked Candidate Table</h2>
    <table>
      <thead>
        <tr>
          <th>Rank</th>
          <th>Candidate</th>
          <th>Score</th>
          <th>Recommendation</th>
          <th>Skills Match</th>
          <th>Key Strengths</th>
          <th>Key Gaps</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </section>

  <section>
    <h2>Candidate-wise Breakdown</h2>
    ${candidateBreakdowns}
  </section>

  <section>
    <h2>Human Override Logs</h2>
    <ul>${overrides}</ul>
  </section>

  <section class="banner">
    <h2>Responsible AI Disclaimer</h2>
    <p>
      This tool supports recruiter decision-making with transparent, auditable recommendations.
      It does not make final hiring decisions. Sensitive attributes are ignored in scoring.
      Human judgment and legal/compliance review remain mandatory.
    </p>
  </section>
</body>
</html>`;
}
