import { NextResponse } from "next/server";

import { isDemoModeEnabled } from "@/lib/config/server-env";
import { bootstrapDemoDataIfEmpty } from "@/lib/demo-data/bootstrap-db";
import { ensureDatabaseSchema } from "@/lib/db/ensure-schema";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

export async function POST() {
  try {
    if (!isDemoModeEnabled()) {
      return NextResponse.json(
        { error: "Demo mode is disabled for this environment." },
        { status: 403 }
      );
    }

    await ensureDatabaseSchema();
    const result = await bootstrapDemoDataIfEmpty(prisma);
    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (error) {
    console.error("Demo bootstrap error", error);
    return NextResponse.json({ error: "Failed to bootstrap demo data." }, { status: 500 });
  }
}
