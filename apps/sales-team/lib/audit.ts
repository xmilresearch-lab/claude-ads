import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

interface AuditLogArgs {
  userId: string
  action: string
  metadata?: Record<string, unknown>
  ipAddress?: string
}

export async function writeAuditLog({ userId, action, metadata = {}, ipAddress }: AuditLogArgs): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      metadata: metadata as Prisma.InputJsonValue,
      ipAddress: ipAddress ?? null,
    },
  })
}
