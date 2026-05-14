import { prisma } from "@/lib/db/prisma";

interface AuditInput {
  organizationId: string;
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: unknown;
  newValue?: unknown;
}

export async function createAuditLog(input: AuditInput) {
  await prisma.auditLog.create({
    data: {
      organizationId: input.organizationId,
      actorId: input.actorId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      oldValueJson: input.oldValue ? JSON.parse(JSON.stringify(input.oldValue)) : null,
      newValueJson: input.newValue ? JSON.parse(JSON.stringify(input.newValue)) : null,
    },
  });
}
