"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, DatabaseZap, ShieldCheck, Users2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    title: "Production Workflow",
    description:
      "From requisition creation to shortlist decisions with recruiter and hiring manager collaboration.",
    icon: Users2,
  },
  {
    title: "Transparent AI Scoring",
    description:
      "Deterministic + optional semantic matching with evidence snippets, risk flags, and confidence scoring.",
    icon: DatabaseZap,
  },
  {
    title: "Responsible AI Guardrails",
    description:
      "Sensitive attributes excluded from scoring, mandatory human review, and full audit trail support.",
    icon: ShieldCheck,
  },
];
const isDemoModeEnabled = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

export default function HomePage() {
  const [bootstrapping, setBootstrapping] = useState(false);

  async function bootstrapDemo() {
    setBootstrapping(true);
    try {
      const response = await fetch("/api/demo/bootstrap", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to initialize demo data.");
      toast.success("Demo workspace initialized. Use demo credentials to sign in.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Demo bootstrap failed.");
    } finally {
      setBootstrapping(false);
    }
  }

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-3xl border border-sky-100 bg-white/90 p-8 shadow-[0_20px_60px_rgba(2,132,199,0.15)]">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-200/35 blur-3xl" />
        <div className="relative z-10 max-w-3xl space-y-4">
          <h1 className="text-4xl font-bold text-slate-900 md:text-5xl">
            HireWise AI
            <span className="block text-gradient">Production HR Shortlisting Platform</span>
          </h1>
          <p className="text-lg text-slate-600">
            Enterprise hiring intelligence for recruiters and hiring managers with multi-role workflows,
            transparent AI scoring, auditability, and report-ready analytics.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/login">
              <Button size="lg">
                Sign In
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            {isDemoModeEnabled ? (
              <Button size="lg" variant="secondary" onClick={bootstrapDemo} disabled={bootstrapping}>
                {bootstrapping ? "Initializing..." : "Initialize Demo Data"}
              </Button>
            ) : null}
            <Link href="/methodology">
              <Button size="lg" variant="ghost">
                View Methodology
              </Button>
            </Link>
          </div>
          {isDemoModeEnabled ? (
            <p className="text-xs text-slate-500">
              Demo credentials become available after initialization: admin/recruiter/manager/viewer
              {" "}@hirewise.demo
            </p>
          ) : (
            <p className="text-xs text-slate-500">
              Production mode is active. Demo bootstrap is disabled for this environment.
            </p>
          )}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <Card key={feature.title}>
              <CardHeader>
                <div className="mb-2 inline-flex w-fit rounded-xl bg-slate-900 p-2 text-white">
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
              <CardContent />
            </Card>
          );
        })}
      </section>
    </div>
  );
}
