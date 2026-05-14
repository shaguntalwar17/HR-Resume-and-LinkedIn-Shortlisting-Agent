"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Application = {
  id: string;
  overallScore: number;
  recommendation: string;
  status: string;
  candidate: {
    fullName: string;
    currentTitle?: string | null;
    experienceYears: number;
  };
  job: {
    id: string;
    title: string;
  };
  reviews: Array<{
    id: string;
    decision: string;
    notes?: string | null;
    reviewer?: { name?: string | null };
  }>;
};

export default function ShortlistPage() {
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<Application[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/evaluations?status=SHORTLISTED");
        const data = await response.json();
        setApplications(data.applications ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    return applications.filter((application) =>
      application.candidate.fullName.toLowerCase().includes(search.toLowerCase())
    );
  }, [applications, search]);

  async function exportShortlistReport(jobId: string) {
    const response = await fetch("/api/reports/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, type: "PDF" }),
    });
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `shortlist-${jobId}.pdf`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
        Loading shortlist pipeline...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Shortlisted Candidates</CardTitle>
          <CardDescription>Final review queue for recruiter and hiring manager collaboration.</CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search shortlisted candidate"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {filtered.length ? (
          filtered.map((application) => (
            <Card key={application.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{application.candidate.fullName}</CardTitle>
                    <CardDescription>{application.job.title}</CardDescription>
                  </div>
                  <Badge variant="success">{application.overallScore}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>
                  {application.candidate.currentTitle ?? "Role not provided"} | {application.candidate.experienceYears} years
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="info">{application.recommendation}</Badge>
                  <Badge>{application.status}</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Hiring Manager Reviews</p>
                  {application.reviews.length ? (
                    application.reviews.map((review) => (
                      <p key={review.id} className="text-xs text-slate-600">
                        {review.decision} by {review.reviewer?.name ?? "Reviewer"}: {review.notes ?? "No notes"}
                      </p>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500">No review comments yet.</p>
                  )}
                </div>
                <Button size="sm" variant="secondary" onClick={() => exportShortlistReport(application.job.id)}>
                  Export Job Report
                </Button>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-sm text-slate-500">
              No shortlisted candidates currently available.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
