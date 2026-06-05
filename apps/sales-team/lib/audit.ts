import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

interface AuditParams {
  userId: string
  action: string
  metadata?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}

export async function writeAuditLog(params: AuditParams): Promise<void> {
  try {
    const { userId, action, metadata = {}, ipAddress, userAgent } = params
    const mergedMetadata: Record<string, unknown> =
      userAgent !== undefined ? { ...metadata, userAgent } : metadata

    await prisma.auditLog.create({
      data: {
        userId,
        action,
        metadata: mergedMetadata as Prisma.InputJsonValue,
        ipAddress: ipAddress ?? null,
      },
    })
  } catch (error) {
    console.error('[audit] Failed to write audit log:', error)
    // Never throw — audit log failure must not break the request
  }
}
