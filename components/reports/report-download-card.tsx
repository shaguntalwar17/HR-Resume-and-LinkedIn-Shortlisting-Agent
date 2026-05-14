"use client";

import { Download, FileCode2, FileJson2, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ReportDownloadCardProps {
  runId: string;
}

export function ReportDownloadCard({ runId }: ReportDownloadCardProps) {
  const reportLinks = [
    { label: "Download JSON Report", href: `/api/reports/json?runId=${runId}`, icon: FileJson2 },
    { label: "Download HTML Report", href: `/api/reports/html?runId=${runId}`, icon: FileCode2 },
    { label: "Download PDF Report", href: `/api/reports/pdf?runId=${runId}`, icon: FileText },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Export Reports</CardTitle>
        <CardDescription>Download full evaluation artifacts for audit and sharing.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {reportLinks.map((item) => {
          const Icon = item.icon;
          return (
            <a key={item.href} href={item.href}>
              <Button className="w-full justify-between" variant="secondary">
                <span className="inline-flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {item.label}
                </span>
                <Download className="h-4 w-4" />
              </Button>
            </a>
          );
        })}
      </CardContent>
    </Card>
  );
}
