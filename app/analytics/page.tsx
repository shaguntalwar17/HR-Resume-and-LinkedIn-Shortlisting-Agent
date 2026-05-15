"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Application = {
  id: string;
  overallScore: number;
  status: string;
  job: { id: string; title: string };
  createdAt: string;
  updatedAt: string;
};

type AuditLog = {
  id: string;
  action: string;
  createdAt: string;
  actor?: { name?: string | null } | null;
};

export default function AnalyticsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    void (async () => {
      const [evaluationsResponse, logsResponse] = await Promise.all([
        fetch("/api/evaluations"),
        fetch("/api/audit-logs"),
      ]);
      const evaluationsData = await evaluationsResponse.json();
      const logsData = await logsResponse.json();
      setApplications(evaluationsData.applications ?? []);
      setLogs(logsData.logs ?? []);
    })();
  }, []);

  const candidatesByStatus = useMemo(() => {
    const map = new Map<string, number>();
    applications.forEach((application) => {
      map.set(application.status, (map.get(application.status) ?? 0) + 1);
    });
    return Array.from(map.entries()).map(([status, count]) => ({ status, count }));
  }, [applications]);

  const avgScoreByJob = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    applications.forEach((application) => {
      const key = application.job.title;
      const current = map.get(key) ?? { total: 0, count: 0 };
      map.set(key, {
        total: current.total + application.overallScore,
        count: current.count + 1,
      });
    });
    return Array.from(map.entries()).map(([job, stats]) => ({
      job,
      avgScore: Number((stats.total / stats.count).toFixed(2)),
    }));
  }, [applications]);

  const reviewTurnaround = useMemo(() => {
    const rows = applications.slice(0, 15).map((application) => {
      const created = new Date(application.createdAt).getTime();
      const updated = new Date(application.updatedAt).getTime();
      const hours = Math.max(0, (updated - created) / (1000 * 60 * 60));
      return {
        applicationId: application.id.slice(0, 8),
        reviewHours: Number(hours.toFixed(2)),
      };
    });
    return rows;
  }, [applications]);

  const recruiterActivity = useMemo(() => {
    const map = new Map<string, number>();
    logs.forEach((log) => {
      const name = log.actor?.name ?? "System";
      map.set(name, (map.get(name) ?? 0) + 1);
    });
    return Array.from(map.entries()).map(([actor, count]) => ({ actor, count }));
  }, [logs]);

  const shortlistConversion = useMemo(() => {
    if (!applications.length) return 0;
    const shortlisted = applications.filter((application) =>
      ["SHORTLISTED", "HIRED"].includes(application.status)
    ).length;
    return Number(((shortlisted / applications.length) * 100).toFixed(2));
  }, [applications]);

  const pendingManagerReview = useMemo(
    () =>
      applications.filter((application) =>
        ["REVIEWED", "SENT_TO_HIRING_MANAGER"].includes(application.status)
      ).length,
    [applications]
  );

  return (
    <div className="space-y-5">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric title="Applications" value={applications.length.toString()} />
        <Metric title="Shortlist Conversion" value={`${shortlistConversion}%`} />
        <Metric title="Pending Manager Review" value={pendingManagerReview.toString()} />
        <Metric title="Recruiter Activity Events" value={logs.length.toString()} />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Candidates by Status</CardTitle>
            <CardDescription>Pipeline status distribution.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={candidatesByStatus}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="status" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#0284c7" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Average Score by Job</CardTitle>
            <CardDescription>Hiring quality trends across requisitions.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={avgScoreByJob}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="job" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="avgScore" fill="#0f766e" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Time to Review (Hours)</CardTitle>
            <CardDescription>Application turnaround between creation and latest update.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={reviewTurnaround}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="applicationId" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="reviewHours" stroke="#ea580c" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recruiter Activity</CardTitle>
            <CardDescription>Action volume by actor from audit logs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {recruiterActivity.map((entry) => (
              <div
                key={entry.actor}
                className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2"
              >
                <span className="text-sm font-medium text-slate-700">{entry.actor}</span>
                <span className="rounded-full bg-sky-100 px-2 py-1 text-xs font-semibold text-sky-700">
                  {entry.count}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
        <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      </CardContent>
    </Card>
  );
}
