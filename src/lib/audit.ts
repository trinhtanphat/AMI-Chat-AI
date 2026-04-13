import { prisma } from './prisma'

/**
 * Log an admin/system action for audit trail
 */
export async function logAuditEvent(params: {
  userId?: string
  action: string
  details?: string
  ipAddress?: string
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId || null,
        action: params.action,
        details: params.details || null,
        ipAddress: params.ipAddress || null,
      },
    })
  } catch (error) {
    // Non-critical: don't fail the request
    console.error('Audit log error:', error)
  }
}
