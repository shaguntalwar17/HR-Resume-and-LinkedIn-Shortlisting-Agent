"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { EvaluationDetailModal } from "@/components/evaluations/evaluation-detail-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type EvaluationRecord = {
  id: string;
  status: string;
  recommendation: string;
  overallScore: number;
  updatedAt: string;
  candidate: {
    fullName: string;
    currentTitle?: string | null;
    experienceYears: number;
    location?: string | null;
    skills: string[];
  };
  job: {
    id: string;
    title: string;
  };
  explanationJson?: {
    matchedSkills?: string[];
    missingSkills?: string[];
  };
  riskFlagsJson?: {
    flags?: string[];
  };
  reviews: Array<{
    id: string;
    decision: string;
    notes?: string | null;
    overrideReason?: string | null;
    createdAt: string;
    reviewer?: { name?: string | null };
  }>;
  confidenceScore: number;
};

type Job = {
  id: string;
  title: string;
};

export default function EvaluationsPage() {
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<EvaluationRecord[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const [jobFilter, setJobFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [scoreMin, setScoreMin] = useState("");
  const [scoreMax, setScoreMax] = useState("");
  const [search, setSearch] = useState("");
  const [skillFilter, setSkillFilter] = useState("");
  const [bulkStatus, setBulkStatus] = useState("REVIEWED");
  const [bulkBusy, setBulkBusy] = useState(false);

  const selectedApplication = applications.find((application) => application.id === activeId) ?? null;

  async function fetchData(options?: { showLoading?: boolean }) {
    if (options?.showLoading ?? true) {
      setLoading(true);
    }
    try {
      const [jobsResponse, evaluationsResponse] = await Promise.all([
        fetch("/api/jobs"),
        fetch("/api/evaluations"),
      ]);
      const jobsData = await jobsResponse.json();
      const evaluationsData = await evaluationsResponse.json();
      setJobs(jobsData.jobs ?? []);
      setApplications(evaluationsData.applications ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function loadInitialData() {
      try {
        const [jobsResponse, evaluationsResponse] = await Promise.all([
          fetch("/api/jobs"),
          fetch("/api/evaluations"),
        ]);
        const jobsData = await jobsResponse.json();
        const evaluationsData = await evaluationsResponse.json();
        if (active) {
          setJobs(jobsData.jobs ?? []);
          setApplications(evaluationsData.applications ?? []);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadInitialData();
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    return applications.filter((application) => {
      if (jobFilter && application.job.id !== jobFilter) return false;
      if (statusFilter && application.status !== statusFilter) return false;
      if (search && !application.candidate.fullName.toLowerCase().includes(search.toLowerCase())) return false;
      if (
        skillFilter &&
        !application.candidate.skills.some((skill) =>
          skill.toLowerCase().includes(skillFilter.toLowerCase())
        )
      )
        return false;
      if (scoreMin && application.overallScore < Number.parseFloat(scoreMin)) return false;
      if (scoreMax && application.overallScore > Number.parseFloat(scoreMax)) return false;
      return true;
    });
  }, [applications, jobFilter, statusFilter, search, skillFilter, scoreMin, scoreMax]);

  async function bulkUpdateStatus() {
    if (!selectedIds.length) {
      toast.error("Select at least one candidate application.");
      return;
    }
    setBulkBusy(true);
    try {
      await Promise.all(
        selectedIds.map(async (applicationId) => {
          await fetch(`/api/evaluations/${applicationId}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              status: bulkStatus,
            }),
          });
        })
      );
      toast.success(`Updated status for ${selectedIds.length} applications.`);
      setSelectedIds([]);
      await fetchData({ showLoading: true });
    } finally {
      setBulkBusy(false);
    }
  }

  async function bulkExportShortlist() {
    const shortlisted = filtered.filter((item) => item.status === "SHORTLISTED");
    if (!shortlisted.length) {
      toast.error("No shortlisted candidates available in current filter.");
      return;
    }
    const csvRows = [
      ["Candidate", "Job", "Score", "Recommendation", "Status"].join(","),
      ...shortlisted.map((item) =>
        [
          item.candidate.fullName,
          item.job.title,
          item.overallScore.toString(),
          item.recommendation,
          item.status,
        ]
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(",")
      ),
    ];

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `shortlist-${Date.now()}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function toggleSelect(applicationId: string) {
    setSelectedIds((prev) =>
      prev.includes(applicationId) ? prev.filter((id) => id !== applicationId) : [...prev, applicationId]
    );
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Candidate Pipeline</CardTitle>
          <CardDescription>
            Filter by job, status, score, skills, and perform bulk review actions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Select value={jobFilter} onChange={(event) => setJobFilter(event.target.value)}>
              <option value="">All Jobs</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title}
                </option>
              ))}
            </Select>
            <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">All Statuses</option>
              <option value="NEW">NEW</option>
              <option value="PARSED">PARSED</option>
              <option value="EVALUATED">EVALUATED</option>
              <option value="REVIEWED">REVIEWED</option>
              <option value="SHORTLISTED">SHORTLISTED</option>
              <option value="REJECTED">REJECTED</option>
              <option value="HOLD">HOLD</option>
              <option value="HIRED">HIRED</option>
            </Select>
            <Input placeholder="Min score" value={scoreMin} onChange={(event) => setScoreMin(event.target.value)} />
            <Input placeholder="Max score" value={scoreMax} onChange={(event) => setScoreMax(event.target.value)} />
            <Input placeholder="Search candidate" value={search} onChange={(event) => setSearch(event.target.value)} />
            <Input placeholder="Skill filter" value={skillFilter} onChange={(event) => setSkillFilter(event.target.value)} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={bulkStatus} onChange={(event) => setBulkStatus(event.target.value)}>
              <option value="REVIEWED">REVIEWED</option>
              <option value="SHORTLISTED">SHORTLISTED</option>
              <option value="REJECTED">REJECTED</option>
              <option value="HOLD">HOLD</option>
              <option value="HIRED">HIRED</option>
            </Select>
            <Button variant="secondary" onClick={bulkUpdateStatus} disabled={bulkBusy}>
              {bulkBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Bulk Status Update
            </Button>
            <Button variant="ghost" onClick={bulkExportShortlist}>
              Bulk Export Shortlist
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Evaluation Queue</CardTitle>
          <CardDescription>Shortlist, reject, hold, and assign candidates to hiring managers.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-slate-500">
              <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
              Loading evaluation pipeline...
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Select</TableHead>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Current Role</TableHead>
                  <TableHead>Experience</TableHead>
                  <TableHead>Job</TableHead>
                  <TableHead>Match Score</TableHead>
                  <TableHead>Matched Skills</TableHead>
                  <TableHead>Missing Skills</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((application) => (
                  <TableRow key={application.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(application.id)}
                        onChange={() => toggleSelect(application.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium text-slate-900">{application.candidate.fullName}</TableCell>
                    <TableCell>{application.candidate.currentTitle ?? "N/A"}</TableCell>
                    <TableCell>{application.candidate.experienceYears} yrs</TableCell>
                    <TableCell>{application.job.title}</TableCell>
                    <TableCell>{application.overallScore}</TableCell>
                    <TableCell className="max-w-[170px] text-xs">
                      {(application.explanationJson?.matchedSkills ?? []).slice(0, 3).join(", ") || "N/A"}
                    </TableCell>
                    <TableCell className="max-w-[170px] text-xs">
                      {(application.explanationJson?.missingSkills ?? []).slice(0, 3).join(", ") || "N/A"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={application.status === "SHORTLISTED" ? "success" : application.status === "REJECTED" ? "danger" : "default"}>
                        {application.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(application.updatedAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="secondary" onClick={() => setActiveId(application.id)}>
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <EvaluationDetailModal
        open={Boolean(activeId)}
        onClose={() => setActiveId(null)}
        evaluation={selectedApplication}
        onChanged={() => fetchData({ showLoading: false })}
      />
    </div>
  );
}
