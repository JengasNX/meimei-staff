/**
 * Аудит: каждая привилегированная запись действий. Таблица append-only.
 */
import { db } from "@/db";
import { auditLogs } from "@/db/schema";

export type AuditEntry = {
  actorId: number | null;
  action: string;
  targetType?: string | null;
  targetId?: string | number | null;
  details?: Record<string, unknown> | null;
  ip?: string | null;
};

export async function audit(entry: AuditEntry): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      actorId: entry.actorId,
      action: entry.action,
      targetType: entry.targetType ?? null,
      targetId: entry.targetId != null ? String(entry.targetId) : null,
      details: entry.details ?? null,
      ip: entry.ip ?? null,
    });
  } catch (error) {
    // Аудит не должен ронять основное действие, но ошибка логируется.
    console.error("audit insert failed", error);
  }
}
