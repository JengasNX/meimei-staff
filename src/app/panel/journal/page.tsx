import { desc, eq, sql } from "drizzle-orm";
import { requirePageAuth } from "@/server/auth";
import { getDb } from "@/db";
import { auditLogs, users } from "@/db/schema";
import { formatDateTime } from "@/lib/utils";

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requirePageAuth("AUDIT_VIEW");
  const { q = "", page = "1" } = await searchParams;
  const pageNum = Math.max(1, Number(page) || 1);
  const perPage = 30;

  const db = getDb();
  const filter = q.trim()
    ? sql`(${auditLogs.action} ilike ${"%" + q.trim() + "%"} or coalesce(${auditLogs.targetId}, '') ilike ${"%" + q.trim() + "%"})`
    : undefined;

  const rows = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      targetType: auditLogs.targetType,
      targetId: auditLogs.targetId,
      details: auditLogs.details,
      ip: auditLogs.ip,
      at: auditLogs.at,
      actorName: users.displayName,
    })
    .from(auditLogs)
    .leftJoin(users, eq(users.id, auditLogs.actorId))
    .where(filter)
    .orderBy(desc(auditLogs.at))
    .limit(perPage)
    .offset((pageNum - 1) * perPage);

  const [total] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(auditLogs)
    .where(filter);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold">Журнал аудита</h1>
        <p className="mt-1 text-sm text-mist">
          Неизменяемая запись всех действий. Всего записей: {total?.count ?? 0}
        </p>
      </header>

      <form className="flex gap-2" action="/panel/journal">
        <input
          name="q"
          defaultValue={q}
          className="input max-w-sm"
          placeholder="Действие или ID…"
        />
        <button type="submit" className="btn-ghost btn-sm">
          Найти
        </button>
      </form>

      <div className="card overflow-x-auto">
        <table className="table-base min-w-[760px]">
          <thead>
            <tr>
              <th>Когда</th>
              <th>Кто</th>
              <th>Действие</th>
              <th>Цель</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-mist">
                  Записей не найдено.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="whitespace-nowrap text-mist">{formatDateTime(r.at)}</td>
                <td className="font-semibold">{r.actorName ?? "система"}</td>
                <td>
                  <code className="text-xs text-accent">{r.action}</code>
                </td>
                <td className="text-xs text-mist">
                  {r.targetType ? `${r.targetType}#${r.targetId ?? "—"}` : "—"}
                </td>
                <td className="text-xs text-mist">{r.ip ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-3 text-sm">
        {pageNum > 1 && (
          <a className="link-accent" href={`/panel/journal?q=${encodeURIComponent(q)}&page=${pageNum - 1}`}>
            ← Новее
          </a>
        )}
        {rows.length === perPage && (
          <a className="link-accent" href={`/panel/journal?q=${encodeURIComponent(q)}&page=${pageNum + 1}`}>
            Старее →
          </a>
        )}
      </div>
    </div>
  );
}
