import { parseCandidateFromResumeText, parseCandidateFromLinkedInJson } from "@/lib/parsers/candidate-parser";
import { parseJDText } from "@/lib/parsers/jd-parser";
import { evaluateCandidate, rankCandidates } from "@/lib/scoring/evaluator";
import { maybeEnhanceEvaluation } from "@/lib/ai/provider";

/**
 * AI Agent Architecture Core
 * Organized modules handling the end-to-end recruitment evaluation workflow.
 */

export const JDParsingAgent = {
  parse: parseJDText,
};

export const ResumeParsingAgent = {
  parse: parseCandidateFromResumeText,
};

export const LinkedInParsingAgent = {
  parse: parseCandidateFromLinkedInJson,
};

export const RubricScoringAgent = {
  evaluate: evaluateCandidate,
};

export const ExplanationGenerationAgent = {
  enhance: maybeEnhanceEvaluation,
};

export const RankingAgent = {
  rank: rankCandidates,
};

// Orchestrator service to tie agents together
export const CandidateEvaluationService = {
  async processCandidate(jd: Record<string, unknown>, candidateText: string, sourceName: string, sourceType: "resume" | "linkedin" = "resume") {
    // 1. Parse
    const candidate = ResumeParsingAgent.parse(candidateText, sourceName, sourceType);
    
    // 2. Score deterministically via Rubric
    const baseEvaluation = RubricScoringAgent.evaluate(jd, candidate);
    
    // 3. Generate natural language explanations
    const finalEvaluation = await ExplanationGenerationAgent.enhance(jd, candidate, baseEvaluation);
    
    return { candidate, evaluation: finalEvaluation };
  }
};
