import { NextResponse } from "next/server";

import { buildDashboardAnalytics } from "@/lib/scoring/analytics";
import { appendRecruiterNote } from "@/lib/store/session-store";
import { noteRequestSchema } from "@/lib/types/schemas";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = noteRequestSchema.parse(body);
    const result = await appendRecruiterNote(payload.runId, {
      candidateId: payload.candidateId,
      note: payload.note,
    });

    if (!result) {
      return NextResponse.json({ error: "Evaluation run not found." }, { status: 404 });
    }

    return NextResponse.json({
      run: result.run,
      analytics: buildDashboardAnalytics(result.run),
      note: result.note,
    });
  } catch (error) {
    console.error("Note error", error);
    return NextResponse.json({ error: "Failed to save recruiter note." }, { status: 500 });
  }
}
