import { NextResponse } from "next/server";

import { buildDashboardAnalytics } from "@/lib/scoring/analytics";
import { recalculateWithOverrides } from "@/lib/scoring/evaluator";
import { appendOverrideLog, getEvaluationRun, saveEvaluationRun } from "@/lib/store/session-store";
import { DEFAULT_WEIGHTS } from "@/lib/types";
import { overrideRequestSchema } from "@/lib/types/schemas";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = overrideRequestSchema.parse(body);
    const run = await getEvaluationRun(payload.runId);

    if (!run) {
      return NextResponse.json({ error: "Evaluation run not found." }, { status: 404 });
    }

    const targetIndex = run.evaluations.findIndex(
      (evaluation) => evaluation.candidateId === payload.candidateId
    );
    if (targetIndex === -1) {
      return NextResponse.json({ error: "Candidate evaluation not found." }, { status: 404 });
    }

    const target = { ...run.evaluations[targetIndex] };
    const oldRecommendation = target.recommendation;
    const oldTotalScore = target.totalScore;
    const oldRawScore = payload.dimensionKey
      ? target.dimensionScores[payload.dimensionKey].rawScore
      : undefined;

    if (payload.dimensionKey && typeof payload.newRawScore === "number") {
      target.dimensionScores[payload.dimensionKey].rawScore = payload.newRawScore;
      const weight = run.weights[payload.dimensionKey] ?? DEFAULT_WEIGHTS[payload.dimensionKey];
      target.dimensionScores[payload.dimensionKey].weightedContribution = Number(
        (payload.newRawScore * weight * 10).toFixed(2)
      );
    }

    let recalculated = recalculateWithOverrides(target, run.weights);
    if (payload.newRecommendation) {
      recalculated = {
        ...recalculated,
        recommendation: payload.newRecommendation,
      };
    }

    run.evaluations[targetIndex] = recalculated;
    run.evaluations.sort((a, b) => b.totalScore - a.totalScore);

    const saved = await saveEvaluationRun(run);
    const overrideResult = await appendOverrideLog(payload.runId, {
      candidateId: payload.candidateId,
      reason: payload.reason,
      dimensionKey: payload.dimensionKey,
      oldRawScore,
      newRawScore: payload.newRawScore,
      oldRecommendation,
      newRecommendation: recalculated.recommendation,
      oldTotalScore,
      newTotalScore: recalculated.totalScore,
    });

    const latestRun = overrideResult?.run ?? saved;

    return NextResponse.json({
      run: latestRun,
      analytics: buildDashboardAnalytics(latestRun),
      override: overrideResult?.override,
    });
  } catch (error) {
    console.error("Override error", error);
    return NextResponse.json({ error: "Failed to apply override." }, { status: 500 });
  }
}
