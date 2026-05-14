"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";

import {
  CandidateEvaluation,
  CandidateProfile,
  JobDescriptionParsed,
  OverrideEntry,
  Recommendation,
  RecruiterNote,
  ScoreDimensionKey,
} from "@/lib/types";

import { RecommendationBadge } from "@/components/dashboard/recommendation-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface CandidateDetailModalProps {
  open: boolean;
  onClose: () => void;
  runId: string;
  jd: JobDescriptionParsed;
  candidate: CandidateProfile | null;
  evaluation: CandidateEvaluation | null;
  overrideHistory: OverrideEntry[];
  recruiterNotes: RecruiterNote[];
  onApplyOverride: (payload: {
    candidateId: string;
    dimensionKey?: ScoreDimensionKey;
    newRawScore?: number;
    newRecommendation?: Recommendation;
    reason: string;
  }) => Promise<void>;
  onAddNote: (payload: { candidateId: string; note: string }) => Promise<void>;
}

const dimensionOptions: Array<{ key: ScoreDimensionKey; label: string }> = [
  { key: "skillsMatch", label: "Skills Match" },
  { key: "experienceRelevance", label: "Experience Relevance" },
  { key: "educationCerts", label: "Education & Certs" },
  { key: "projectPortfolio", label: "Project / Portfolio" },
  { key: "communicationQuality", label: "Communication Quality" },
];

export function CandidateDetailModal({
  open,
  onClose,
  runId,
  jd,
  candidate,
  evaluation,
  overrideHistory,
  recruiterNotes,
  onApplyOverride,
  onAddNote,
}: CandidateDetailModalProps) {
  const [dimensionKey, setDimensionKey] = useState<ScoreDimensionKey>("skillsMatch");
  const [newRawScore, setNewRawScore] = useState<string>("8");
  const [newRecommendation, setNewRecommendation] = useState<Recommendation | "">("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const localOverrides = useMemo(
    () => overrideHistory.filter((entry) => entry.candidateId === candidate?.id),
    [candidate?.id, overrideHistory]
  );
  const localNotes = useMemo(
    () => recruiterNotes.filter((entry) => entry.candidateId === candidate?.id),
    [candidate?.id, recruiterNotes]
  );

  if (!candidate || !evaluation) return null;

  async function submitOverride() {
    if (!candidate || !reason.trim()) return;
    setBusy(true);
    try {
      await onApplyOverride({
        candidateId: candidate.id,
        dimensionKey,
        newRawScore: Number.parseFloat(newRawScore),
        newRecommendation: newRecommendation || undefined,
        reason: reason.trim(),
      });
      setReason("");
    } finally {
      setBusy(false);
    }
  }

  async function submitNote() {
    if (!candidate || !note.trim()) return;
    setBusy(true);
    try {
      await onAddNote({ candidateId: candidate.id, note: note.trim() });
      setNote("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Candidate Detail — ${candidate.name}`}>
      <div className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Profile Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>{candidate.resumeTextSummary}</p>
              <div className="grid gap-2 md:grid-cols-2">
                <Meta label="Current Role" value={candidate.currentRole} />
                <Meta label="Experience" value={`${candidate.totalExperienceYears} years`} />
                <Meta label="Domain" value={candidate.domainIndustry} />
                <Meta label="Contact" value={candidate.email ?? candidate.contact ?? "N/A"} />
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Skills</p>
                <div className="flex flex-wrap gap-2">
                  {candidate.skills.map((skill) => (
                    <Badge key={skill}>{skill}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recommendation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-3xl font-bold text-slate-900">{evaluation.totalScore}</div>
              <RecommendationBadge recommendation={evaluation.recommendation} />
              <p className="text-xs text-slate-500">{evaluation.confidence} confidence</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Explainable AI Panel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.values(evaluation.dimensionScores).map((dimension) => (
              <div key={dimension.key} className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-900">
                    {dimension.label}: {dimension.rawScore}/10
                  </p>
                  <p className="text-xs text-slate-500">Weighted: {dimension.weightedContribution}</p>
                </div>
                <p className="mt-1 text-sm text-slate-700">{dimension.justification}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Evidence: {dimension.evidenceSnippets.join(" | ")}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Skill Gap Heatmap</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2">
                {jd.requiredSkills.map((skill) => {
                  const matched = evaluation.matchedSkills.includes(skill);
                  return (
                    <div
                      key={skill}
                      className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2"
                    >
                      <span className="text-sm text-slate-700">{skill}</span>
                      <Badge variant={matched ? "success" : "danger"}>
                        {matched ? "Matched" : "Missing"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Risk / Concern Flags</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {(evaluation.riskFlags.length ? evaluation.riskFlags : ["No major risk flags detected."]).map(
                  (flag) => (
                    <li key={flag} className="rounded-lg border border-slate-200 px-3 py-2 text-slate-700">
                      {flag}
                    </li>
                  )
                )}
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Human Override Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-slate-500">
                Run ID: <span className="font-medium text-slate-700">{runId}</span>
              </p>
              <div className="grid gap-2">
                <Label>Dimension to Adjust</Label>
                <Select
                  value={dimensionKey}
                  onChange={(event) => setDimensionKey(event.target.value as ScoreDimensionKey)}
                >
                  {dimensionOptions.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>New Dimension Score (0-10)</Label>
                <Input
                  type="number"
                  min={0}
                  max={10}
                  step={0.1}
                  value={newRawScore}
                  onChange={(event) => setNewRawScore(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Override Final Recommendation (optional)</Label>
                <Select value={newRecommendation} onChange={(event) => setNewRecommendation(event.target.value as Recommendation)}>
                  <option value="">Keep score-based recommendation</option>
                  <option value="Strong Shortlist">Strong Shortlist</option>
                  <option value="Shortlist">Shortlist</option>
                  <option value="Review Manually">Review Manually</option>
                  <option value="Not Recommended">Not Recommended</option>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Override Reason</Label>
                <Textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Example: Candidate has unpublished portfolio evidence shared in live screening."
                />
              </div>
              <Button onClick={submitOverride} disabled={busy || !reason.trim()}>
                Apply Override
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recruiter Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Add recruiter observation..."
              />
              <Button variant="secondary" onClick={submitNote} disabled={busy || !note.trim()}>
                Save Note
              </Button>
              <div className="space-y-2">
                {localNotes.length ? (
                  localNotes.map((entry) => (
                    <div key={entry.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                      <p className="text-slate-700">{entry.note}</p>
                      <p className="mt-1 text-xs text-slate-500">{format(new Date(entry.timestamp), "PPpp")}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No recruiter notes yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Override History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {localOverrides.length ? (
              localOverrides.map((entry) => (
                <div key={entry.id} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <p className="font-medium text-slate-800">
                    {entry.oldRecommendation} → {entry.newRecommendation} ({entry.oldTotalScore} → {entry.newTotalScore})
                  </p>
                  <p className="text-slate-700">{entry.reason}</p>
                  <p className="text-xs text-slate-500">{format(new Date(entry.timestamp), "PPpp")}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No overrides applied for this candidate.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </Modal>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 px-3 py-2">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}
