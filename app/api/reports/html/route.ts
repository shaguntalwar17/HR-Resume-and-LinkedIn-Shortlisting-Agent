import { NextResponse } from "next/server";

import { buildReportFileName, buildReportHtml } from "@/lib/reporting/generate-report";
import { getEvaluationRun } from "@/lib/store/session-store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const runId = searchParams.get("runId");

  if (!runId) {
    return NextResponse.json({ error: "runId is required." }, { status: 400 });
  }

  const run = await getEvaluationRun(runId);
  if (!run) {
    return NextResponse.json({ error: "Run not found." }, { status: 404 });
  }

  const html = buildReportHtml(run);
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${buildReportFileName("hirewise-report")}.html"`,
    },
  });
}
