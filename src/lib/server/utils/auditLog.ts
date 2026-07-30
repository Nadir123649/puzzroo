import { connectDB } from "../db"
import AnalyticsEvent from "../models/AnalyticsEvent"

export type AuditEventType =
  | "auth:login"
  | "auth:login_failed"
  | "auth:logout"
  | "auth:logout_all"
  | "auth:token_refreshed"
  | "auth:token_reused"
  | "auth:password_changed"
  | "auth:register"
  | "auth:session_revoked"
  | "admin:action"
  | "game:completed"
  | "game:abandoned"
  | "security:rate_limited"
  | "security:csrf_blocked"
  | "security:invalid_origin"
  | "user:profile_updated"
  | "user:email_changed"
  | "user:account_deleted"

export interface AuditEntry {
  eventType: AuditEventType
  userId?: string
  sessionId?: string
  ip?: string
  userAgent?: string
  metadata?: Record<string, unknown>
}

export async function auditLog(entry: AuditEntry): Promise<void> {
  try {
    await connectDB()
    await AnalyticsEvent.create({
      userId: entry.userId || null,
      sessionId: entry.sessionId || null,
      event: entry.eventType,
      category: "audit",
      properties: {
        ...entry.metadata,
        ip: entry.ip,
        userAgent: entry.userAgent,
        timestamp: new Date().toISOString(),
      },
    })
  } catch {
  }
}
