"use client";

import { useState } from "react";
import { Download, FileCode2, FileJson2, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ReportDownloadCardProps {
  runId?: string; // Kept for backwards compatibility just in case, but unused
  jobId?: string;
}

export function ReportDownloadCard({ jobId }: ReportDownloadCardProps) {
  const [downloadingType, setDownloadingType] = useState<string | null>(null);

  const reportTypes = [
    { value: "JSON", label: "JSON", icon: FileJson2 },
    { value: "HTML", label: "HTML", icon: FileCode2 },
    { value: "PDF", label: "PDF", icon: FileText },
  ] as const;

  async function downloadReport(type: "JSON" | "HTML" | "PDF") {
    if (!jobId) {
      toast.error("Job ID is required to generate reports.");
      return;
    }
    
    setDownloadingType(type);
    try {
      const response = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, type }),
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
      link.download = `hirewise-report-${jobId}.${extension}`;
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
    <Card>
      <CardHeader>
        <CardTitle>Export Reports</CardTitle>
        <CardDescription>Download full evaluation artifacts for audit and sharing.</CardDescription>
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
              disabled={!jobId || downloadingType !== null}
            >
              <span className="inline-flex items-center gap-2">
                <Icon className="h-4 w-4" />
                Download {entry.label} Report
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
  );
}
