import { NextResponse } from "next/server";

import { getEvaluationRun, listEvaluationRuns } from "@/lib/store/session-store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const runId = searchParams.get("runId");

  if (runId) {
    const run = await getEvaluationRun(runId);
    if (!run) {
      return NextResponse.json({ error: "Run not found." }, { status: 404 });
    }
    return NextResponse.json({ run });
  }

  const runs = await listEvaluationRuns();
  return NextResponse.json({ runs });
}
