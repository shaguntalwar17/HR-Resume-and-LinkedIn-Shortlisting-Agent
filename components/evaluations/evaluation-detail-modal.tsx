"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
type EvaluationRecord = {
  id: string;
  overallScore: number;
  recommendation: string;
  status: string;
  confidenceScore: number;
  explanationJson?: {
    summary?: string;
    matchedSkills?: string[];
    missingSkills?: string[];
    recommendationReason?: Record<string, string>;
  };
  scoreBreakdowns?: Array<{
    id: string;
    dimension: string;
    weight: number;
    rawScore: number;
    weightedScore: number;
    justification: string;
    evidenceJson?: string[] | null;
  }>;
  evidenceJson?: Record<string, string | string[]>;
  riskFlagsJson?: { flags?: string[] };
  candidate: {
    fullName: string;
    currentTitle?: string | null;
    experienceYears: number;
  };
  job: {
    title: string;
  };
  reviews: Array<{
    id: string;
    decision: string;
    notes?: string | null;
    overrideReason?: string | null;
    createdAt: string;
    reviewer?: { name?: string | null };
  }>;
  assignedHiringManagerId?: string | null;
  assignedHiringManager?: { id: string; name?: string | null } | null;
};

interface EvaluationDetailModalProps {
  open: boolean;
  onClose: () => void;
  evaluation: EvaluationRecord | null;
  onChanged: () => Promise<void>;
}

export function EvaluationDetailModal({ open, onClose, evaluation, onChanged }: EvaluationDetailModalProps) {
  const [status, setStatus] = useState(evaluation?.status ?? "REVIEWED");
  const [recommendation, setRecommendation] = useState(evaluation?.recommendation ?? "SHORTLIST");
  const [reviewDecision, setReviewDecision] = useState("COMMENT");
  const [note, setNote] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [manualScore, setManualScore] = useState("");
  const [busy, setBusy] = useState(false);
  const [hiringManagers, setHiringManagers] = useState<Array<{ id: string; name: string }>>([]);
  const [assignedHiringManagerId, setAssignedHiringManagerId] = useState(
    evaluation?.assignedHiringManagerId ?? ""
  );

  useEffect(() => {
    if (!open) return;

    void (async () => {
      const response = await fetch("/api/users");
      if (!response.ok) return;
      const data = (await response.json()) as {
        users?: Array<{ id: string; name: string; role: string }>;
      };
      const managers = (data.users ?? [])
        .filter((user) => user.role === "HIRING_MANAGER")
        .map((user) => ({ id: user.id, name: user.name }));
      setHiringManagers(managers);
    })();
  }, [open]);

  if (!evaluation) return null;

  async function updateStatus() {
    if (!evaluation) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/evaluations/${evaluation.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          recommendation,
          notes: note || undefined,
          assignHiringManagerId: assignedHiringManagerId || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Status update failed.");
      toast.success("Application status updated.");
      setNote("");
      await onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Status update failed.");
    } finally {
      setBusy(false);
    }
  }

  async function createReview() {
    if (!evaluation) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/evaluations/${evaluation.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: reviewDecision,
          notes: note || undefined,
          overrideReason: overrideReason || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Review save failed.");
      toast.success("Recruiter/Hiring manager review saved.");
      setNote("");
      setOverrideReason("");
      await onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Review failed.");
    } finally {
      setBusy(false);
    }
  }

  async function overrideEvaluation() {
    if (!evaluation) return;
    if (!overrideReason.trim()) {
      toast.error("Override reason is required.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(`/api/evaluations/${evaluation.id}/override`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          overallScore: manualScore ? Number.parseFloat(manualScore) : undefined,
          recommendation,
          overrideReason: overrideReason.trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Override failed.");
      toast.success("Manual override recorded.");
      setOverrideReason("");
      setManualScore("");
      await onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Override failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Application Review - ${evaluation.candidate.fullName}`}>
      <div className="space-y-4">
        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Evaluation Explanation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <strong>Job:</strong> {evaluation.job.title}
              </p>
              <p>
                <strong>Candidate:</strong> {evaluation.candidate.fullName} ({evaluation.candidate.currentTitle ?? "N/A"})
              </p>
              <p>{evaluation.explanationJson?.summary ?? "No summary available."}</p>
              <p>
                <strong>Matched Skills:</strong> {(evaluation.explanationJson?.matchedSkills ?? []).join(", ") || "N/A"}
              </p>
              <p>
                <strong>Missing Skills:</strong> {(evaluation.explanationJson?.missingSkills ?? []).join(", ") || "N/A"}
              </p>

              <div className="rounded-xl border border-slate-200/60 p-5 bg-white/80 shadow-sm backdrop-blur-sm">
                <p className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Mandatory Rubric Breakdown</p>
                <div className="space-y-5">
                  {(evaluation.scoreBreakdowns ?? []).map((row) => (
                    <div key={row.id} className="space-y-2">
                      <div className="flex justify-between items-center text-sm font-bold text-slate-800">
                        <span>{row.dimension} <span className="text-slate-400 font-medium text-xs ml-1">(weight {(row.weight * 100).toFixed(0)}%)</span></span>
                        <span>{row.rawScore.toFixed(1)} / 10</span>
                      </div>
                      <Progress value={row.rawScore * 10} max={100} indicatorClassName={row.rawScore >= 8 ? "bg-emerald-500" : row.rawScore >= 5 ? "bg-blue-500" : "bg-rose-500"} />
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{row.justification}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Evidence Snippets</p>
                {Object.entries(evaluation.evidenceJson ?? {}).map(([key, value]) => (
                  <p key={key} className="mt-1 text-sm text-slate-700">
                    <strong>{key}:</strong> {Array.isArray(value) ? value.join(" | ") : value}
                  </p>
                ))}
              </div>

              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Risk Flags</p>
                {(evaluation.riskFlagsJson?.flags ?? []).length ? (
                  (evaluation.riskFlagsJson?.flags ?? []).map((flag) => (
                    <p key={flag} className="mt-1 text-sm text-slate-700">
                      {flag}
                    </p>
                  ))
                ) : (
                  <p className="mt-1 text-sm text-slate-500">No critical risk flags detected.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Score Snapshot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-3xl font-bold text-slate-900">{evaluation.overallScore}</p>
              <Badge variant="info">{evaluation.recommendation}</Badge>
              <Badge>{evaluation.status}</Badge>
              <p className="text-xs text-slate-500">Confidence: {evaluation.confidenceScore.toFixed(2)}/10</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Status Workflow</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Field label="Status">
                <Select value={status} onChange={(event) => setStatus(event.target.value)}>
                  <option value="NEW">NEW</option>
                  <option value="PARSED">PARSED</option>
                  <option value="EVALUATED">EVALUATED</option>
                  <option value="REVIEWED">REVIEWED</option>
                  <option value="SENT_TO_HIRING_MANAGER">SENT_TO_HIRING_MANAGER</option>
                  <option value="SHORTLISTED">SHORTLISTED</option>
                  <option value="REJECTED">REJECTED</option>
                  <option value="HOLD">HOLD</option>
                  <option value="HIRED">HIRED</option>
                </Select>
              </Field>
              <Field label="Assign Hiring Manager">
                <Select
                  value={assignedHiringManagerId}
                  onChange={(event) => setAssignedHiringManagerId(event.target.value)}
                >
                  <option value="">Unassigned</option>
                  {hiringManagers.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Recommendation">
                <Select value={recommendation} onChange={(event) => setRecommendation(event.target.value)}>
                  <option value="STRONG_SHORTLIST">STRONG_SHORTLIST</option>
                  <option value="SHORTLIST">SHORTLIST</option>
                  <option value="HOLD">HOLD</option>
                  <option value="REJECT">REJECT</option>
                </Select>
              </Field>
              <Field label="Note">
                <Textarea value={note} onChange={(event) => setNote(event.target.value)} />
              </Field>
              <Button onClick={updateStatus} disabled={busy}>
                Update Status
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Manual Override</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Field label="Override Score (0-100)">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={manualScore}
                  onChange={(event) => setManualScore(event.target.value)}
                />
              </Field>
              <Field label="Override Reason">
                <Textarea value={overrideReason} onChange={(event) => setOverrideReason(event.target.value)} />
              </Field>
              <Button variant="warning" onClick={overrideEvaluation} disabled={busy}>
                Apply Override
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Hiring Review</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Field label="Decision">
                <Select value={reviewDecision} onChange={(event) => setReviewDecision(event.target.value)}>
                  <option value="SHORTLIST">SHORTLIST</option>
                  <option value="REJECT">REJECT</option>
                  <option value="HOLD">HOLD</option>
                  <option value="APPROVE">APPROVE</option>
                  <option value="COMMENT">COMMENT</option>
                </Select>
              </Field>
              <Button variant="secondary" onClick={createReview} disabled={busy}>
                Save Review
              </Button>
              <div className="space-y-2">
                {evaluation.reviews.length ? (
                  evaluation.reviews.slice(0, 6).map((review) => (
                    <div key={review.id} className="rounded-lg border border-slate-200 p-2 text-xs">
                      <p className="font-semibold">
                        {review.decision} by {review.reviewer?.name ?? "Reviewer"}
                      </p>
                      <p>{review.notes ?? "No notes."}</p>
                      {review.overrideReason ? <p>Override: {review.overrideReason}</p> : null}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500">No reviews yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
