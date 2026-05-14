import { v4 as uuidv4 } from "uuid";

import { JobDescriptionParsed } from "@/lib/types";
import { extractSkillsFromText, normalizeSkills } from "@/lib/utils/skill-normalizer";
import { cleanText, parseYearsOfExperience, safeSplitLines } from "@/lib/utils/text";

const SECTION_HINTS: Record<string, string[]> = {
  requiredSkills: ["required skills", "must have", "requirements", "core skills"],
  preferredSkills: ["preferred skills", "nice to have", "good to have", "bonus skills"],
  responsibilities: ["responsibilities", "what you'll do", "role overview", "duties"],
  educationRequirements: ["education", "qualification", "degree"],
  certifications: ["certification", "certifications", "certified"],
};

const DOMAIN_KEYWORDS: Record<string, string[]> = {
  "HR Tech": ["hr", "talent", "recruit", "hiring"],
  FinTech: ["fintech", "bank", "payment", "finance"],
  "Health Tech": ["health", "care", "medical", "clinical"],
  ECommerce: ["ecommerce", "marketplace", "retail", "shopping"],
  "AI / SaaS": ["ai", "machine learning", "llm", "saas", "software"],
};

function extractRoleTitle(text: string): string {
  const lines = safeSplitLines(text);
  const titleLine =
    lines.find((line) => /^(job title|role|position)\s*:/i.test(line)) ??
    lines.find((line) =>
      /(engineer|developer|manager|scientist|architect|analyst|lead|specialist)/i.test(line)
    ) ??
    "Unknown Role";

  return titleLine.replace(/^(job title|role|position)\s*:/i, "").trim();
}

function extractSectionLines(text: string, hints: string[]): string[] {
  const lines = safeSplitLines(text);
  const collected: string[] = [];
  let active = false;

  for (const line of lines) {
    const lower = line.toLowerCase();
    const isHint = hints.some((hint) => lower.includes(hint));
    const looksLikeNewSection = /^(about|requirements|responsibilities|skills|education|certification|nice to have)/i.test(
      lower
    );

    if (isHint) {
      active = true;
      continue;
    }

    if (active && looksLikeNewSection && !isHint) {
      active = false;
    }

    if (active) {
      const cleaned = line.replace(/^[-*•]\s*/, "").trim();
      if (cleaned.length > 2) {
        collected.push(cleaned);
      }
    }
  }

  return collected;
}

function inferDomain(text: string): string {
  const lower = text.toLowerCase();
  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    if (keywords.some((keyword) => lower.includes(keyword))) {
      return domain;
    }
  }
  return "General Technology";
}

function extractMinExperience(text: string): number {
  const explicitRange = text.match(/(\d+)\s*[-to]+\s*(\d+)\s*(?:years|yrs)/i);
  if (explicitRange) {
    return Number.parseInt(explicitRange[1] ?? "0", 10);
  }

  const minimumLine = safeSplitLines(text).find((line) => /minimum.*(years|yrs)/i.test(line));
  if (minimumLine) {
    const number = minimumLine.match(/(\d+)/)?.[1];
    return Number.parseInt(number ?? "0", 10);
  }

  return parseYearsOfExperience(text);
}

function normalizeBullets(values: string[]): string[] {
  return Array.from(
    new Set(
      values
        .flatMap((line) => line.split(/[,;|]/g))
        .map((line) => cleanText(line))
        .filter((line) => line.length > 2)
    )
  );
}

export function parseJobDescription(rawText: string): JobDescriptionParsed {
  const roleTitle = extractRoleTitle(rawText);
  const extractedSkills = extractSkillsFromText(rawText);

  const requiredSkillLines = extractSectionLines(rawText, SECTION_HINTS.requiredSkills);
  const preferredSkillLines = extractSectionLines(rawText, SECTION_HINTS.preferredSkills);

  const requiredSkills = normalizeSkills([
    ...requiredSkillLines.flatMap((line) => line.split(/[,;|]/g)),
    ...extractedSkills.slice(0, 12),
  ]);
  const preferredSkills = normalizeSkills(
    preferredSkillLines.flatMap((line) => line.split(/[,;|]/g))
  );

  const educationRequirements = normalizeBullets(
    extractSectionLines(rawText, SECTION_HINTS.educationRequirements)
  );
  const certifications = normalizeBullets(
    extractSectionLines(rawText, SECTION_HINTS.certifications)
  );
  const responsibilities = normalizeBullets(
    extractSectionLines(rawText, SECTION_HINTS.responsibilities)
  );
  const niceToHaveQualifications = normalizeBullets(
    extractSectionLines(rawText, ["nice to have", "bonus", "plus points"])
  );

  return {
    id: uuidv4(),
    rawText,
    roleTitle,
    requiredSkills,
    preferredSkills,
    minimumExperienceYears: extractMinExperience(rawText),
    domainIndustry: inferDomain(rawText),
    educationRequirements,
    certifications,
    responsibilities,
    niceToHaveQualifications,
    parsedAt: new Date().toISOString(),
  };
}
