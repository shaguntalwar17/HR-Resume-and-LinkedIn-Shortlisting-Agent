"use client";

import { useEffect, useState } from "react";
import { Loader2, PlusCircle, PlayCircle } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Job = {
  id: string;
  title: string;
  department: string | null;
  location: string | null;
  employmentType: string | null;
  seniority: string | null;
  status: string;
  salaryMin: number | null;
  salaryMax: number | null;
  requiredSkills: string[];
  preferredSkills: string[];
  responsibilities: string[];
  qualifications: string[];
  certifications: string[];
  knockoutCriteria?: {
    minimumMandatorySkillMatchPercentage?: number;
    minimumExperienceYears?: number;
    rejectOnMissingMandatorySkillsCount?: number;
  } | null;
  minExperience: number;
  maxExperience: number | null;
  _count?: { applications: number };
  updatedAt: string;
};

function csvToArray(text: string) {
  return text
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function lineToArray(text: string) {
  return text
    .split(/\r?\n/g)
    .map((part) => part.trim())
    .filter(Boolean);
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [busy, setBusy] = useState(false);
  const [runningJobId, setRunningJobId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    department: "",
    location: "",
    employmentType: "Full-time",
    seniority: "Mid-Senior",
    description: "",
    requiredSkills: "",
    preferredSkills: "",
    responsibilities: "",
    qualifications: "",
    certifications: "",
    minExperience: "2",
    maxExperience: "8",
    salaryMin: "",
    salaryMax: "",
    minimumMandatorySkillMatchPercentage: "",
    minimumExperienceYears: "",
    rejectOnMissingMandatorySkillsCount: "",
    status: "DRAFT",
  });

  async function fetchJobs() {
    const response = await fetch("/api/jobs");
    const data = await response.json();
    setJobs(data.jobs ?? []);
  }

  useEffect(() => {
    let active = true;

    async function loadInitialJobs() {
      const response = await fetch("/api/jobs");
      const data = await response.json();
      if (active) {
        setJobs(data.jobs ?? []);
      }
    }

    void loadInitialJobs();
    return () => {
      active = false;
    };
  }, []);

  async function createJob() {
    setBusy(true);
    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          requiredSkills: csvToArray(form.requiredSkills),
          preferredSkills: csvToArray(form.preferredSkills),
          responsibilities: lineToArray(form.responsibilities),
          qualifications: lineToArray(form.qualifications),
          certifications: lineToArray(form.certifications),
          minExperience: Number.parseInt(form.minExperience, 10) || 0,
          maxExperience: Number.parseInt(form.maxExperience, 10) || undefined,
          salaryMin: Number.parseInt(form.salaryMin, 10) || undefined,
          salaryMax: Number.parseInt(form.salaryMax, 10) || undefined,
          knockoutCriteria: {
            minimumMandatorySkillMatchPercentage:
              Number.parseFloat(form.minimumMandatorySkillMatchPercentage) || undefined,
            minimumExperienceYears: Number.parseFloat(form.minimumExperienceYears) || undefined,
            rejectOnMissingMandatorySkillsCount:
              Number.parseInt(form.rejectOnMissingMandatorySkillsCount, 10) || undefined,
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to create job.");
      }
      toast.success("Job requisition created.");
      setForm({
        title: "",
        department: "",
        location: "",
        employmentType: "Full-time",
        seniority: "Mid-Senior",
        description: "",
        requiredSkills: "",
        preferredSkills: "",
        responsibilities: "",
        qualifications: "",
        certifications: "",
        minExperience: "2",
        maxExperience: "8",
        salaryMin: "",
        salaryMax: "",
        minimumMandatorySkillMatchPercentage: "",
        minimumExperienceYears: "",
        rejectOnMissingMandatorySkillsCount: "",
        status: "DRAFT",
      });
      await fetchJobs();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create job.");
    } finally {
      setBusy(false);
    }
  }

  async function runEvaluation(jobId: string) {
    setRunningJobId(jobId);
    try {
      const response = await fetch(`/api/jobs/${jobId}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, forceReevaluate: true }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Evaluation failed.");
      }
      toast.success(`Evaluated ${data.evaluatedCount} candidates for this job.`);
      await fetchJobs();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to run evaluation.");
    } finally {
      setRunningJobId(null);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-3">
      <Card className="xl:col-span-1">
        <CardHeader>
          <CardTitle>Create Job Requisition</CardTitle>
          <CardDescription>Define role scope, requirements, and hiring criteria.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Field label="Title">
            <Input value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} />
          </Field>
          <Field label="Department">
            <Input
              value={form.department}
              onChange={(event) => setForm((prev) => ({ ...prev, department: event.target.value }))}
            />
          </Field>
          <Field label="Location">
            <Input value={form.location} onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))} />
          </Field>
          <Field label="Employment Type">
            <Input
              value={form.employmentType}
              onChange={(event) => setForm((prev) => ({ ...prev, employmentType: event.target.value }))}
            />
          </Field>
          <Field label="Seniority">
            <Input
              value={form.seniority}
              onChange={(event) => setForm((prev) => ({ ...prev, seniority: event.target.value }))}
            />
          </Field>
          <Field label="Description">
            <Textarea
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              className="min-h-[120px]"
            />
          </Field>
          <Field label="Required Skills (comma-separated)">
            <Input
              value={form.requiredSkills}
              onChange={(event) => setForm((prev) => ({ ...prev, requiredSkills: event.target.value }))}
            />
          </Field>
          <Field label="Preferred Skills (comma-separated)">
            <Input
              value={form.preferredSkills}
              onChange={(event) => setForm((prev) => ({ ...prev, preferredSkills: event.target.value }))}
            />
          </Field>
          <Field label="Responsibilities (one per line)">
            <Textarea
              value={form.responsibilities}
              onChange={(event) => setForm((prev) => ({ ...prev, responsibilities: event.target.value }))}
              className="min-h-[80px]"
            />
          </Field>
          <Field label="Qualifications (one per line)">
            <Textarea
              value={form.qualifications}
              onChange={(event) => setForm((prev) => ({ ...prev, qualifications: event.target.value }))}
              className="min-h-[80px]"
            />
          </Field>
          <Field label="Certifications (one per line)">
            <Textarea
              value={form.certifications}
              onChange={(event) => setForm((prev) => ({ ...prev, certifications: event.target.value }))}
              className="min-h-[80px]"
            />
          </Field>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Min Experience">
              <Input
                type="number"
                value={form.minExperience}
                onChange={(event) => setForm((prev) => ({ ...prev, minExperience: event.target.value }))}
              />
            </Field>
            <Field label="Max Experience">
              <Input
                type="number"
                value={form.maxExperience}
                onChange={(event) => setForm((prev) => ({ ...prev, maxExperience: event.target.value }))}
              />
            </Field>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Salary Min (annual)">
              <Input
                type="number"
                value={form.salaryMin}
                onChange={(event) => setForm((prev) => ({ ...prev, salaryMin: event.target.value }))}
              />
            </Field>
            <Field label="Salary Max (annual)">
              <Input
                type="number"
                value={form.salaryMax}
                onChange={(event) => setForm((prev) => ({ ...prev, salaryMax: event.target.value }))}
              />
            </Field>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Knockout Criteria</p>
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Min mandatory skills %">
                <Input
                  type="number"
                  value={form.minimumMandatorySkillMatchPercentage}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      minimumMandatorySkillMatchPercentage: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Min experience years">
                <Input
                  type="number"
                  value={form.minimumExperienceYears}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, minimumExperienceYears: event.target.value }))
                  }
                />
              </Field>
              <Field label="Reject if missing skills >=">
                <Input
                  type="number"
                  value={form.rejectOnMissingMandatorySkillsCount}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      rejectOnMissingMandatorySkillsCount: event.target.value,
                    }))
                  }
                />
              </Field>
            </div>
          </div>
          <Field label="Status">
            <Select value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}>
              <option value="DRAFT">DRAFT</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="CLOSED">CLOSED</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </Select>
          </Field>
          <Button onClick={createJob} disabled={busy} className="w-full">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
            Create Requisition
          </Button>
        </CardContent>
      </Card>

      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle>Job Requisitions</CardTitle>
          <CardDescription>Manage active hiring roles and run candidate evaluations.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {jobs.length ? (
            jobs.map((job) => (
              <div key={job.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{job.title}</h3>
                    <p className="text-sm text-slate-600">
                      {job.department ?? "General"} | {job.location ?? "Remote/Hybrid"} | {job.minExperience}
                      {job.maxExperience ? `-${job.maxExperience}` : "+"} years
                    </p>
                    {job.salaryMin || job.salaryMax ? (
                      <p className="text-xs text-slate-500">
                        Salary: {job.salaryMin ? `$${job.salaryMin.toLocaleString()}` : "N/A"} -{" "}
                        {job.salaryMax ? `$${job.salaryMax.toLocaleString()}` : "Open"}
                      </p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge>{job.status}</Badge>
                      <Badge variant="info">{job._count?.applications ?? 0} evaluations</Badge>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => runEvaluation(job.id)}
                    disabled={runningJobId === job.id}
                  >
                    {runningJobId === job.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <PlayCircle className="h-4 w-4" />
                    )}
                    Evaluate Candidates
                  </Button>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Required Skills</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {(job.requiredSkills ?? []).slice(0, 10).map((skill) => (
                        <Badge key={`${job.id}-required-${skill}`}>{skill}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Preferred Skills</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {(job.preferredSkills ?? []).slice(0, 10).map((skill) => (
                        <Badge key={`${job.id}-preferred-${skill}`} variant="info">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                {(job.responsibilities?.length ?? 0) > 0 ? (
                  <div className="mt-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Responsibilities</p>
                    <p className="mt-1 text-xs text-slate-600">
                      {job.responsibilities.slice(0, 4).join(" | ")}
                    </p>
                  </div>
                ) : null}
                {job.knockoutCriteria ? (
                  <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    Knockout:
                    {job.knockoutCriteria.minimumMandatorySkillMatchPercentage
                      ? ` mandatory skills >= ${job.knockoutCriteria.minimumMandatorySkillMatchPercentage}%`
                      : ""}
                    {job.knockoutCriteria.minimumExperienceYears
                      ? ` | experience >= ${job.knockoutCriteria.minimumExperienceYears} yrs`
                      : ""}
                    {job.knockoutCriteria.rejectOnMissingMandatorySkillsCount
                      ? ` | reject if missing skills >= ${job.knockoutCriteria.rejectOnMissingMandatorySkillsCount}`
                      : ""}
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
              No requisitions yet. Create your first job to start the hiring workflow.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
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
