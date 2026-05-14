import { NextResponse } from "next/server";

import { buildReportFileName } from "@/lib/reporting/generate-report";
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

  return new NextResponse(JSON.stringify(run, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${buildReportFileName("hirewise-report")}.json"`,
    },
  });
}
