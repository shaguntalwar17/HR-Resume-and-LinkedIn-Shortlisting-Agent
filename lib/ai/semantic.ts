import { normalizeSkills } from "@/lib/utils/skill-normalizer";

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

function jaccardSimilarity(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = [...setA].filter((item) => setB.has(item)).length;
  const union = new Set([...setA, ...setB]).size;
  if (union === 0) return 0;
  return intersection / union;
}

function cosineSimilarity(a: number[], b: number[]) {
  const length = Math.min(a.length, b.length);
  let dot = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let index = 0; index < length; index += 1) {
    dot += a[index] * b[index];
    magnitudeA += a[index] * a[index];
    magnitudeB += b[index] * b[index];
  }

  if (!magnitudeA || !magnitudeB) {
    return 0;
  }

  return dot / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
}

async function fetchEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.OPENAI_API_KEY ?? process.env.AI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.EMBEDDING_MODEL ?? "text-embedding-3-small";
  const baseUrl = process.env.AI_BASE_URL ?? "https://api.openai.com/v1";

  try {
    const response = await fetch(`${baseUrl}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: text.slice(0, 7000),
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      data?: Array<{ embedding?: number[] }>;
    };

    return data.data?.[0]?.embedding ?? null;
  } catch {
    return null;
  }
}

export async function calculateSemanticMatchScore(
  jdText: string,
  candidateText: string,
  jdSkills: string[],
  candidateSkills: string[]
) {
  const embeddingEnabled = (process.env.ENABLE_SEMANTIC_EMBEDDINGS ?? "false").toLowerCase() === "true";

  if (embeddingEnabled) {
    const [jdVector, candidateVector] = await Promise.all([
      fetchEmbedding(jdText),
      fetchEmbedding(candidateText),
    ]);
    if (jdVector && candidateVector) {
      return Number((Math.max(0, cosineSimilarity(jdVector, candidateVector)) * 100).toFixed(2));
    }
  }

  const tokenScore = jaccardSimilarity(tokenize(jdText), tokenize(candidateText));
  const normalizedJdSkills = normalizeSkills(jdSkills);
  const normalizedCandidateSkills = normalizeSkills(candidateSkills);
  const skillScore = jaccardSimilarity(normalizedJdSkills, normalizedCandidateSkills);

  return Number((((tokenScore * 0.6 + skillScore * 0.4) * 100)).toFixed(2));
}
