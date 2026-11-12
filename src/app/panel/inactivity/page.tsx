import { desc, eq } from "drizzle-orm";
import { requirePageAuth } from "@/server/auth";
import { getDb } from "@/db";
import { inactivityPeriods, users } from "@/db/schema";
import { formatDate, formatDateTime } from "@/lib/utils";
import { actorCan } from "@/lib/rbac/engine";
import { InactivityReviewForm } from "@/components/panel/manage-forms";

const STATUS = {
  pending: { text: "Ожидает", cls: "badge-warn" },
  approved: { text: "Одобрен", cls: "badge-ok" },
  rejected: { text: "Отклонён", cls: "badge-bad" },
} as const;

export default async function InactivityPage() {
  const actor = await requirePageAuth("INACTIVITY_MANAGE");
  const canReview = actorCan(actor, "INACTIVITY_MANAGE");

  const rows = await getDb()
    .select({
      id: inactivityPeriods.id,
      userId: inactivityPeriods.userId,
      from: inactivityPeriods.from,
      until: inactivityPeriods.until,
      reason: inactivityPeriods.reason,
      status: inactivityPeriods.status,
      createdAt: inactivityPeriods.createdAt,
      userName: users.displayName,
      userLevel: users.level,
    })
    .from(inactivityPeriods)
    .leftJoin(users, eq(users.id, inactivityPeriods.userId))
    .orderBy(desc(inactivityPeriods.createdAt))
    .limit(60);

  const pending = rows.filter((r) => r.status === "pending");
  const rest = rows.filter((r) => r.status !== "pending");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold">Неактивы</h1>
        <p className="mt-1 text-sm text-mist">Заявки сотрудников на временное отсутствие.</p>
      </header>

      {pending.length === 0 ? (
        <div className="card p-8 text-center text-sm text-mist">Ожидающих заявок нет.</div>
      ) : (
        <div className="space-y-3">
          {pending.map((p) => (
            <article key={p.id} className="card p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">
                    {p.userName ?? `#${p.userId}`}{" "}
                    <span className="badge-muted">до {formatDate(p.until)}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-mist">
                    {p.reason} · {formatDateTime(p.createdAt)}
                  </p>
                </div>
                {canReview && p.userId !== actor.id && (
                  <InactivityReviewForm periodId={p.id} />
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {rest.length > 0 && (
        <section className="card p-5">
          <h2 className="section-title mb-4">История</h2>
          <ul className="space-y-2 text-sm">
            {rest.map((p) => {
              const s = STATUS[p.status];
              return (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">
                    {p.userName ?? `#${p.userId}`} — до {formatDate(p.until)}
                  </span>
                  <span className="flex items-center gap-2 text-xs text-mist">
                    {p.reason}
                    <span className={s.cls}>{s.text}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
