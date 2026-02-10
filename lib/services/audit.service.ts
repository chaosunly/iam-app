/**
 * Audit Service - Logs security-relevant events
 * Logs permission checks, access attempts, and administrative actions
 */

export interface AuditLogEntry {
  userId: string;
  action: string;
  resource: string;
  result: "granted" | "denied" | "success" | "failure";
  timestamp?: Date;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

/**
 * Log an audit event
 * In production, this should write to a persistent store (database, log service, etc.)
 */
export async function logAudit(entry: AuditLogEntry): Promise<void> {
  const logEntry = {
    ...entry,
    timestamp: entry.timestamp || new Date(),
  };

  // For now, log to console. In production:
  // - Write to database (PostgreSQL, MongoDB, etc.)
  // - Send to log aggregation service (ELK, Splunk, DataDog, etc.)
  // - Use structured logging library (Winston, Pino, etc.)

  console.log("[AUDIT]", JSON.stringify(logEntry, null, 2));

  // TODO: Implement persistent storage
  // await saveAuditLog(logEntry);
}

/**
 * Log permission check
 */
export async function logPermissionCheck(
  userId: string,
  resource: string,
  granted: boolean,
  metadata?: Record<string, any>,
) {
  await logAudit({
    userId,
    action: "check_permission",
    resource,
    result: granted ? "granted" : "denied",
    metadata,
  });
}

/**
 * Log admin action
 */
export async function logAdminAction(
  userId: string,
  action: string,
  resource: string,
  success: boolean,
  metadata?: Record<string, any>,
) {
  await logAudit({
    userId,
    action,
    resource,
    result: success ? "success" : "failure",
    metadata: {
      ...metadata,
      isAdminAction: true,
    },
  });
}

/**
 * Log authentication event
 */
export async function logAuthEvent(
  userId: string,
  action: "login" | "logout" | "registration" | "password_reset",
  success: boolean,
  ipAddress?: string,
  userAgent?: string,
) {
  await logAudit({
    userId,
    action,
    resource: "authentication",
    result: success ? "success" : "failure",
    ipAddress,
    userAgent,
  });
}

/**
 * Log access denial
 */
export async function logAccessDenied(
  userId: string,
  resource: string,
  reason: string,
  ipAddress?: string,
) {
  await logAudit({
    userId,
    action: "access_denied",
    resource,
    result: "denied",
    ipAddress,
    metadata: {
      reason,
    },
  });
}
