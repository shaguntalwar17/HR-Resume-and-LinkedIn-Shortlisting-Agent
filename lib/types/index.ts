export type Recommendation =
  | "Strong Shortlist"
  | "Shortlist"
  | "Review Manually"
  | "Not Recommended";

export type ConfidenceLevel = "High" | "Medium" | "Low";

export type CandidateSource = "resume" | "linkedin" | "demo";

export type ScoreDimensionKey =
  | "skillsMatch"
  | "experienceRelevance"
  | "educationCerts"
  | "projectPortfolio"
  | "communicationQuality";

export const DIMENSION_LABELS: Record<ScoreDimensionKey, string> = {
  skillsMatch: "Skills Match",
  experienceRelevance: "Experience Relevance",
  educationCerts: "Education & Certs",
  projectPortfolio: "Project / Portfolio",
  communicationQuality: "Communication Quality",
};

export const DEFAULT_WEIGHTS: Record<ScoreDimensionKey, number> = {
  skillsMatch: 0.3,
  experienceRelevance: 0.25,
  educationCerts: 0.15,
  projectPortfolio: 0.2,
  communicationQuality: 0.1,
};

export const RECOMMENDATION_THRESHOLDS = {
  strongShortlist: 85,
  shortlist: 70,
  reviewManually: 55,
};

export interface JobDescriptionParsed {
  id: string;
  rawText: string;
  roleTitle: string;
  requiredSkills: string[];
  preferredSkills: string[];
  minimumExperienceYears: number;
  domainIndustry: string;
  educationRequirements: string[];
  certifications: string[];
  responsibilities: string[];
  niceToHaveQualifications: string[];
  parsedAt: string;
}

export interface CandidateProject {
  name: string;
  description: string;
  technologies: string[];
  impact?: string;
  link?: string;
}

export interface CandidateWorkExperience {
  title: string;
  company: string;
  duration: string;
  highlights: string[];
}

export interface CandidateProfile {
  id: string;
  sourceType: CandidateSource;
  sourceName: string;
  rawText: string;
  name: string;
  email?: string;
  contact?: string;
  linkedInUrl?: string;
  currentRole: string;
  totalExperienceYears: number;
  domainIndustry: string;
  skills: string[];
  education: string[];
  certifications: string[];
  projects: CandidateProject[];
  workExperience: CandidateWorkExperience[];
  toolsTechnologies: string[];
  communicationQualityIndicators: string[];
  resumeTextSummary: string;
  sensitiveInfoWarnings: string[];
  createdAt: string;
}

export interface DimensionScore {
  key: ScoreDimensionKey;
  label: string;
  rawScore: number;
  weightedContribution: number;
  weight: number;
  justification: string;
  evidenceSnippets: string[];
}

export interface CandidateEvaluation {
  candidateId: string;
  candidateName: string;
  totalScore: number;
  recommendation: Recommendation;
  confidence: ConfidenceLevel;
  riskFlags: string[];
  keyStrengths: string[];
  keyGaps: string[];
  skillsMatchPercentage: number;
  matchedSkills: string[];
  missingSkills: string[];
  dimensionScores: Record<ScoreDimensionKey, DimensionScore>;
  recruiterSummary: string;
  evaluatedAt: string;
}

export interface OverrideEntry {
  id: string;
  candidateId: string;
  timestamp: string;
  dimensionKey?: ScoreDimensionKey;
  oldRawScore?: number;
  newRawScore?: number;
  oldRecommendation: Recommendation;
  newRecommendation: Recommendation;
  reason: string;
  oldTotalScore: number;
  newTotalScore: number;
}

export interface RecruiterNote {
  id: string;
  candidateId: string;
  note: string;
  timestamp: string;
}

export interface EvaluationRun {
  id: string;
  jd: JobDescriptionParsed;
  candidates: CandidateProfile[];
  evaluations: CandidateEvaluation[];
  overrideHistory: OverrideEntry[];
  recruiterNotes: RecruiterNote[];
  weights: Record<ScoreDimensionKey, number>;
  createdAt: string;
  updatedAt: string;
}

export interface ParsedLinkedInInput {
  name?: string;
  headline?: string;
  summary?: string;
  location?: string;
  email?: string;
  phone?: string;
  profileUrl?: string;
  skills?: string[];
  experience?: Array<{
    title?: string;
    company?: string;
    duration?: string;
    description?: string;
  }>;
  education?: Array<{
    degree?: string;
    school?: string;
    year?: string;
  }>;
  certifications?: Array<{
    name?: string;
    issuer?: string;
  }>;
  projects?: Array<{
    name?: string;
    description?: string;
    technologies?: string[];
    link?: string;
  }>;
}

export interface CandidateComparisonRow {
  candidateId: string;
  candidateName: string;
  totalScore: number;
  recommendation: Recommendation;
  dimensionScores: Record<ScoreDimensionKey, number>;
  matchedSkillsCount: number;
  missingSkillsCount: number;
}
