"use client";

import { useMemo, useState } from "react";

import { CandidateEvaluation } from "@/lib/types";

import { RecommendationBadge } from "@/components/dashboard/recommendation-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";

interface CandidateComparisonProps {
  evaluations: CandidateEvaluation[];
}

export function CandidateComparison({ evaluations }: CandidateComparisonProps) {
  const [firstId, setFirstId] = useState("");
  const [secondId, setSecondId] = useState("");
  const [thirdId, setThirdId] = useState("");

  const compared = useMemo(() => {
    return [firstId, secondId, thirdId]
      .filter(Boolean)
      .map((id) => evaluations.find((item) => item.candidateId === id))
      .filter(Boolean) as CandidateEvaluation[];
  }, [evaluations, firstId, secondId, thirdId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Candidate Comparison (2-3 Side by Side)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <Select value={firstId} onChange={(event) => setFirstId(event.target.value)}>
            <option value="">Select Candidate 1</option>
            {evaluations.map((evaluation) => (
              <option key={evaluation.candidateId} value={evaluation.candidateId}>
                {evaluation.candidateName}
              </option>
            ))}
          </Select>
          <Select value={secondId} onChange={(event) => setSecondId(event.target.value)}>
            <option value="">Select Candidate 2</option>
            {evaluations.map((evaluation) => (
              <option key={evaluation.candidateId} value={evaluation.candidateId}>
                {evaluation.candidateName}
              </option>
            ))}
          </Select>
          <Select value={thirdId} onChange={(event) => setThirdId(event.target.value)}>
            <option value="">Select Candidate 3 (optional)</option>
            {evaluations.map((evaluation) => (
              <option key={evaluation.candidateId} value={evaluation.candidateId}>
                {evaluation.candidateName}
              </option>
            ))}
          </Select>
        </div>

        {compared.length >= 2 ? (
          <div className="grid gap-4 lg:grid-cols-3">
            {compared.map((evaluation) => (
              <div key={evaluation.candidateId} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-900">{evaluation.candidateName}</p>
                  <Badge>{evaluation.totalScore}</Badge>
                </div>
                <div className="mt-2">
                  <RecommendationBadge recommendation={evaluation.recommendation} />
                </div>
                <ul className="mt-3 space-y-1 text-sm text-slate-700">
                  <li>Skills: {evaluation.dimensionScores.skillsMatch.rawScore}/10</li>
                  <li>Experience: {evaluation.dimensionScores.experienceRelevance.rawScore}/10</li>
                  <li>Education: {evaluation.dimensionScores.educationCerts.rawScore}/10</li>
                  <li>Projects: {evaluation.dimensionScores.projectPortfolio.rawScore}/10</li>
                  <li>Communication: {evaluation.dimensionScores.communicationQuality.rawScore}/10</li>
                </ul>
                <p className="mt-2 text-xs text-slate-500">
                  Missing: {evaluation.missingSkills.slice(0, 3).join(", ") || "None"}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">Select at least two candidates to compare.</p>
        )}
      </CardContent>
    </Card>
  );
}
