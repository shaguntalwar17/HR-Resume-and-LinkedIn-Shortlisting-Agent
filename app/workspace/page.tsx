"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FileUp, Loader2, PlayCircle, Search, Settings2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { CandidateComparison } from "@/components/candidate/candidate-comparison";
import { CandidateDetailModal } from "@/components/candidate/candidate-detail-modal";
import { AnalyticsPanel } from "@/components/dashboard/analytics-panel";
import { RankedTable } from "@/components/dashboard/ranked-table";
import { RecommendationBadge } from "@/components/dashboard/recommendation-badge";
import { ReportDownloadCard } from "@/components/reports/report-download-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_WEIGHTS, EvaluationRun, Recommendation, ScoreDimensionKey } from "@/lib/types";
import { DashboardAnalytics } from "@/lib/scoring/analytics";

const stepMotion = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

type EvaluateResponse = {
  run: EvaluationRun;
  analytics: DashboardAnalytics;
  aiEnhancementEnabled: boolean;
};

function normalizeWeights(weights: Record<ScoreDimensionKey, number>) {
  const total =
    weights.skillsMatch +
    weights.experienceRelevance +
    weights.educationCerts +
    weights.projectPortfolio +
    weights.communicationQuality;
  if (total <= 0) return DEFAULT_WEIGHTS;
  return {
    skillsMatch: Number((weights.skillsMatch / total).toFixed(4)),
    experienceRelevance: Number((weights.experienceRelevance / total).toFixed(4)),
    educationCerts: Number((weights.educationCerts / total).toFixed(4)),
    projectPortfolio: Number((weights.projectPortfolio / total).toFixed(4)),
    communicationQuality: Number((weights.communicationQuality / total).toFixed(4)),
  } satisfies Record<ScoreDimensionKey, number>;
}

export default function WorkspacePage() {
  const [shouldLoadDemo] = useState(
    () => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("demo") === "1"
  );

  const [jdText, setJdText] = useState("");
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [resumeFiles, setResumeFiles] = useState<File[]>([]);
  const [linkedInJson, setLinkedInJson] = useState("");

  const [run, setRun] = useState<EvaluationRun | null>(null);
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [activeCandidateId, setActiveCandidateId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [recommendationFilter, setRecommendationFilter] = useState<Recommendation | "All">("All");
  const [weights, setWeights] = useState<Record<ScoreDimensionKey, number>>(DEFAULT_WEIGHTS);

  const [loadingJd, setLoadingJd] = useState(false);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [runningEval, setRunningEval] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [parsingStatus, setParsingStatus] = useState<string>("");

  useEffect(() => {
    if (!shouldLoadDemo) return;
    void handleLoadDemo();
  }, [shouldLoadDemo]);

  const filteredEvaluations = useMemo(() => {
    if (!run) return [];
    return run.evaluations.filter((evaluation) => {
      const matchesFilter =
        recommendationFilter === "All" || evaluation.recommendation === recommendationFilter;
      const matchesSearch = evaluation.candidateName.toLowerCase().includes(search.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [run, recommendationFilter, search]);

  const selectedCandidate = run?.candidates.find((candidate) => candidate.id === activeCandidateId) ?? null;
  const selectedEvaluation =
    run?.evaluations.find((evaluation) => evaluation.candidateId === activeCandidateId) ?? null;

  async function handleParseJd() {
    setLoadingJd(true);
    try {
      const formData = new FormData();
      formData.append("jdText", jdText);
      if (jdFile) formData.append("jdFile", jdFile);

      const response = await fetch("/api/jd/parse", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to parse JD.");

      setRun((prev) =>
        prev
          ? {
              ...prev,
              jd: data.jd,
              evaluations: [],
              updatedAt: new Date().toISOString(),
            }
          : {
              id: "draft-run",
              jd: data.jd,
              candidates: [],
              evaluations: [],
              overrideHistory: [],
              recruiterNotes: [],
              weights,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
      );

      toast.success("Job description parsed successfully.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "JD parse failed.");
    } finally {
      setLoadingJd(false);
    }
  }

  async function handleParseCandidates() {
    setLoadingCandidates(true);
    setParsingStatus("Parsing resume and LinkedIn inputs...");
    try {
      const formData = new FormData();
      resumeFiles.forEach((file) => formData.append("resumeFiles", file));
      formData.append("linkedInJson", linkedInJson);

      const response = await fetch("/api/candidates/parse", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to parse candidates.");

      setRun((prev) =>
        prev
          ? {
              ...prev,
              candidates: data.candidates,
              updatedAt: new Date().toISOString(),
            }
          : {
              id: "draft-run",
              jd: {
                id: "draft-jd",
                rawText: "",
                roleTitle: "Draft Role",
                requiredSkills: [],
                preferredSkills: [],
                minimumExperienceYears: 0,
                domainIndustry: "General",
                educationRequirements: [],
                certifications: [],
                responsibilities: [],
                niceToHaveQualifications: [],
                parsedAt: new Date().toISOString(),
              },
              candidates: data.candidates,
              evaluations: [],
              overrideHistory: [],
              recruiterNotes: [],
              weights,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
      );

      toast.success(`Parsed ${data.candidates.length} candidates.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Candidate parsing failed.");
    } finally {
      setLoadingCandidates(false);
      setParsingStatus("");
    }
  }

  async function handleRunEvaluation() {
    if (!run?.jd?.rawText || !run?.candidates?.length) {
      toast.error("Parse JD and candidates before running evaluation.");
      return;
    }

    setRunningEval(true);
    try {
      const payload = {
        jd: run.jd,
        candidates: run.candidates,
        weights: normalizeWeights(weights),
        runId: run.id !== "draft-run" ? run.id : undefined,
        useAiEnhancement: true,
      };
      const response = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as EvaluateResponse | { error: string };
      if (!response.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "Evaluation failed.");
      }

      setRun(data.run);
      setAnalytics(data.analytics);
      setWeights(data.run.weights);
      toast.success(
        data.aiEnhancementEnabled
          ? "Evaluation complete with AI enhancement enabled."
          : "Evaluation complete using deterministic fallback mode."
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Evaluation failed.");
    } finally {
      setRunningEval(false);
    }
  }

  async function handleLoadDemo() {
    setLoadingDemo(true);
    try {
      const response = await fetch("/api/demo", { method: "POST" });
      const data = (await response.json()) as { run: EvaluationRun; analytics: DashboardAnalytics; error?: string };
      if (!response.ok || data.error) {
        throw new Error(data.error ?? "Failed to load demo data.");
      }
      setRun(data.run);
      setAnalytics(data.analytics);
      setWeights(data.run.weights);
      setJdText(data.run.jd.rawText);
      setLinkedInJson("");
      setResumeFiles([]);
      toast.success("Demo data loaded. You can start exploring rankings now.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Demo load failed.");
    } finally {
      setLoadingDemo(false);
    }
  }

  async function handleApplyOverride(payload: {
    candidateId: string;
    dimensionKey?: ScoreDimensionKey;
    newRawScore?: number;
    newRecommendation?: Recommendation;
    reason: string;
  }) {
    if (!run) return;
    const response = await fetch("/api/override", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ runId: run.id, ...payload }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error ?? "Override failed.");
    }
    setRun(data.run);
    setAnalytics(data.analytics);
    toast.success("Override applied and logged.");
  }

  async function handleAddNote(payload: { candidateId: string; note: string }) {
    if (!run) return;
    const response = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ runId: run.id, ...payload }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error ?? "Failed to save note.");
    }
    setRun(data.run);
    setAnalytics(data.analytics);
    toast.success("Recruiter note saved.");
  }

  return (
    <div className="space-y-6">
      <motion.section
        variants={stepMotion}
        initial="hidden"
        animate="show"
        className="rounded-2xl border border-sky-100 bg-white/90 p-5 shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-sky-700">Evaluation Workspace</p>
            <h1 className="text-2xl font-bold text-slate-900">Run Candidate Shortlisting</h1>
            <p className="text-sm text-slate-600">Sensitive attributes are ignored during scoring.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleLoadDemo} disabled={loadingDemo}>
              {loadingDemo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Try Demo Data
            </Button>
            <Button onClick={handleRunEvaluation} disabled={runningEval || !run?.jd || !run?.candidates?.length}>
              {runningEval ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
              Run AI Evaluation
            </Button>
          </div>
        </div>
      </motion.section>

      <motion.section variants={stepMotion} initial="hidden" animate="show" transition={{ delay: 0.03 }}>
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Add Job Description</CardTitle>
            <CardDescription>Paste JD text and/or upload JD file (.txt, .pdf, .docx).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              placeholder="Paste job description here..."
              value={jdText}
              onChange={(event) => setJdText(event.target.value)}
              className="min-h-[180px]"
            />
            <div className="flex flex-wrap items-center gap-3">
              <Input type="file" accept=".pdf,.docx,.txt" onChange={(event) => setJdFile(event.target.files?.[0] ?? null)} />
              <Button variant="secondary" onClick={handleParseJd} disabled={loadingJd || (!jdText && !jdFile)}>
                {loadingJd ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Parse JD
              </Button>
            </div>
            {run?.jd?.rawText ? <ParsedJdCard run={run} /> : null}
          </CardContent>
        </Card>
      </motion.section>

      <motion.section variants={stepMotion} initial="hidden" animate="show" transition={{ delay: 0.05 }}>
        <Card>
          <CardHeader>
            <CardTitle>Step 2: Upload Resumes / LinkedIn JSON</CardTitle>
            <CardDescription>
              Batch upload candidate resumes and optionally paste LinkedIn JSON payload(s).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
              <Label className="mb-2 block">Drag-and-drop resumes or browse files</Label>
              <Input
                type="file"
                accept=".pdf,.docx,.txt"
                multiple
                onChange={(event) => {
                  const files = Array.from(event.target.files ?? []);
                  setResumeFiles(files);
                }}
              />
              <div className="mt-3 space-y-1 text-sm text-slate-600">
                {resumeFiles.length ? (
                  resumeFiles.map((file) => (
                    <div key={file.name} className="flex items-center gap-2">
                      <FileUp className="h-4 w-4 text-sky-600" />
                      <span>{file.name}</span>
                    </div>
                  ))
                ) : (
                  <p>No resume files selected.</p>
                )}
              </div>
            </div>
            <div>
              <Label className="mb-2 block">LinkedIn Profile JSON (manual/placeholder mode)</Label>
              <Textarea
                placeholder='{"name":"Candidate","skills":["React","Node.js"],"experience":[...]}'
                value={linkedInJson}
                onChange={(event) => setLinkedInJson(event.target.value)}
                className="min-h-[140px]"
              />
            </div>
            <div className="flex items-center gap-3">
              <Button variant="secondary" onClick={handleParseCandidates} disabled={loadingCandidates || (!resumeFiles.length && !linkedInJson)}>
                {loadingCandidates ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Parse Candidate Inputs
              </Button>
              {parsingStatus ? <p className="text-sm text-slate-500">{parsingStatus}</p> : null}
            </div>
            <p className="text-xs text-slate-500">
              Bias-aware mode: personal attributes (gender, age, marital status, religion, nationality) are ignored.
            </p>
            {run?.candidates?.length ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                Parsed {run.candidates.length} candidate profiles.
              </div>
            ) : null}
          </CardContent>
        </Card>
      </motion.section>

      <motion.section variants={stepMotion} initial="hidden" animate="show" transition={{ delay: 0.07 }}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle>Step 3: Scoring Configuration</CardTitle>
                <CardDescription>Mandatory default weights are preloaded. You can adjust and recalculate.</CardDescription>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setWeights(DEFAULT_WEIGHTS)}>
                <Settings2 className="h-4 w-4" />
                Reset Defaults
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-5">
            <WeightInput
              label="Skills Match"
              value={weights.skillsMatch}
              onChange={(value) => setWeights((prev) => ({ ...prev, skillsMatch: value }))}
            />
            <WeightInput
              label="Experience Relevance"
              value={weights.experienceRelevance}
              onChange={(value) => setWeights((prev) => ({ ...prev, experienceRelevance: value }))}
            />
            <WeightInput
              label="Education & Certs"
              value={weights.educationCerts}
              onChange={(value) => setWeights((prev) => ({ ...prev, educationCerts: value }))}
            />
            <WeightInput
              label="Project / Portfolio"
              value={weights.projectPortfolio}
              onChange={(value) => setWeights((prev) => ({ ...prev, projectPortfolio: value }))}
            />
            <WeightInput
              label="Communication Quality"
              value={weights.communicationQuality}
              onChange={(value) => setWeights((prev) => ({ ...prev, communicationQuality: value }))}
            />
          </CardContent>
        </Card>
      </motion.section>

      <motion.section variants={stepMotion} initial="hidden" animate="show" transition={{ delay: 0.1 }}>
        <Card>
          <CardHeader>
            <CardTitle>Step 4: Ranked Shortlist</CardTitle>
            <CardDescription>Search and filter candidates, then open details for explainability and overrides.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  className="pl-9"
                  placeholder="Search candidate"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <Select
                value={recommendationFilter}
                onChange={(event) => setRecommendationFilter(event.target.value as Recommendation | "All")}
              >
                <option value="All">All Recommendations</option>
                <option value="Strong Shortlist">Strong Shortlist</option>
                <option value="Shortlist">Shortlist</option>
                <option value="Review Manually">Review Manually</option>
                <option value="Not Recommended">Not Recommended</option>
              </Select>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                Candidates shown: <span className="font-semibold text-slate-900">{filteredEvaluations.length}</span>
              </div>
            </div>

            {run?.evaluations?.length ? (
              <RankedTable evaluations={filteredEvaluations} onOpenDetails={setActiveCandidateId} />
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                No evaluation results yet. Parse inputs and run AI evaluation to generate rankings.
              </div>
            )}
          </CardContent>
        </Card>
      </motion.section>

      {run?.evaluations?.length ? (
        <>
          <AnalyticsPanel analytics={analytics} />
          <CandidateComparison evaluations={run.evaluations} />

          <div className="grid gap-5 xl:grid-cols-3">
            <ReportDownloadCard runId={run.id} />
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle>Responsible AI & Methodology Snapshot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-700">
                <p>
                  This assistant recommends candidate shortlists with transparent scoring but does not make final
                  hiring decisions. Human recruiter review is mandatory.
                </p>
                <div className="flex flex-wrap gap-2">
                  <RecommendationBadge recommendation="Strong Shortlist" />
                  <RecommendationBadge recommendation="Shortlist" />
                  <RecommendationBadge recommendation="Review Manually" />
                  <RecommendationBadge recommendation="Not Recommended" />
                </div>
                <p>
                  Sensitive attributes are detected only for warning and never included in score computation. All
                  overrides are logged with old/new values and timestamps for auditability.
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}

      {run ? (
        <CandidateDetailModal
          open={Boolean(activeCandidateId)}
          onClose={() => setActiveCandidateId(null)}
          runId={run.id}
          jd={run.jd}
          candidate={selectedCandidate}
          evaluation={selectedEvaluation}
          overrideHistory={run.overrideHistory}
          recruiterNotes={run.recruiterNotes}
          onApplyOverride={handleApplyOverride}
          onAddNote={handleAddNote}
        />
      ) : null}
    </div>
  );
}

function ParsedJdCard({ run }: { run: EvaluationRun }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-lg font-semibold text-slate-900">{run.jd.roleTitle}</h3>
      <p className="text-sm text-slate-600">
        Domain: {run.jd.domainIndustry} | Min Experience: {run.jd.minimumExperienceYears} years
      </p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <KeyList title="Required Skills" values={run.jd.requiredSkills} />
        <KeyList title="Preferred Skills" values={run.jd.preferredSkills} />
        <KeyList title="Education Requirements" values={run.jd.educationRequirements} />
        <KeyList title="Certifications" values={run.jd.certifications} />
        <KeyList title="Responsibilities" values={run.jd.responsibilities} />
        <KeyList title="Nice-to-have" values={run.jd.niceToHaveQualifications} />
      </div>
    </div>
  );
}

function KeyList({ title, values }: { title: string; values: string[] }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      {values.length ? (
        <div className="flex flex-wrap gap-2">
          {values.map((value) => (
            <Badge key={`${title}-${value}`}>{value}</Badge>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-500">Not identified</p>
      )}
    </div>
  );
}

function WeightInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs uppercase tracking-wide text-slate-500">{label}</Label>
      <Input
        type="number"
        value={value}
        min={0}
        max={1}
        step={0.01}
        onChange={(event) => onChange(Number.parseFloat(event.target.value || "0"))}
      />
    </div>
  );
}
