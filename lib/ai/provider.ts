import {
  CandidateEvaluation,
  CandidateProfile,
  JobDescriptionParsed,
  ScoreDimensionKey,
} from "@/lib/types";

interface AIEnhancementResponse {
  confidence?: "High" | "Medium" | "Low";
  recruiterSummary?: string;
  justifications?: Partial<Record<ScoreDimensionKey, string>>;
  riskFlags?: string[];
}

function tryParseJson(text: string): AIEnhancementResponse | null {
  try {
    const parsed = JSON.parse(text) as AIEnhancementResponse;
    return parsed;
  } catch {
    return null;
  }
}

export function isAIEnhancementEnabled(): boolean {
  return Boolean(process.env.OPENAI_API_KEY || process.env.AI_API_KEY);
}

export async function maybeEnhanceEvaluation(
  jd: JobDescriptionParsed,
  candidate: CandidateProfile,
  deterministicEvaluation: CandidateEvaluation
): Promise<CandidateEvaluation> {
  if (!isAIEnhancementEnabled()) {
    return deterministicEvaluation;
  }

  const apiKey = process.env.OPENAI_API_KEY ?? process.env.AI_API_KEY;
  const model = process.env.AI_MODEL ?? "gpt-4o-mini";
  const baseUrl = process.env.AI_BASE_URL ?? "https://api.openai.com/v1";

  if (!apiKey) {
    return deterministicEvaluation;
  }

  try {
    const payload = {
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are an HR evaluation assistant. Return strict JSON with concise justifications, confidence, recruiterSummary, and optional riskFlags. Never use sensitive personal attributes.",
        },
        {
          role: "user",
          content: JSON.stringify({
            jd: {
              roleTitle: jd.roleTitle,
              requiredSkills: jd.requiredSkills,
              preferredSkills: jd.preferredSkills,
              minimumExperienceYears: jd.minimumExperienceYears,
              domainIndustry: jd.domainIndustry,
            },
            candidate: {
              name: candidate.name,
              currentRole: candidate.currentRole,
              totalExperienceYears: candidate.totalExperienceYears,
              skills: candidate.skills,
              education: candidate.education,
              certifications: candidate.certifications,
              projects: candidate.projects,
              summary: candidate.resumeTextSummary,
            },
            deterministicEvaluation,
            outputSchema: {
              confidence: "High | Medium | Low",
              recruiterSummary: "string",
              justifications: {
                skillsMatch: "string",
                experienceRelevance: "string",
                educationCerts: "string",
                projectPortfolio: "string",
                communicationQuality: "string",
              },
              riskFlags: ["string"],
            },
          }),
        },
      ],
    };

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return deterministicEvaluation;
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return deterministicEvaluation;

    const parsed = tryParseJson(content);
    if (!parsed) return deterministicEvaluation;

    const merged = { ...deterministicEvaluation };
    if (parsed.confidence) merged.confidence = parsed.confidence;
    if (parsed.recruiterSummary) merged.recruiterSummary = parsed.recruiterSummary;
    if (parsed.riskFlags?.length) {
      merged.riskFlags = Array.from(new Set([...merged.riskFlags, ...parsed.riskFlags]));
    }

    if (parsed.justifications) {
      (Object.keys(parsed.justifications) as ScoreDimensionKey[]).forEach((key) => {
        const candidateText = parsed.justifications?.[key];
        if (candidateText && merged.dimensionScores[key]) {
          merged.dimensionScores[key].justification = candidateText;
        }
      });
    }

    return merged;
  } catch {
    return deterministicEvaluation;
  }
}
