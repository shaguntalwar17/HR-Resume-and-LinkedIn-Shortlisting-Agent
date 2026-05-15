"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Candidate = {
  id: string;
  fullName: string;
  currentTitle?: string | null;
  currentCompany?: string | null;
  experienceYears: number;
  location?: string | null;
  skills: string[];
  status?: string;
  updatedAt: string;
};

type CandidateTimelineEvent = {
  id: string;
  action: string;
  entityType: string;
  createdAt: string;
  actor?: { name?: string | null } | null;
};

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [linkedInJson, setLinkedInJson] = useState("");
  const [search, setSearch] = useState("");
  const [skillFilter, setSkillFilter] = useState("");
  const [progressMessage, setProgressMessage] = useState("");
  const [activeTimelineCandidateId, setActiveTimelineCandidateId] = useState<string | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<CandidateTimelineEvent[]>([]);
  const [timelineBusy, setTimelineBusy] = useState(false);

  async function fetchCandidates(options?: { showLoading?: boolean }) {
    if (options?.showLoading ?? true) {
      setLoading(true);
    }
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (skillFilter) params.set("skill", skillFilter);
      const response = await fetch(`/api/candidates?${params.toString()}`);
      const data = await response.json();
      setCandidates(data.candidates ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function loadInitialCandidates() {
      try {
        const response = await fetch("/api/candidates");
        const data = await response.json();
        if (active) {
          setCandidates(data.candidates ?? []);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadInitialCandidates();
    return () => {
      active = false;
    };
  }, []);

  async function uploadCandidates() {
    setUploading(true);
    setProgressMessage("Uploading and parsing candidate files...");
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("resumeFiles", file));
      formData.append("linkedInJson", linkedInJson);

      const response = await fetch("/api/candidates/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Candidate upload failed.");
      }

      const createdCount = data.createdCandidates?.length ?? 0;
      const failedCount = data.failedFiles?.length ?? 0;
      toast.success(`Created ${createdCount} candidate profiles.`);
      if (failedCount) {
        toast.warning(`${failedCount} files failed. Review parsing notes.`);
      }
      setFiles([]);
      setLinkedInJson("");
      await fetchCandidates({ showLoading: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Candidate upload failed.");
    } finally {
      setUploading(false);
      setProgressMessage("");
    }
  }

  const visibleCandidates = useMemo(() => {
    return candidates.filter((candidate) => {
      const matchesSearch = candidate.fullName.toLowerCase().includes(search.toLowerCase());
      const matchesSkill = !skillFilter
        ? true
        : candidate.skills.some((skill) => skill.toLowerCase().includes(skillFilter.toLowerCase()));
      return matchesSearch && matchesSkill;
    });
  }, [candidates, search, skillFilter]);

  async function loadTimeline(candidateId: string) {
    if (activeTimelineCandidateId === candidateId) {
      setActiveTimelineCandidateId(null);
      setTimelineEvents([]);
      return;
    }

    setTimelineBusy(true);
    try {
      const response = await fetch(`/api/candidates/${candidateId}/timeline`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load candidate timeline.");
      }
      setActiveTimelineCandidateId(candidateId);
      setTimelineEvents(data.events ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load timeline.");
    } finally {
      setTimelineBusy(false);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-3">
      <Card className="xl:col-span-1">
        <CardHeader>
          <CardTitle>Candidate Upload</CardTitle>
          <CardDescription>
            Upload resumes in batch and enrich profiles with LinkedIn JSON.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
            <Label className="mb-2 block">Resume Files (PDF, DOCX, TXT)</Label>
            <Input
              type="file"
              multiple
              accept=".pdf,.docx,.txt"
              onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
            />
            <div className="mt-2 space-y-1 text-xs text-slate-600">
              {files.length ? files.map((file) => <p key={file.name}>{file.name}</p>) : <p>No files selected.</p>}
            </div>
          </div>
          <div>
            <Label className="mb-2 block">LinkedIn JSON (Optional)</Label>
            <Textarea
              className="min-h-[140px]"
              value={linkedInJson}
              onChange={(event) => setLinkedInJson(event.target.value)}
              placeholder='{"name":"Candidate","skills":["React","Node.js"]}'
            />
          </div>
          <Button
            className="w-full"
            onClick={uploadCandidates}
            disabled={uploading || (!files.length && !linkedInJson.trim())}
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
            Upload and Parse
          </Button>
          {progressMessage ? <p className="text-xs text-slate-500">{progressMessage}</p> : null}
        </CardContent>
      </Card>

      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle>Candidate Directory</CardTitle>
          <CardDescription>Search, filter, and inspect parsed candidate records.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <Input placeholder="Search candidate by name" value={search} onChange={(event) => setSearch(event.target.value)} />
            <Input placeholder="Filter by skill" value={skillFilter} onChange={(event) => setSkillFilter(event.target.value)} />
          </div>

          {loading ? (
            <div className="rounded-xl border border-slate-200 p-6 text-sm text-slate-500">
              <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
              Loading candidates...
            </div>
          ) : visibleCandidates.length ? (
            visibleCandidates.map((candidate) => (
              <div key={candidate.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">{candidate.fullName}</h3>
                    <p className="text-sm text-slate-600">
                      {candidate.currentTitle ?? "Role not set"}
                      {candidate.currentCompany ? ` at ${candidate.currentCompany}` : ""}
                    </p>
                    <p className="text-xs text-slate-500">
                      Experience: {candidate.experienceYears} years | Last updated:{" "}
                      {new Date(candidate.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="info">{candidate.skills.length} skills</Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {candidate.skills.slice(0, 10).map((skill) => (
                    <Badge key={`${candidate.id}-${skill}`}>{skill}</Badge>
                  ))}
                </div>
                <div className="mt-3">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => loadTimeline(candidate.id)}
                    disabled={timelineBusy && activeTimelineCandidateId !== candidate.id}
                  >
                    {activeTimelineCandidateId === candidate.id ? "Hide Timeline" : "View Timeline"}
                  </Button>
                </div>
                {activeTimelineCandidateId === candidate.id ? (
                  <div className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Candidate Timeline
                    </p>
                    {timelineEvents.length ? (
                      timelineEvents.slice(0, 10).map((event) => (
                        <p key={event.id} className="text-xs text-slate-700">
                          {new Date(event.createdAt).toLocaleString()} - {event.action} ({event.entityType}) by{" "}
                          {event.actor?.name ?? "System"}
                        </p>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500">No timeline events recorded yet.</p>
                    )}
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
              No candidate profiles found.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
