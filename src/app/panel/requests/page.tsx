import { desc } from "drizzle-orm";
import { requirePageAuth } from "@/server/auth";
import { getDb } from "@/db";
import { joinRequests } from "@/db/schema";
import { actorCan, assignableLevel } from "@/lib/rbac/engine";
import { formatDateTime } from "@/lib/utils";
import {
  RequestRejectButton,
  RequestReviewForm,
} from "@/components/panel/manage-forms";

export default async function RequestsPage() {
  const actor = await requirePageAuth("JOIN_VIEW");
  const canManageRequests = actorCan(actor, "JOIN_MANAGE");
  const maxLevel = assignableLevel(actor.level);

  const all = await getDb()
    .select()
    .from(joinRequests)
    .orderBy(desc(joinRequests.createdAt))
    .limit(100);

  const pending = all.filter((r) => r.status === "pending");
  const reviewed = all.filter((r) => r.status !== "pending");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold">Заявки на вступление</h1>
        <p className="mt-1 text-sm text-mist">
          Ожидает решения: {pending.length}
        </p>
      </header>

      {pending.length === 0 ? (
        <div className="card p-8 text-center text-sm text-mist">Новых заявок нет.</div>
      ) : (
        <div className="space-y-4">
          {pending.map((r) => (
            <article key={r.id} className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-bold">{r.nickname}</h2>
                  <p className="text-xs text-mist">
                    Возраст: {r.age} · Контакт: {r.contact} · {formatDateTime(r.createdAt)}
                  </p>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-line rounded-xl border border-edge/60 bg-abyss p-3 text-sm text-mist">
                {r.about}
              </p>
              {canManageRequests && (
                <div className="mt-4">
                  <RequestReviewForm requestId={r.id} nickname={r.nickname} maxLevel={maxLevel} />
                  <div className="mt-2">
                    <RequestRejectButton requestId={r.id} />
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {reviewed.length > 0 && (
        <section className="card p-5">
          <h2 className="section-title mb-4">Рассмотренные</h2>
          <ul className="space-y-2 text-sm">
            {reviewed.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">{r.nickname}</span>
                <span className="flex items-center gap-3 text-xs text-mist">
                  {r.reviewNote && <span>{r.reviewNote}</span>}
                  <span
                    className={r.status === "accepted" ? "badge-ok" : "badge-bad"}
                  >
                    {r.status === "accepted" ? "Принят" : "Отклонён"}
                  </span>
                  {formatDateTime(r.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
