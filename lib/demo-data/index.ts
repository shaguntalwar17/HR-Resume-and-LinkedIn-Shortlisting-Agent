import { parseJobDescription } from "@/lib/parsers/jd-parser";
import { rankCandidates } from "@/lib/scoring/evaluator";
import { DEFAULT_WEIGHTS, EvaluationRun } from "@/lib/types";

import { getDemoCandidates } from "./sample-candidates";
import { demoJobDescriptionText } from "./sample-jd";

export function buildDemoEvaluationRun(): Omit<EvaluationRun, "id" | "createdAt" | "updatedAt"> {
  const jd = parseJobDescription(demoJobDescriptionText);
  const candidates = getDemoCandidates();
  const evaluations = rankCandidates(jd, candidates, DEFAULT_WEIGHTS);

  return {
    jd,
    candidates,
    evaluations,
    overrideHistory: [],
    recruiterNotes: [],
    weights: DEFAULT_WEIGHTS,
  };
}

export { demoJobDescriptionText };
