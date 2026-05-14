import { v4 as uuidv4 } from "uuid";

import {
  CandidateProfile,
  CandidateProject,
  CandidateSource,
  CandidateWorkExperience,
  ParsedLinkedInInput,
} from "@/lib/types";
import { extractSkillsFromText, normalizeSkills } from "@/lib/utils/skill-normalizer";
import {
  cleanText,
  extractEmail,
  extractFirstNameLikeLine,
  extractPhone,
  parseYearsOfExperience,
  safeSplitLines,
} from "@/lib/utils/text";

const ACTION_VERBS = [
  "led",
  "built",
  "shipped",
  "launched",
  "improved",
  "reduced",
  "increased",
  "optimized",
  "designed",
  "implemented",
];

const SENSITIVE_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\b(male|female|gender)\b/i, label: "Gender reference detected" },
  { pattern: /\bmarried|single|marital\b/i, label: "Marital status reference detected" },
  { pattern: /\b\d{2}\s*(years old|yrs old|yo)\b/i, label: "Age reference detected" },
  { pattern: /\breligion|hindu|muslim|christian|sikh\b/i, label: "Religion reference detected" },
  {
    pattern: /\bnationality|citizenship|passport\b/i,
    label: "Nationality/citizenship reference detected",
  },
];

const EDUCATION_HINTS = ["b.tech", "bachelor", "master", "phd", "mba", "degree", "university"];
const CERT_HINTS = ["certified", "certification", "aws", "gcp", "azure", "scrum", "pmp"];

function detectSensitiveInfo(rawText: string): string[] {
  return SENSITIVE_PATTERNS.filter((entry) => entry.pattern.test(rawText)).map(
    (entry) => entry.label
  );
}

function extractCurrentRole(lines: string[]): string {
  const roleLine =
    lines.find((line) =>
      /(engineer|developer|manager|lead|consultant|architect|analyst|specialist)/i.test(line)
    ) ?? "Not specified";
  return cleanText(roleLine);
}

function extractDomain(rawText: string): string {
  const lower = rawText.toLowerCase();
  if (/(hr|recruit|talent)/.test(lower)) return "HR Tech";
  if (/(fintech|bank|payment|finance)/.test(lower)) return "FinTech";
  if (/(health|medical|care)/.test(lower)) return "Health Tech";
  if (/(retail|ecommerce|marketplace)/.test(lower)) return "ECommerce";
  if (/(saas|software|ai|machine learning|llm)/.test(lower)) return "AI / SaaS";
  return "General Technology";
}

function buildSummary(rawText: string): string {
  const lines = safeSplitLines(rawText);
  const summarySource = lines.slice(0, 8).join(" ");
  return cleanText(summarySource).slice(0, 280);
}

function extractProjects(rawText: string): CandidateProject[] {
  const lines = safeSplitLines(rawText);
  const projectLines = lines.filter((line) => /(project|portfolio|github|case study)/i.test(line));

  return projectLines.slice(0, 5).map((line, index) => ({
    name: `Project ${index + 1}`,
    description: line,
    technologies: extractSkillsFromText(line),
    link: line.match(/https?:\/\/\S+/)?.[0],
  }));
}

function extractWork(rawText: string): CandidateWorkExperience[] {
  const lines = safeSplitLines(rawText);
  const roleLines = lines.filter((line) =>
    /(engineer|developer|manager|lead|analyst|consultant).*(at|@)/i.test(line)
  );

  return roleLines.slice(0, 4).map((line) => {
    const [titlePart, companyPart] = line.split(/(?:at|@)/i);
    return {
      title: cleanText(titlePart ?? "Unknown title"),
      company: cleanText(companyPart ?? "Unknown company"),
      duration: line.match(/(\d{4}.*\d{4}|present|current)/i)?.[0] ?? "N/A",
      highlights: [],
    };
  });
}

function extractEducation(rawText: string): string[] {
  return safeSplitLines(rawText)
    .filter((line) => EDUCATION_HINTS.some((hint) => line.toLowerCase().includes(hint)))
    .slice(0, 4);
}

function extractCertifications(rawText: string): string[] {
  return safeSplitLines(rawText)
    .filter((line) => CERT_HINTS.some((hint) => line.toLowerCase().includes(hint)))
    .slice(0, 6);
}

function communicationIndicators(rawText: string): string[] {
  const lines = safeSplitLines(rawText);
  const bulletCount = lines.filter((line) => /^[-*•]/.test(line)).length;
  const measurableImpactLines = lines.filter((line) => /\b\d+%|\b\d+x|\b\d+\+\b/.test(line));
  const actionCount = ACTION_VERBS.filter((verb) => rawText.toLowerCase().includes(verb)).length;

  const indicators: string[] = [];
  if (bulletCount >= 3) indicators.push("Structured bullet formatting");
  if (measurableImpactLines.length >= 2) indicators.push("Quantified impact statements");
  if (actionCount >= 3) indicators.push("Strong action-oriented language");
  if (!indicators.length) indicators.push("Basic structure with limited measurable impact");
  return indicators;
}

export function parseCandidateFromResumeText(
  rawText: string,
  sourceName: string,
  sourceType: CandidateSource = "resume"
): CandidateProfile {
  const lines = safeSplitLines(rawText);
  const skills = extractSkillsFromText(rawText);
  const certifications = extractCertifications(rawText);

  return {
    id: uuidv4(),
    sourceType,
    sourceName,
    rawText,
    name: extractFirstNameLikeLine(rawText),
    email: extractEmail(rawText),
    contact: extractPhone(rawText),
    currentRole: extractCurrentRole(lines),
    totalExperienceYears: parseYearsOfExperience(rawText),
    domainIndustry: extractDomain(rawText),
    skills,
    education: extractEducation(rawText),
    certifications,
    projects: extractProjects(rawText),
    workExperience: extractWork(rawText),
    toolsTechnologies: normalizeSkills([...skills, ...certifications]),
    communicationQualityIndicators: communicationIndicators(rawText),
    resumeTextSummary: buildSummary(rawText),
    sensitiveInfoWarnings: detectSensitiveInfo(rawText),
    createdAt: new Date().toISOString(),
  };
}

function calculateExperienceFromLinkedIn(experience: ParsedLinkedInInput["experience"]): number {
  if (!experience || experience.length === 0) return 0;
  const yearHints = experience
    .map((entry) => `${entry.duration ?? ""}`)
    .join(" ")
    .match(/(\d+(?:\.\d+)?)\s*(?:years|yrs)/gi);

  if (!yearHints) return experience.length;
  return Math.max(
    ...yearHints.map((hint) => Number.parseFloat(hint.match(/\d+(?:\.\d+)?/)?.[0] ?? "0"))
  );
}

export function parseCandidateFromLinkedInJson(
  input: ParsedLinkedInInput,
  sourceName = "LinkedIn Profile"
): CandidateProfile {
  const experienceText = (input.experience ?? [])
    .map(
      (item) =>
        `${item.title ?? ""} at ${item.company ?? ""} ${item.duration ?? ""} ${item.description ?? ""}`
    )
    .join("\n");
  const summaryText = `${input.summary ?? ""}\n${experienceText}`;
  const skills = normalizeSkills([
    ...(input.skills ?? []),
    ...extractSkillsFromText(summaryText),
    ...((input.projects ?? []).flatMap((project) => project.technologies ?? [])),
  ]);

  const projects: CandidateProject[] = (input.projects ?? []).map((project, index) => ({
    name: cleanText(project.name ?? `Project ${index + 1}`),
    description: cleanText(project.description ?? "No description"),
    technologies: normalizeSkills(project.technologies ?? []),
    link: project.link,
  }));

  const workExperience: CandidateWorkExperience[] = (input.experience ?? []).map((entry) => ({
    title: cleanText(entry.title ?? "Unknown title"),
    company: cleanText(entry.company ?? "Unknown company"),
    duration: cleanText(entry.duration ?? "N/A"),
    highlights: entry.description ? [cleanText(entry.description)] : [],
  }));

  const rawText = `${input.name ?? ""}\n${input.headline ?? ""}\n${summaryText}`;

  return {
    id: uuidv4(),
    sourceType: "linkedin",
    sourceName,
    rawText,
    name: input.name ?? "LinkedIn Candidate",
    email: input.email,
    contact: input.phone,
    linkedInUrl: input.profileUrl,
    currentRole: input.headline ?? "Not specified",
    totalExperienceYears: calculateExperienceFromLinkedIn(input.experience),
    domainIndustry: extractDomain(summaryText),
    skills,
    education: (input.education ?? []).map(
      (edu) => `${edu.degree ?? "Degree"} - ${edu.school ?? "Institution"} ${edu.year ?? ""}`
    ),
    certifications: (input.certifications ?? []).map(
      (cert) => `${cert.name ?? "Certification"} ${cert.issuer ? `(${cert.issuer})` : ""}`
    ),
    projects,
    workExperience,
    toolsTechnologies: skills,
    communicationQualityIndicators: communicationIndicators(rawText),
    resumeTextSummary: buildSummary(rawText),
    sensitiveInfoWarnings: detectSensitiveInfo(rawText),
    createdAt: new Date().toISOString(),
  };
}
