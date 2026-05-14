import { UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { getSessionFromRequest } from "@/lib/auth/session";
import { SessionUser } from "@/lib/auth/types";
import { ensureDatabaseSchema } from "@/lib/db/ensure-schema";

type SessionGuardResult =
  | {
      user: SessionUser;
      errorResponse: null;
    }
  | {
      user: null;
      errorResponse: NextResponse;
    };

export async function requireSession(request: NextRequest): Promise<SessionGuardResult> {
  await ensureDatabaseSchema();
  const user = await getSessionFromRequest(request);
  if (!user) {
    return {
      user: null,
      errorResponse: NextResponse.json({ error: "Unauthorized." }, { status: 401 }),
    };
  }

  return { user, errorResponse: null };
}

export async function requireRole(
  request: NextRequest,
  allowedRoles: UserRole[]
): Promise<SessionGuardResult> {
  const session = await requireSession(request);
  if (session.errorResponse) {
    return session;
  }

  if (!allowedRoles.includes(session.user.role)) {
    return {
      user: null,
      errorResponse: NextResponse.json({ error: "Forbidden." }, { status: 403 }),
    };
  }

  return { user: session.user, errorResponse: null };
}
