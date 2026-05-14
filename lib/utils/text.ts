const EMAIL_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE_REGEX =
  /(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/;

export function safeSplitLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function toSentenceCase(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function clamp(num: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, num));
}

export function cleanText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function extractEmail(text: string): string | undefined {
  return text.match(EMAIL_REGEX)?.[0];
}

export function extractPhone(text: string): string | undefined {
  return text.match(PHONE_REGEX)?.[0];
}

export function extractFirstNameLikeLine(text: string): string {
  const lines = safeSplitLines(text);
  const firstLine = lines[0] ?? "Unknown Candidate";
  return firstLine
    .replace(/resume|curriculum vitae|cv/gi, "")
    .replace(/[|_]+/g, " ")
    .trim()
    .slice(0, 80);
}

export function containsAny(text: string, patterns: string[]): boolean {
  const lower = text.toLowerCase();
  return patterns.some((pattern) => lower.includes(pattern.toLowerCase()));
}

export function extractEvidenceSnippet(
  text: string,
  keywords: string[],
  fallback = "No direct evidence snippet detected."
): string {
  const lines = safeSplitLines(text);
  const lowerKeywords = keywords.map((k) => k.toLowerCase());

  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    if (lowerKeywords.some((keyword) => lowerLine.includes(keyword))) {
      return line.slice(0, 180);
    }
  }

  return fallback;
}

export function parseYearsOfExperience(text: string): number {
  const lower = text.toLowerCase();
  const yearMatches = [
    ...lower.matchAll(/(\d+(?:\.\d+)?)\s*\+?\s*(?:years|yrs)\b/g),
  ];

  if (!yearMatches.length) {
    return 0;
  }

  return Math.max(
    ...yearMatches
      .map((match) => Number.parseFloat(match[1] ?? "0"))
      .filter((num) => Number.isFinite(num))
  );
}
