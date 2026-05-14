import { z } from "zod";

export const scoreDimensionKeySchema = z.enum([
  "skillsMatch",
  "experienceRelevance",
  "educationCerts",
  "projectPortfolio",
  "communicationQuality",
]);

export const weightsSchema = z.object({
  skillsMatch: z.number().min(0).max(1),
  experienceRelevance: z.number().min(0).max(1),
  educationCerts: z.number().min(0).max(1),
  projectPortfolio: z.number().min(0).max(1),
  communicationQuality: z.number().min(0).max(1),
});

export const jobDescriptionSchema = z.object({
  id: z.string(),
  rawText: z.string(),
  roleTitle: z.string(),
  requiredSkills: z.array(z.string()),
  preferredSkills: z.array(z.string()),
  minimumExperienceYears: z.number(),
  domainIndustry: z.string(),
  educationRequirements: z.array(z.string()),
  certifications: z.array(z.string()),
  responsibilities: z.array(z.string()),
  niceToHaveQualifications: z.array(z.string()),
  parsedAt: z.string(),
});

export const candidateProjectSchema = z.object({
  name: z.string(),
  description: z.string(),
  technologies: z.array(z.string()),
  impact: z.string().optional(),
  link: z.string().optional(),
});

export const candidateWorkSchema = z.object({
  title: z.string(),
  company: z.string(),
  duration: z.string(),
  highlights: z.array(z.string()),
});

export const candidateSchema = z.object({
  id: z.string(),
  sourceType: z.enum(["resume", "linkedin", "demo"]),
  sourceName: z.string(),
  rawText: z.string(),
  name: z.string(),
  email: z.string().optional(),
  contact: z.string().optional(),
  linkedInUrl: z.string().optional(),
  currentRole: z.string(),
  totalExperienceYears: z.number(),
  domainIndustry: z.string(),
  skills: z.array(z.string()),
  education: z.array(z.string()),
  certifications: z.array(z.string()),
  projects: z.array(candidateProjectSchema),
  workExperience: z.array(candidateWorkSchema),
  toolsTechnologies: z.array(z.string()),
  communicationQualityIndicators: z.array(z.string()),
  resumeTextSummary: z.string(),
  sensitiveInfoWarnings: z.array(z.string()),
  createdAt: z.string(),
});

export const evaluateRequestSchema = z.object({
  jd: jobDescriptionSchema,
  candidates: z.array(candidateSchema),
  weights: weightsSchema.optional(),
  useAiEnhancement: z.boolean().optional(),
  runId: z.string().optional(),
});

export const overrideRequestSchema = z.object({
  runId: z.string(),
  candidateId: z.string(),
  reason: z.string().min(4),
  dimensionKey: scoreDimensionKeySchema.optional(),
  newRawScore: z.number().min(0).max(10).optional(),
  newRecommendation: z
    .enum(["Strong Shortlist", "Shortlist", "Review Manually", "Not Recommended"])
    .optional(),
});

export const noteRequestSchema = z.object({
  runId: z.string(),
  candidateId: z.string(),
  note: z.string().min(3),
});
