"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Job = {
  id: string;
  title: string;
  status: string;
};

type Candidate = {
  id: string;
  fullName: string;
  skills: string[];
};

type Application = {
  id: string;
  overallScore: number;
  status: string;
  recommendation: string;
  candidate: { fullName: string };
  job: { title: string };
  updatedAt: string;
};

type AuditLog = {
  id: string;
  action: string;
  entityType: string;
  createdAt: string;
  actor?: { name?: string | null } | null;
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const [jobsResponse, candidatesResponse, evaluationsResponse, logsResponse] = await Promise.all([
          fetch("/api/jobs"),
          fetch("/api/candidates"),
          fetch("/api/evaluations"),
          fetch("/api/audit-logs"),
        ]);

        const jobsData = await jobsResponse.json();
        const candidatesData = await candidatesResponse.json();
        const evaluationsData = await evaluationsResponse.json();
        const logsData = await logsResponse.json();

        setJobs(jobsData.jobs ?? []);
        setCandidates(candidatesData.candidates ?? []);
        setApplications(evaluationsData.applications ?? []);
        setLogs(logsData.logs ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const metrics = useMemo(() => {
    const activeJobs = jobs.filter((job) => job.status === "ACTIVE").length;
    const shortlisted = applications.filter((application) =>
      ["SHORTLISTED", "HIRED"].includes(application.status)
    ).length;
    const pendingReviews = applications.filter((application) =>
      ["NEW", "PARSED", "EVALUATED"].includes(application.status)
    ).length;
    const averageScore =
      applications.length > 0
        ? Number(
            (
              applications.reduce((sum, application) => sum + application.overallScore, 0) /
              applications.length
            ).toFixed(2)
          )
        : 0;

    return {
      activeJobs,
      totalCandidates: candidates.length,
      shortlisted,
      pendingReviews,
      averageScore,
    };
  }, [applications, candidates.length, jobs]);

  const statusFunnel = useMemo(() => {
    const order = ["NEW", "PARSED", "EVALUATED", "REVIEWED", "SHORTLISTED", "REJECTED", "HOLD", "HIRED"];
    return order.map((status) => ({
      status,
      count: applications.filter((application) => application.status === status).length,
    }));
  }, [applications]);

  const scoreDistribution = useMemo(() => {
    const buckets = [
      { label: "0-39", min: 0, max: 39.99 },
      { label: "40-54", min: 40, max: 54.99 },
      { label: "55-69", min: 55, max: 69.99 },
      { label: "70-84", min: 70, max: 84.99 },
      { label: "85-100", min: 85, max: 100 },
    ];
    return buckets.map((bucket) => ({
      range: bucket.label,
      count: applications.filter(
        (application) =>
          application.overallScore >= bucket.min && application.overallScore <= bucket.max
      ).length,
    }));
  }, [applications]);

  const missingSkillSummary = useMemo(() => {
    const missingMap = new Map<string, number>();
    applications.forEach((application) => {
      const missing =
        ((application as unknown as { explanationJson?: { missingSkills?: string[] } }).explanationJson
          ?.missingSkills as string[]) ?? [];
      missing.forEach((skill) => missingMap.set(skill, (missingMap.get(skill) ?? 0) + 1));
    });

    return Array.from(missingMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([skill, count]) => ({ skill, count }));
  }, [applications]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading dashboard metrics...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard title="Active Jobs" value={metrics.activeJobs.toString()} />
        <MetricCard title="Total Candidates" value={metrics.totalCandidates.toString()} />
        <MetricCard title="Shortlisted" value={metrics.shortlisted.toString()} />
        <MetricCard title="Pending Review" value={metrics.pendingReviews.toString()} />
        <MetricCard title="Avg Match Score" value={`${metrics.averageScore}`} />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Candidate Funnel</CardTitle>
            <CardDescription>Status flow across hiring pipeline</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusFunnel}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="status" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#0284c7" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Score Distribution</CardTitle>
            <CardDescription>Evaluation spread by score band</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={scoreDistribution} dataKey="count" nameKey="range" outerRadius={110} label />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Missing Skills</CardTitle>
            <CardDescription>Most frequent skill gaps against active requisitions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {missingSkillSummary.length ? (
              missingSkillSummary.map((entry) => (
                <div
                  key={entry.skill}
                  className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <span className="font-medium text-slate-700">{entry.skill}</span>
                  <span className="rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700">
                    {entry.count}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No significant skill-gap trends yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest recruiter and system actions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {logs.slice(0, 8).map((log) => (
              <div key={log.id} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <p className="font-semibold text-slate-800">
                  {log.action} - {log.entityType}
                </p>
                <p className="text-xs text-slate-500">
                  {new Date(log.createdAt).toLocaleString()} by {log.actor?.name ?? "System"}
                </p>
              </div>
            ))}
            {!logs.length ? <p className="text-sm text-slate-500">No activity recorded yet.</p> : null}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
        <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      </CardContent>
    </Card>
  );
}
