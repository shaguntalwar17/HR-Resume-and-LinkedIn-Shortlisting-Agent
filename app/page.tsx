import Link from "next/link";
import { ArrowRight, Bot, ChartNoAxesCombined, ShieldCheck } from "lucide-react";

import { WorkflowSteps } from "@/components/dashboard/workflow-steps";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const highlights = [
  {
    title: "Transparent Rubric Scoring",
    description:
      "Dimension-level scoring with weighted contributions, evidence snippets, and confidence levels.",
    icon: Bot,
  },
  {
    title: "Human-in-the-Loop Control",
    description: "Recruiters can override scores and recommendations with reason logs and timestamps.",
    icon: ShieldCheck,
  },
  {
    title: "Executive-ready Analytics",
    description: "Score distributions, skill-gap insights, and recommendation mix visualizations.",
    icon: ChartNoAxesCombined,
  },
];

export default function HomePage() {
  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-3xl border border-sky-100 bg-white/90 p-8 shadow-[0_20px_60px_rgba(2,132,199,0.15)]">
        <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-cyan-200/40 blur-3xl" />
        <div className="absolute -bottom-20 left-8 h-56 w-56 rounded-full bg-sky-300/30 blur-3xl" />

        <div className="relative z-10 max-w-3xl space-y-5">
          <Badge variant="info">Enterprise HR-Tech AI Assistant</Badge>
          <h1 className="text-4xl font-bold leading-tight text-slate-900 md:text-5xl">
            HireWise AI
            <span className="block text-gradient">Resume & LinkedIn Shortlisting Agent</span>
          </h1>
          <p className="max-w-2xl text-lg text-slate-600">
            Standardize candidate screening with transparent AI-assisted scoring, fairer evaluations,
            and auditable human overrides. Built for recruiter productivity, not automated hiring decisions.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/workspace">
              <Button size="lg">
                Start Evaluation
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/workspace?demo=1">
              <Button variant="secondary" size="lg">
                Try Demo Data
              </Button>
            </Link>
            <Link href="/reports">
              <Button variant="ghost" size="lg">
                View Reports
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-900">Business Problem</h2>
        <p className="max-w-4xl text-slate-600">
          HR teams often screen hundreds of applications per role, leading to fatigue, inconsistent
          decision criteria, and missed talent. HireWise AI converts unstructured resumes and LinkedIn
          profile data into a consistent ranking framework while keeping human recruiters in full control.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-900">Workflow</h2>
        <WorkflowSteps />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {highlights.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title}>
              <CardHeader>
                <div className="mb-2 inline-flex w-fit rounded-xl bg-slate-900 p-2 text-white">
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle>{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
              <CardContent />
            </Card>
          );
        })}
      </section>
    </div>
  );
}
