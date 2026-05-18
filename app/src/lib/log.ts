// Structured logging + Audit-Trail.
//
// Strukturiertes Logging in JSON: stdout (durch Docker eingefangen, von
// Promtail/Vector/Loki o.ae. weiterleitbar). Keine externe Library —
// minimaler Wrapper. Hashes Geheimnisse aus.
//
// Audit-Trail in DB-Tabelle admin_audit_log fuer compliance + forensics.

import { db } from "./db";
import { adminAuditLog } from "@/db/schema";

type LogLevel = "info" | "warn" | "error" | "debug";

type LogFields = Record<string, unknown>;

function safeStringify(obj: unknown): string {
  try {
    return JSON.stringify(obj, (_k, v) => {
      // Sensitive Felder ausmaskieren
      if (typeof v === "string" && (_k === "password" || _k === "passwordHash" || _k === "token" || _k === "secret")) {
        return "***";
      }
      return v;
    });
  } catch {
    return String(obj);
  }
}

function emit(level: LogLevel, msg: string, fields?: LogFields) {
  const line = {
    level,
    msg,
    time: new Date().toISOString(),
    ...fields
  };
  // Verschiedene streams je nach Severity — Container-Stack kann das routen
  if (level === "error") console.error(safeStringify(line));
  else if (level === "warn") console.warn(safeStringify(line));
  else console.log(safeStringify(line));
}

export const log = {
  info:  (msg: string, fields?: LogFields) => emit("info",  msg, fields),
  warn:  (msg: string, fields?: LogFields) => emit("warn",  msg, fields),
  error: (msg: string, fields?: LogFields) => emit("error", msg, fields),
  debug: (msg: string, fields?: LogFields) => {
    if (process.env.NODE_ENV !== "production") emit("debug", msg, fields);
  }
};

// ───── Audit-Trail ─────────────────────────────────────────────────────

export type AuditAction =
  | "user.promote_admin"
  | "user.demote_admin"
  | "user.delete"
  | "invite.create"
  | "invite.delete"
  | "session.delete_other"
  | "admin.export.users"
  | "admin.export.sessions";

/**
 * Schreibt einen Audit-Eintrag in admin_audit_log.
 * Fail-soft: bei DB-Error wird zwar geloggt, aber der Aufrufer nicht blockiert.
 */
export async function audit(params: {
  actorId: string;
  actorEmail: string;
  action: AuditAction;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
}) {
  try {
    await db.insert(adminAuditLog).values({
      actorId: params.actorId,
      actorEmail: params.actorEmail,
      action: params.action,
      targetType: params.targetType ?? null,
      targetId: params.targetId ?? null,
      metadata: params.metadata ?? null,
      ip: params.ip ?? null
    });
    // Zusaetzlich strukturiert loggen — fuer Echtzeit-Visibility
    log.info("admin.audit", {
      action: params.action,
      actor: params.actorEmail,
      target: params.targetId,
      ...params.metadata
    });
  } catch (e) {
    log.error("audit.write_failed", {
      action: params.action,
      actor: params.actorEmail,
      error: e instanceof Error ? e.message : String(e)
    });
  }
}
