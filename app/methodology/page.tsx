import * as React from "react";
import { ShieldCheck, Sigma, Workflow } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const rubric = [
  {
    dimension: "Skills Match",
    weight: "30%",
    poor: "<30% skills match",
    average: "50–70% skills match",
    excellent: ">85% skills match",
  },
  {
    dimension: "Experience Relevance",
    weight: "25%",
    poor: "Unrelated domain",
    average: "Adjacent domain",
    excellent: "Exact domain and seniority",
  },
  {
    dimension: "Education & Certs",
    weight: "15%",
    poor: "Does not meet minimum",
    average: "Meets minimum",
    excellent: "Exceeds minimum + relevant certs",
  },
  {
    dimension: "Project / Portfolio",
    weight: "20%",
    poor: "No evidence",
    average: "1–2 generic projects",
    excellent: "Strong relevant portfolio",
  },
  {
    dimension: "Communication Quality",
    weight: "10%",
    poor: "Poor structure/grammar",
    average: "Adequate clarity",
    excellent: "Crisp, structured, impactful",
  },
];

export default function MethodologyPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-sky-100 bg-white/90 p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Scoring Methodology & Responsible AI</h1>
        <p className="mt-2 text-sm text-slate-600">
          HireWise AI provides transparent candidate recommendations. Final hiring decisions remain fully human.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <InsightCard
          title="Transparent Formula"
          icon={Sigma}
          description="Total score = weighted sum of five dimensions, each scored out of 10."
        />
        <InsightCard
          title="Auditable Decisions"
          icon={Workflow}
          description="Every recruiter override stores old/new values, reason, and timestamp."
        />
        <InsightCard
          title="Bias-aware Guardrails"
          icon={ShieldCheck}
          description="Sensitive personal attributes are detected only for warning and ignored in scoring."
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mandatory Scoring Rubric</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-3 py-2 text-left">Dimension</th>
                  <th className="px-3 py-2 text-left">Weight</th>
                  <th className="px-3 py-2 text-left">Poor</th>
                  <th className="px-3 py-2 text-left">Average</th>
                  <th className="px-3 py-2 text-left">Excellent</th>
                </tr>
              </thead>
              <tbody>
                {rubric.map((row) => (
                  <tr key={row.dimension} className="border-b border-slate-100">
                    <td className="px-3 py-2 font-medium text-slate-900">{row.dimension}</td>
                    <td className="px-3 py-2">{row.weight}</td>
                    <td className="px-3 py-2">{row.poor}</td>
                    <td className="px-3 py-2">{row.average}</td>
                    <td className="px-3 py-2">{row.excellent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recommendation Bands</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Badge variant="success">85-100: Strong Shortlist</Badge>
          <Badge variant="info">70-84: Shortlist</Badge>
          <Badge variant="warning">55-69: Review Manually</Badge>
          <Badge variant="danger">Below 55: Not Recommended</Badge>
        </CardContent>
      </Card>
    </div>
  );
}

function InsightCard({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="mb-2 inline-flex rounded-lg bg-slate-900 p-2 text-white">
          <Icon className="h-5 w-5" />
        </div>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-slate-600">{description}</CardContent>
    </Card>
  );
}
