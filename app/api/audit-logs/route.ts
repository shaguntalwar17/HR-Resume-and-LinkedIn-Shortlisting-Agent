import { NextRequest, NextResponse } from "next/server";

import { requireSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { user, errorResponse } = await requireSession(request);
  if (!user || errorResponse) return errorResponse;

  const logs = await prisma.auditLog.findMany({
    where: { organizationId: user.organizationId },
    include: {
      actor: true,
    },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  return NextResponse.json({ logs });
}
