import { NextResponse } from "next/server";

import { getServerEnv } from "@/lib/config/server-env";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

type HealthCheck = {
  name: string;
  status: "pass" | "fail";
  message?: string;
};

export async function GET() {
  const env = getServerEnv();
  const checks: HealthCheck[] = [];

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.push({ name: "database", status: "pass" });
  } catch (error) {
    checks.push({
      name: "database",
      status: "fail",
      message: error instanceof Error ? error.message : "Database check failed.",
    });
  }

  const failed = checks.some((check) => check.status === "fail");
  return NextResponse.json(
    {
      status: failed ? "degraded" : "ok",
      service: "hirewise-ai-shortlisting-agent",
      environment: env.NODE_ENV,
      demoModeEnabled: env.ENABLE_DEMO_MODE,
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: failed ? 503 : 200 }
  );
}
