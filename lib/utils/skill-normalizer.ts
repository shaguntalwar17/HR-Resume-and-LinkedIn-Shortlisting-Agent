const SKILL_SYNONYMS: Record<string, string> = {
  js: "javascript",
  "react.js": "react",
  "node.js": "node",
  "next.js": "nextjs",
  "next js": "nextjs",
  "typescript/javascript": "typescript",
  "py": "python",
  "gen ai": "generative ai",
  "llms": "llm",
  "large language models": "llm",
  "postgresql": "postgres",
  "tailwind css": "tailwind",
  "ci/cd": "cicd",
  "ci cd": "cicd",
  "k8s": "kubernetes",
  "gcp": "google cloud",
  aws: "amazon web services",
  "nlp/ml": "machine learning",
};

export const SKILL_DICTIONARY = [
  "javascript",
  "typescript",
  "react",
  "nextjs",
  "node",
  "python",
  "sql",
  "postgres",
  "mongodb",
  "docker",
  "kubernetes",
  "amazon web services",
  "google cloud",
  "azure",
  "openai",
  "prompt engineering",
  "rag",
  "langchain",
  "langgraph",
  "machine learning",
  "data analysis",
  "product strategy",
  "stakeholder management",
  "roadmapping",
  "a/b testing",
  "analytics",
  "figma",
  "communication",
  "leadership",
  "tailwind",
  "cicd",
  "testing",
  "system design",
  "api design",
  "microservices",
  "redis",
  "grpc",
  "go",
  "java",
  "scala",
  "tensorflow",
  "pytorch",
  "llm",
  "generative ai",
];

function normalizeToken(value: string): string {
  const token = value.trim().toLowerCase().replace(/\./g, "");
  return SKILL_SYNONYMS[token] ?? token;
}

export function normalizeSkills(skills: string[]): string[] {
  const normalized = skills
    .map((skill) => normalizeToken(skill))
    .filter(Boolean)
    .map((skill) => skill.replace(/\s+/g, " "));

  return Array.from(new Set(normalized));
}

export function extractSkillsFromText(text: string): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];

  for (const rawSkill of SKILL_DICTIONARY) {
    const skill = normalizeToken(rawSkill);
    const pattern = new RegExp(`\\b${rawSkill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (pattern.test(lower)) {
      found.push(skill);
    }
  }

  const aliasMatches = Object.keys(SKILL_SYNONYMS).filter((alias) => {
    const pattern = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    return pattern.test(lower);
  });

  aliasMatches.forEach((alias) => found.push(SKILL_SYNONYMS[alias]));

  return normalizeSkills(found);
}

export function computeSkillMatch(
  requiredSkills: string[],
  candidateSkills: string[]
): {
  matchedSkills: string[];
  missingSkills: string[];
  matchPercentage: number;
} {
  const required = normalizeSkills(requiredSkills);
  const candidate = normalizeSkills(candidateSkills);
  const candidateSet = new Set(candidate);

  const matched = required.filter((skill) => candidateSet.has(normalizeToken(skill)));
  const missing = required.filter((skill) => !candidateSet.has(normalizeToken(skill)));
  const matchPercentage =
    required.length === 0 ? 100 : Math.round((matched.length / required.length) * 100);

  return {
    matchedSkills: matched,
    missingSkills: missing,
    matchPercentage,
  };
}
