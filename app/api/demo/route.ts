import { NextResponse } from "next/server";

import { isDemoModeEnabled } from "@/lib/config/server-env";
import { buildDemoEvaluationRun } from "@/lib/demo-data";
import { buildDashboardAnalytics } from "@/lib/scoring/analytics";
import { createEvaluationRun } from "@/lib/store/session-store";

export const runtime = "nodejs";

export async function POST() {
  try {
    if (!isDemoModeEnabled()) {
      return NextResponse.json(
        { error: "Demo mode is disabled for this environment." },
        { status: 403 }
      );
    }

    const demo = buildDemoEvaluationRun();
    const run = await createEvaluationRun(demo);
    return NextResponse.json({
      run,
      analytics: buildDashboardAnalytics(run),
      message: "Demo data loaded successfully.",
    });
  } catch (error) {
    console.error("Demo load error", error);
    return NextResponse.json({ error: "Failed to load demo data." }, { status: 500 });
  }
}
