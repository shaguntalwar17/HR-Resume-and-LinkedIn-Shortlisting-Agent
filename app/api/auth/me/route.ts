import { NextRequest, NextResponse } from "next/server";

import { requireSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { user, errorResponse } = await requireSession(request);
  if (!user || errorResponse) {
    return errorResponse;
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    include: { organization: true },
  });

  if (!dbUser) {
    return NextResponse.json({ error: "Session user no longer exists." }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role,
      organizationId: dbUser.organizationId,
      organizationName: dbUser.organization.name,
    },
  });
}
