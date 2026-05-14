import { prisma } from "@/lib/db/prisma";
import { getServerEnv } from "@/lib/config/server-env";

let ensurePromise: Promise<void> | null = null;

async function applySchema() {
  const env = getServerEnv();
  if (!env.AUTO_BOOTSTRAP_SCHEMA) {
    return;
  }
  if (!env.DATABASE_URL.startsWith("file:")) {
    return;
  }

  await prisma.$executeRawUnsafe("PRAGMA foreign_keys = ON;");

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Organization" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "industry" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "User" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "passwordHash" TEXT NOT NULL,
      "role" TEXT NOT NULL,
      "organizationId" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");`);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "JobRequisition" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "organizationId" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "department" TEXT,
      "location" TEXT,
      "employmentType" TEXT,
      "seniority" TEXT,
      "description" TEXT NOT NULL,
      "requiredSkills" JSONB NOT NULL,
      "preferredSkills" JSONB NOT NULL,
      "minExperience" INTEGER NOT NULL DEFAULT 0,
      "maxExperience" INTEGER,
      "status" TEXT NOT NULL DEFAULT 'DRAFT',
      "scoringConfig" JSONB,
      "createdById" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Candidate" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "organizationId" TEXT NOT NULL,
      "fullName" TEXT NOT NULL,
      "email" TEXT,
      "phone" TEXT,
      "location" TEXT,
      "currentTitle" TEXT,
      "currentCompany" TEXT,
      "experienceYears" REAL NOT NULL DEFAULT 0,
      "source" TEXT NOT NULL DEFAULT 'RESUME_UPLOAD',
      "resumeUrl" TEXT,
      "parsedResumeText" TEXT NOT NULL,
      "linkedInJson" JSONB,
      "tags" JSONB NOT NULL,
      "skills" JSONB NOT NULL,
      "education" JSONB NOT NULL,
      "certifications" JSONB NOT NULL,
      "projects" JSONB NOT NULL,
      "workExperience" JSONB NOT NULL,
      "communicationIndicators" JSONB NOT NULL,
      "sensitiveInfoWarnings" JSONB NOT NULL,
      "embedding" JSONB,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ApplicationEvaluation" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "jobId" TEXT NOT NULL,
      "candidateId" TEXT NOT NULL,
      "overallScore" REAL NOT NULL,
      "skillsScore" REAL NOT NULL,
      "experienceScore" REAL NOT NULL,
      "educationScore" REAL NOT NULL,
      "domainScore" REAL NOT NULL,
      "communicationScore" REAL NOT NULL,
      "cultureFitScore" REAL,
      "mandatorySkillsScore" REAL NOT NULL,
      "preferredSkillsScore" REAL NOT NULL,
      "projectScore" REAL NOT NULL,
      "semanticScore" REAL,
      "confidenceScore" REAL NOT NULL,
      "scoringVersion" TEXT NOT NULL DEFAULT 'v2.0.0',
      "recommendation" TEXT NOT NULL,
      "explanationJson" JSONB NOT NULL,
      "evidenceJson" JSONB NOT NULL,
      "riskFlagsJson" JSONB NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'NEW',
      "assignedHiringManagerId" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("jobId") REFERENCES "JobRequisition"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      FOREIGN KEY ("assignedHiringManagerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "ApplicationEvaluation_jobId_candidateId_key"
    ON "ApplicationEvaluation"("jobId", "candidateId");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "RecruiterReview" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "applicationId" TEXT NOT NULL,
      "reviewerId" TEXT NOT NULL,
      "decision" TEXT NOT NULL,
      "notes" TEXT,
      "overrideReason" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("applicationId") REFERENCES "ApplicationEvaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "AuditLog" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "organizationId" TEXT NOT NULL,
      "actorId" TEXT,
      "action" TEXT NOT NULL,
      "entityType" TEXT NOT NULL,
      "entityId" TEXT NOT NULL,
      "oldValueJson" JSONB,
      "newValueJson" JSONB,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Report" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "jobId" TEXT NOT NULL,
      "generatedById" TEXT NOT NULL,
      "reportType" TEXT NOT NULL,
      "fileUrl" TEXT,
      "generatedJson" JSONB,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("jobId") REFERENCES "JobRequisition"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "OrganizationSetting" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "organizationId" TEXT NOT NULL,
      "defaultWeights" JSONB NOT NULL,
      "minimumScoreThreshold" INTEGER NOT NULL DEFAULT 70,
      "knockoutCriteria" JSONB,
      "aiEnhancementEnabled" BOOLEAN NOT NULL DEFAULT 0,
      "reportBranding" JSONB,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "OrganizationSetting_organizationId_key"
    ON "OrganizationSetting"("organizationId");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "IntegrationConfig" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "organizationId" TEXT NOT NULL,
      "provider" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'DISCONNECTED',
      "configJson" JSONB,
      "lastSyncAt" DATETIME,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "IntegrationConfig_organizationId_provider_key"
    ON "IntegrationConfig"("organizationId", "provider");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "WebhookIngestionLog" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "organizationId" TEXT NOT NULL,
      "provider" TEXT NOT NULL,
      "payloadJson" JSONB NOT NULL,
      "processed" BOOLEAN NOT NULL DEFAULT 0,
      "errorMessage" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);
}

export async function ensureDatabaseSchema() {
  if (!ensurePromise) {
    ensurePromise = applySchema().catch((error) => {
      ensurePromise = null;
      throw error;
    });
  }

  await ensurePromise;
}

