import { desc, eq, and, gte } from "drizzle-orm";
import { Coffee, KeyRound, User } from "lucide-react";
import { requirePageAuth } from "@/server/auth";
import { getDb } from "@/db";
import {
  inactivityPeriods,
  notifications,
  ratingEvents,
  staffTerms,
} from "@/db/schema";
import { actorCan } from "@/lib/rbac/engine";
import { levelName } from "@/lib/rbac/levels";
import { Avatar } from "@/components/avatar";
import {
  InactivityRequestForm,
  PasswordChangeForm,
  ProfileForm,
} from "@/components/panel/member-actions";
import { daysLabel, daysSince, formatDate, formatDateTime } from "@/lib/utils";

export default async function ProfilePage() {
  const actor = await requirePageAuth("PROFILE_EDIT");
  const db = getDb();

  const [myRatings, myTerms, myInactivity, myNotifications] = await Promise.all([
    db
      .select()
      .from(ratingEvents)
      .where(eq(ratingEvents.userId, actor.id))
      .orderBy(desc(ratingEvents.at))
      .limit(10),
    db
      .select()
      .from(staffTerms)
      .where(eq(staffTerms.userId, actor.id))
      .orderBy(desc(staffTerms.at))
      .limit(10),
    db
      .select()
      .from(inactivityPeriods)
      .where(eq(inactivityPeriods.userId, actor.id))
      .orderBy(desc(inactivityPeriods.createdAt))
      .limit(5),
    db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, actor.id))
      .orderBy(desc(notifications.createdAt))
      .limit(10),
  ]);

  const activeInactivity = await db
    .select()
    .from(inactivityPeriods)
    .where(
      and(
        eq(inactivityPeriods.userId, actor.id),
        eq(inactivityPeriods.status, "approved"),
        gte(inactivityPeriods.until, new Date()),
      ),
    )
    .limit(1);

  const currentInactivity = activeInactivity[0];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold">Профиль</h1>
      </header>

      <section className="card flex flex-wrap items-center gap-5 p-6">
        <Avatar name={actor.displayName} url={actor.avatarUrl} size={64} />
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl font-bold">{actor.displayName}</h2>
          <p className="text-sm text-mist">
            @{actor.username} · {levelName(actor.level)} · {actor.roleTitle}
          </p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-mist">
            <span className="badge-muted">Рейтинг: {actor.rating}</span>
            <span className="badge-muted">Стаж: {daysLabel(daysSince(actor.hiredAt))}</span>
            {currentInactivity && (
              <span className="badge-warn">
                <Coffee className="size-3" /> неактив до {formatDate(currentInactivity.until)}
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="section-title mb-3 flex items-center gap-2">
            <User className="size-4" /> Данные профиля
          </h2>
          <ProfileForm displayName={actor.displayName} avatarUrl={actor.avatarUrl} />
        </div>
        <div className="card p-5">
          <h2 className="section-title mb-3 flex items-center gap-2">
            <KeyRound className="size-4" /> Смена пароля
          </h2>
          <PasswordChangeForm />
        </div>
        {actorCan(actor, "REQUEST_INACTIVITY") && (
          <div className="card p-5">
            <h2 className="section-title mb-3 flex items-center gap-2">
              <Coffee className="size-4" /> Неактив
            </h2>
            <InactivityRequestForm />
            {myInactivity.length > 0 && (
              <ul className="mt-4 space-y-2 text-xs text-mist">
                {myInactivity.map((p) => (
                  <li key={p.id}>
                    до {formatDate(p.until)} —{" "}
                    {p.status === "approved"
                      ? "одобрен"
                      : p.status === "rejected"
                        ? "отклонён"
                        : "ожидает рассмотрения"}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="section-title mb-4">Мой рейтинг</h2>
          {myRatings.length === 0 ? (
            <p className="text-sm text-mist">Изменений не было.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {myRatings.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3">
                  <span className="truncate text-mist">{r.reason}</span>
                  <span
                    className={`shrink-0 font-semibold ${
                      r.delta > 0 ? "text-leaf" : "text-rose"
                    }`}
                  >
                    {r.delta > 0 ? "+" : ""}
                    {r.delta}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <h2 className="section-title mb-4">Мои должности</h2>
          {myTerms.length === 0 ? (
            <p className="text-sm text-mist">Записей нет.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {myTerms.map((t) => (
                <li key={t.id} className="text-mist">
                  <span className="font-semibold text-frost">
                    {t.kind === "hire"
                      ? "Найм"
                      : t.kind === "fire"
                        ? "Снятие"
                        : t.kind === "rehire"
                          ? "Восстановление"
                          : "Изменение"}
                  </span>{" "}
                  — {t.roleTitle} · {formatDateTime(t.at)}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="section-title mb-4">Уведомления</h2>
        {myNotifications.length === 0 ? (
          <p className="text-sm text-mist">Уведомлений нет.</p>
        ) : (
          <ul className="space-y-2.5">
            {myNotifications.map((n) => (
              <li key={n.id} className="rounded-xl border border-edge/60 bg-abyss p-3">
                <p className="text-sm font-semibold">{n.title}</p>
                {n.body && <p className="mt-0.5 text-xs text-mist">{n.body}</p>}
                <p className="mt-1 text-[11px] text-mist/70">{formatDateTime(n.createdAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
