import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";

export interface AuditLogParams {
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  metadata?: Prisma.InputJsonObject;
}

export const audit = {
  async log(params: AuditLogParams): Promise<void> {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        metadata: params.metadata ?? {},
      },
    });
  },
};
