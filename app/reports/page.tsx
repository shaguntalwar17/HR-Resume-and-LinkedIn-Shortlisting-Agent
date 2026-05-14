"use client";

import { useEffect, useState } from "react";
import { Download, FileCode2, FileJson2, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";

type Job = {
  id: string;
  title: string;
  department?: string | null;
  location?: string | null;
  status: string;
};

const reportTypes = [
  { value: "JSON", label: "JSON", icon: FileJson2 },
  { value: "HTML", label: "HTML", icon: FileCode2 },
  { value: "PDF", label: "PDF", icon: FileText },
] as const;

function toFileSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export default function ReportsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [downloadingType, setDownloadingType] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/jobs");
      const data = await response.json();
      setJobs(data.jobs ?? []);
      if (data.jobs?.length) {
        setSelectedJobId(data.jobs[0].id);
      }
    })();
  }, []);

  const selectedJob = jobs.find((job) => job.id === selectedJobId);

  async function downloadReport(type: "JSON" | "HTML" | "PDF") {
    if (!selectedJobId) return;
    setDownloadingType(type);
    try {
      const response = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: selectedJobId,
          type,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error ?? "Report generation failed.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const extension = type.toLowerCase();
      const fileBaseName = toFileSlug(selectedJob?.title ?? "hirewise-report") || "hirewise-report";
      link.download = `${fileBaseName}.${extension}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success(`${type} report downloaded.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Report download failed.");
    } finally {
      setDownloadingType(null);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-3">
      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle>Report Generator</CardTitle>
          <CardDescription>
            Export comprehensive recruiter-friendly reports including methodology, ranking, overrides, and responsible AI notes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Select Job Requisition</p>
            <Select value={selectedJobId} onChange={(event) => setSelectedJobId(event.target.value)}>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title} ({job.status})
                </option>
              ))}
            </Select>
          </div>

          {selectedJob ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-lg font-semibold text-slate-900">{selectedJob.title}</h3>
              <p className="text-sm text-slate-600">
                {selectedJob.department ?? "General"} | {selectedJob.location ?? "Flexible location"}
              </p>
              <div className="mt-2">
                <Badge variant={selectedJob.status === "ACTIVE" ? "success" : "default"}>
                  {selectedJob.status}
                </Badge>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
              No jobs available. Create a requisition first to generate reports.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Download Formats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {reportTypes.map((entry) => {
            const Icon = entry.icon;
            return (
              <Button
                key={entry.value}
                className="w-full justify-between"
                variant="secondary"
                onClick={() => downloadReport(entry.value)}
                disabled={!selectedJobId || downloadingType !== null}
              >
                <span className="inline-flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {entry.label} report
                </span>
                {downloadingType === entry.value ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </Button>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
