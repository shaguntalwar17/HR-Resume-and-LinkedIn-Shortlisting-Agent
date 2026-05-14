import { z } from "zod";

export const jobStatusSchema = z.enum(["DRAFT", "ACTIVE", "CLOSED", "ARCHIVED"]);
export const recommendationSchema = z.enum(["STRONG_SHORTLIST", "SHORTLIST", "HOLD", "REJECT"]);
export const applicationStatusSchema = z.enum([
  "NEW",
  "PARSED",
  "EVALUATED",
  "REVIEWED",
  "SHORTLISTED",
  "REJECTED",
  "HOLD",
  "HIRED",
]);

export const createJobSchema = z.object({
  title: z.string().min(3),
  department: z.string().optional(),
  location: z.string().optional(),
  employmentType: z.string().optional(),
  seniority: z.string().optional(),
  description: z.string().min(20),
  requiredSkills: z.array(z.string()).default([]),
  preferredSkills: z.array(z.string()).default([]),
  minExperience: z.number().int().nonnegative().default(0),
  maxExperience: z.number().int().nonnegative().optional(),
  status: jobStatusSchema.default("DRAFT"),
  scoringConfig: z
    .object({
      weights: z.record(z.string(), z.number()).optional(),
      minimumScoreThreshold: z.number().int().min(0).max(100).optional(),
      knockoutCriteria: z
        .object({
          minimumMandatorySkillMatchPercentage: z.number().min(0).max(100).optional(),
          minimumExperienceYears: z.number().nonnegative().optional(),
          rejectOnMissingMandatorySkillsCount: z.number().int().nonnegative().optional(),
        })
        .optional(),
    })
    .optional(),
});

export const updateJobSchema = createJobSchema.partial();

export const listCandidatesQuerySchema = z.object({
  jobId: z.string().optional(),
  status: applicationStatusSchema.optional(),
  search: z.string().optional(),
  minScore: z.number().optional(),
  maxScore: z.number().optional(),
  skill: z.string().optional(),
});

export const evaluateCandidatesSchema = z.object({
  jobId: z.string(),
  candidateIds: z.array(z.string()).optional(),
  forceReevaluate: z.boolean().default(false),
});

export const applicationStatusUpdateSchema = z.object({
  status: applicationStatusSchema,
  recommendation: recommendationSchema.optional(),
  notes: z.string().optional(),
  assignHiringManagerId: z.string().optional(),
});

export const applicationOverrideSchema = z.object({
  overallScore: z.number().min(0).max(100).optional(),
  recommendation: recommendationSchema.optional(),
  overrideReason: z.string().min(3),
});

export const recruiterReviewSchema = z.object({
  decision: z.enum(["SHORTLIST", "REJECT", "HOLD", "APPROVE", "COMMENT"]),
  notes: z.string().optional(),
  overrideReason: z.string().optional(),
});

export const settingsSchema = z.object({
  defaultWeights: z.record(z.string(), z.number()),
  minimumScoreThreshold: z.number().int().min(0).max(100),
  knockoutCriteria: z
    .object({
      minimumMandatorySkillMatchPercentage: z.number().min(0).max(100).optional(),
      minimumExperienceYears: z.number().nonnegative().optional(),
      rejectOnMissingMandatorySkillsCount: z.number().int().nonnegative().optional(),
    })
    .default({}),
  aiEnhancementEnabled: z.boolean(),
  reportBranding: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
});

export const reportGenerateSchema = z.object({
  jobId: z.string(),
  type: z.enum(["JSON", "HTML", "PDF", "EXECUTIVE_SUMMARY"]).default("JSON"),
});

export const integrationUpdateSchema = z.object({
  provider: z.enum(["GREENHOUSE", "LEVER", "WORKDAY", "BAMBOOHR", "GENERIC_WEBHOOK"]),
  status: z.enum(["DISCONNECTED", "CONNECTED", "ERROR"]),
  configJson: z.record(z.string(), z.unknown()).optional(),
});
