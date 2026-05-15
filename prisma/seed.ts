import { PrismaClient } from "@prisma/client";

import { bootstrapDemoDataIfEmpty } from "../lib/demo-data/bootstrap-db";
import { ensureDatabaseSchema } from "../lib/db/ensure-schema";

const prisma = new PrismaClient();

async function resetDatabase() {
  await prisma.recruiterReview.deleteMany();
  await prisma.scoreBreakdown.deleteMany();
  await prisma.resumeDocument.deleteMany();
  await prisma.linkedInProfileData.deleteMany();
  await prisma.applicationEvaluation.deleteMany();
  await prisma.report.deleteMany();
  await prisma.candidate.deleteMany();
  await prisma.jobRequisition.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.integrationConfig.deleteMany();
  await prisma.organizationSetting.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();
}

async function main() {
  await ensureDatabaseSchema();
  await resetDatabase();
  const result = await bootstrapDemoDataIfEmpty(prisma);
  if (!result.created) {
    console.log("Seed skipped: existing users detected.");
    return;
  }
  console.log("Demo seed completed.");
  console.log("Demo credentials:");
  console.log("admin@hirewise.demo / DemoPass#123");
  console.log("recruiter@hirewise.demo / DemoPass#123");
  console.log("manager@hirewise.demo / DemoPass#123");
  console.log("viewer@hirewise.demo / DemoPass#123");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
