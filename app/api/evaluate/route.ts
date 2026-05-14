import { NextResponse } from "next/server";

import { isAIEnhancementEnabled, maybeEnhanceEvaluation } from "@/lib/ai/provider";
import { buildDashboardAnalytics } from "@/lib/scoring/analytics";
import { rankCandidates } from "@/lib/scoring/evaluator";
import { createEvaluationRun, getEvaluationRun, saveEvaluationRun } from "@/lib/store/session-store";
import { DEFAULT_WEIGHTS, EvaluationRun } from "@/lib/types";
import { evaluateRequestSchema } from "@/lib/types/schemas";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const payload = evaluateRequestSchema.parse(json);
    const weights = payload.weights ?? DEFAULT_WEIGHTS;
    const deterministic = rankCandidates(payload.jd, payload.candidates, weights);
    const useAiEnhancement = payload.useAiEnhancement ?? true;

    const enhanced = useAiEnhancement
      ? await Promise.all(
          deterministic.map(async (evaluation) => {
            const candidate = payload.candidates.find((item) => item.id === evaluation.candidateId);
            if (!candidate) return evaluation;
            return maybeEnhanceEvaluation(payload.jd, candidate, evaluation);
          })
        )
      : deterministic;

    const evaluations = [...enhanced].sort((a, b) => b.totalScore - a.totalScore);

    let run: EvaluationRun;
    if (payload.runId) {
      const existing = await getEvaluationRun(payload.runId);
      if (existing) {
        run = await saveEvaluationRun({
          ...existing,
          jd: payload.jd,
          candidates: payload.candidates,
          evaluations,
          weights,
        });
      } else {
        run = await createEvaluationRun({
          jd: payload.jd,
          candidates: payload.candidates,
          evaluations,
          overrideHistory: [],
          recruiterNotes: [],
          weights,
        });
      }
    } else {
      run = await createEvaluationRun({
        jd: payload.jd,
        candidates: payload.candidates,
        evaluations,
        overrideHistory: [],
        recruiterNotes: [],
        weights,
      });
    }

    return NextResponse.json({
      run,
      analytics: buildDashboardAnalytics(run),
      aiEnhancementEnabled: isAIEnhancementEnabled(),
    });
  } catch (error) {
    console.error("Evaluation error", error);
    return NextResponse.json({ error: "Failed to evaluate candidates." }, { status: 500 });
  }
}
