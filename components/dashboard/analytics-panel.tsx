"use client";

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { DashboardAnalytics } from "@/lib/scoring/analytics";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const pieColors = ["#0f766e", "#0284c7", "#d97706", "#dc2626"];

interface AnalyticsPanelProps {
  analytics: DashboardAnalytics | null;
}

export function AnalyticsPanel({ analytics }: AnalyticsPanelProps) {
  if (!analytics) return null;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total Candidates" value={analytics.totalCandidates.toString()} />
        <MetricCard label="Average Score" value={`${analytics.averageScore}`} />
        <MetricCard label="Top Candidate" value={analytics.topCandidateName} />
        <MetricCard label="Top Score" value={`${analytics.topCandidateScore}/100`} />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recommendation Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={analytics.recommendationBreakdown} dataKey="value" nameKey="name" outerRadius={92} label>
                  {analytics.recommendationBreakdown.map((entry, index) => (
                    <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Score Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.scoreDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#1d4ed8" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Skill Gap Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.skillGapDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="candidate" tick={{ fontSize: 11 }} interval={0} angle={-18} textAnchor="end" height={70} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="matchedCount" fill="#0f766e" name="Matched" radius={[6, 6, 0, 0]} />
                <Bar dataKey="missingCount" fill="#dc2626" name="Missing" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Most Common Missing Skills</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analytics.mostCommonMissingSkills.length ? (
                analytics.mostCommonMissingSkills.map((entry) => (
                  <li
                    key={entry.skill}
                    className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    <span className="font-medium text-slate-700">{entry.skill}</span>
                    <span className="rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700">
                      {entry.count}
                    </span>
                  </li>
                ))
              ) : (
                <li className="text-sm text-slate-500">No major missing skill pattern detected.</li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
        <p className="mt-2 text-xl font-bold text-slate-900">{value}</p>
      </CardContent>
    </Card>
  );
}
