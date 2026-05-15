import { UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { createAuditLog } from "@/lib/audit/logger";
import { requireRole, requireSession } from "@/lib/auth/guards";
import { mapOrgSetting } from "@/lib/db/mappers";
import { prisma } from "@/lib/db/prisma";
import { settingsSchema } from "@/lib/validation/platform";

export const runtime = "nodejs";

const fallbackWeights = {
  skillsMatch: 0.3,
  experienceRelevance: 0.25,
  educationCerts: 0.15,
  projectPortfolio: 0.2,
  communicationQuality: 0.1,
};

export async function GET(request: NextRequest) {
  const { user, errorResponse } = await requireSession(request);
  if (!user || errorResponse) return errorResponse;

  const setting = await prisma.organizationSetting.findUnique({
    where: { organizationId: user.organizationId },
  });

  if (!setting) {
    return NextResponse.json({
      setting: {
        defaultWeights: fallbackWeights,
        minimumScoreThreshold: 70,
        knockoutCriteria: {},
        aiEnhancementEnabled: false,
        reportBranding: {
          productName: "HireWise AI",
        },
      },
    });
  }

  return NextResponse.json({ setting: mapOrgSetting(setting) });
}

export async function PATCH(request: NextRequest) {
  const { user, errorResponse } = await requireRole(request, [UserRole.ADMIN, UserRole.RECRUITER]);
  if (!user || errorResponse) return errorResponse;

  try {
    const body = await request.json();
    const payload = settingsSchema.parse(body);

    const existing = await prisma.organizationSetting.findUnique({
      where: { organizationId: user.organizationId },
    });

    const setting = existing
      ? await prisma.organizationSetting.update({
          where: { organizationId: user.organizationId },
          data: payload,
        })
      : await prisma.organizationSetting.create({
          data: {
            organizationId: user.organizationId,
            ...payload,
          },
        });

    await createAuditLog({
      organizationId: user.organizationId,
      actorId: user.userId,
      action: existing ? "SETTINGS_UPDATED" : "SETTINGS_CREATED",
      entityType: "OrganizationSetting",
      entityId: setting.id,
      oldValue: existing,
      newValue: setting,
    });

    return NextResponse.json({ setting: mapOrgSetting(setting) });
  } catch (error) {
    console.error("Settings update error", error);
    return NextResponse.json({ error: "Failed to update settings." }, { status: 500 });
  }
}
