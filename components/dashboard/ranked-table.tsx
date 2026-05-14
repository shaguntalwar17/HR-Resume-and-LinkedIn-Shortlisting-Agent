"use client";

import { Eye } from "lucide-react";

import { CandidateEvaluation } from "@/lib/types";

import { RecommendationBadge } from "@/components/dashboard/recommendation-badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface RankedTableProps {
  evaluations: CandidateEvaluation[];
  onOpenDetails: (candidateId: string) => void;
}

export function RankedTable({ evaluations, onOpenDetails }: RankedTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Rank</TableHead>
          <TableHead>Candidate</TableHead>
          <TableHead>Score</TableHead>
          <TableHead>Recommendation</TableHead>
          <TableHead>Skills Match</TableHead>
          <TableHead>Experience Match</TableHead>
          <TableHead>Key Strengths</TableHead>
          <TableHead>Key Gaps</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {evaluations.map((evaluation, index) => (
          <TableRow key={evaluation.candidateId}>
            <TableCell className="font-semibold text-slate-900">#{index + 1}</TableCell>
            <TableCell>
              <div className="font-medium text-slate-900">{evaluation.candidateName}</div>
              <p className="text-xs text-slate-500">{evaluation.confidence} confidence</p>
            </TableCell>
            <TableCell>
              <div className="font-bold text-slate-900">{evaluation.totalScore}</div>
              <p className="text-xs text-slate-500">/100</p>
            </TableCell>
            <TableCell>
              <RecommendationBadge recommendation={evaluation.recommendation} />
            </TableCell>
            <TableCell>{evaluation.skillsMatchPercentage}%</TableCell>
            <TableCell>{evaluation.dimensionScores.experienceRelevance.rawScore}/10</TableCell>
            <TableCell className="max-w-[220px] text-xs">
              {evaluation.keyStrengths.slice(0, 2).join(" • ")}
            </TableCell>
            <TableCell className="max-w-[220px] text-xs">{evaluation.keyGaps.slice(0, 2).join(" • ")}</TableCell>
            <TableCell>
              <Button size="sm" variant="secondary" onClick={() => onOpenDetails(evaluation.candidateId)}>
                <Eye className="h-4 w-4" />
                Details
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
