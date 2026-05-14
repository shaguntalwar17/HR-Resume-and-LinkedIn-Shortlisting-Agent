"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { ReportDownloadCard } from "@/components/reports/report-download-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { EvaluationRun } from "@/lib/types";

export default function ReportsPage() {
  const [runs, setRuns] = useState<EvaluationRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/runs");
        const data = (await response.json()) as { runs: EvaluationRun[] };
        setRuns(data.runs ?? []);
        if (data.runs?.length) {
          setSelectedRunId(data.runs[0].id);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const selectedRun = runs.find((run) => run.id === selectedRunId) ?? null;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-sky-100 bg-white/90 p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Reports Center</h1>
        <p className="mt-1 text-sm text-slate-600">
          Download JSON, HTML, and PDF reports for every evaluation run with override audit history.
        </p>
      </section>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading runs...
        </div>
      ) : runs.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No reports yet</CardTitle>
            <CardDescription>Run an evaluation first to generate downloadable reports.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/workspace">
              <Button>Go to Workspace</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Choose Evaluation Run</CardTitle>
              <CardDescription>Select a run to review details and export artifacts.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedRunId} onChange={(event) => setSelectedRunId(event.target.value)}>
                {runs.map((run) => (
                  <option key={run.id} value={run.id}>
                    {run.jd.roleTitle} - {new Date(run.updatedAt).toLocaleString()}
                  </option>
                ))}
              </Select>

              {selectedRun ? (
                <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h2 className="text-lg font-semibold text-slate-900">{selectedRun.jd.roleTitle}</h2>
                  <p className="text-sm text-slate-600">
                    Domain: {selectedRun.jd.domainIndustry} | Candidates: {selectedRun.candidates.length}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedRun.evaluations.slice(0, 5).map((evaluation) => (
                      <Badge key={evaluation.candidateId}>{evaluation.candidateName}</Badge>
                    ))}
                  </div>
                  <p className="text-sm text-slate-600">
                    Overrides logged: <span className="font-semibold">{selectedRun.overrideHistory.length}</span>
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {selectedRun ? <ReportDownloadCard runId={selectedRun.id} /> : null}
        </div>
      )}
    </div>
  );
}
