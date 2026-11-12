import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { requirePageAuth } from "@/server/auth";
import { getDb } from "@/db";
import {
  disciplinaryActions,
  inactivityPeriods,
  ratingEvents,
  staffTerms,
  users,
} from "@/db/schema";
import { actorCan, assignableLevel, canManage } from "@/lib/rbac/engine";
import { levelName } from "@/lib/rbac/levels";
import { Avatar } from "@/components/avatar";
import {
  DisciplineForm,
  FireForm,
  LevelForm,
  PasswordResetForm,
  RatingForm,
} from "@/components/panel/member-actions";
import {
  daysLabel,
  daysSince,
  formatDate,
  formatDateTime,
} from "@/lib/utils";

const TYPE_LABEL = { reprimand: "Выговор", warning: "Предупреждение", complaint: "Жалоба" } as const;
const TERM_LABEL = {
  hire: "Найм",
  level_change: "Изменение должности",
  fire: "Снятие",
  rehire: "Восстановление",
} as const;

export default async function MemberPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePageAuth("TEAM_VIEW");
  const { id } = await params;
  const targetId = Number(id);
  if (!Number.isInteger(targetId) || targetId <= 0) notFound();

  const db = getDb();
  const [target] = await db.select().from(users).where(eq(users.id, targetId)).limit(1);
  if (!target) notFound();

  const [ratings, discipline, terms, inactivities] = await Promise.all([
    db
      .select()
      .from(ratingEvents)
      .where(eq(ratingEvents.userId, target.id))
      .orderBy(desc(ratingEvents.at))
      .limit(20),
    db
      .select()
      .from(disciplinaryActions)
      .where(eq(disciplinaryActions.userId, target.id))
      .orderBy(desc(disciplinaryActions.at))
      .limit(20),
    db
      .select()
      .from(staffTerms)
      .where(eq(staffTerms.userId, target.id))
      .orderBy(desc(staffTerms.at))
      .limit(20),
    db
      .select()
      .from(inactivityPeriods)
      .where(eq(inactivityPeriods.userId, target.id))
      .orderBy(desc(inactivityPeriods.createdAt))
      .limit(10),
  ]);

  const self = target.id === actor.id;
  const manageable = !self && canManage(actor.level, target.level, self) && actor.status === "active";
  const maxLevel = manageable ? assignableLevel(actor.level) : 0;

  return (
    <div className="space-y-6">
      <header>
        <Link href="/panel/team" className="link-accent text-sm">
          ← Состав
        </Link>
      </header>

      <section className="card flex flex-wrap items-center gap-5 p-6">
        <Avatar name={target.displayName} url={target.avatarUrl} size={72} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-bold">{target.displayName}</h1>
            <span className="badge-level">{levelName(target.level)}</span>
            <span
              className={
                target.status === "active"
                  ? "badge-ok"
                  : target.status === "suspended"
                    ? "badge-warn"
                    : "badge-bad"
              }
            >
              {target.status === "active"
                ? "Активен"
                : target.status === "suspended"
                  ? "Приостановлен"
                  : "Снят с поста"}
            </span>
          </div>
          <p className="mt-1 text-mist">{target.roleTitle}</p>
          <dl className="mt-4 grid grid-cols-2 gap-x-8 gap-y-2 text-sm md:grid-cols-4">
            <div>
              <dt className="text-xs text-mist">Логин</dt>
              <dd>@{target.username}</dd>
            </div>
            <div>
              <dt className="text-xs text-mist">Рейтинг</dt>
              <dd className="font-semibold text-accent">{target.rating}</dd>
            </div>
            <div>
              <dt className="text-xs text-mist">Стаж</dt>
              <dd>
                {daysLabel(daysSince(target.hiredAt))}
                <span className="ml-1 text-xs text-mist">с {formatDate(target.hiredAt)}</span>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-mist">На уровне</dt>
              <dd>{daysLabel(daysSince(target.levelAssignedAt))}</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* Действия */}
      <section className="grid gap-4 lg:grid-cols-2">
        {manageable && actorCan(actor, "RATING_MANAGE") && (
          <div className="card p-5">
            <h2 className="section-title mb-3">Рейтинг</h2>
            <RatingForm userId={target.id} />
          </div>
        )}
        {manageable && actorCan(actor, "DISCIPLINE_MANAGE") && (
          <div className="card p-5">
            <h2 className="section-title mb-3">Дисциплина</h2>
            <DisciplineForm userId={target.id} />
          </div>
        )}
        {manageable && actorCan(actor, "TEAM_MANAGE") && (
          <div className="card p-5">
            <h2 className="section-title mb-3">Уровень и должность</h2>
            <LevelForm
              userId={target.id}
              currentLevel={target.level}
              currentRole={target.roleTitle}
              maxLevel={maxLevel}
            />
          </div>
        )}
        {manageable && actorCan(actor, "PASSWORD_RESET") && (
          <div className="card p-5">
            <h2 className="section-title mb-3">Сброс пароля</h2>
            <PasswordResetForm userId={target.id} username={target.username} />
          </div>
        )}
        {manageable && actorCan(actor, "TEAM_MANAGE") && target.status !== "blocked" && (
          <div className="card border-rose/30 p-5">
            <h2 className="section-title mb-3 text-rose">Снятие с поста</h2>
            <FireForm userId={target.id} />
          </div>
        )}
      </section>

      {/* Истории */}
      <section className="grid gap-4 lg:grid-cols-2">
        <HistoryCard
          title="История рейтинга"
          empty="Изменений рейтинга не было."
          rows={ratings.map((r) => ({
            key: r.id,
            title: `${r.delta > 0 ? "+" : ""}${r.delta} → ${r.balanceAfter}`,
            sub: `${r.reason} · ${formatDateTime(r.at)}`,
            tone: r.delta > 0 ? "text-leaf" : "text-rose",
          }))}
        />
        <HistoryCard
          title="Дисциплина"
          empty="Нарушений не зафиксировано."
          rows={discipline.map((d) => ({
            key: d.id,
            title: TYPE_LABEL[d.type],
            sub: `${d.reason} · ${formatDateTime(d.at)}`,
            tone: d.type === "warning" ? "text-amber" : "text-rose",
          }))}
        />
        <HistoryCard
          title="История должностей"
          empty="Записей нет."
          rows={terms.map((t) => ({
            key: t.id,
            title: `${TERM_LABEL[t.kind]} — ${levelName(t.level)}`,
            sub: `${t.roleTitle}${t.reason ? ` · ${t.reason}` : ""} · ${formatDateTime(t.at)}`,
          }))}
        />
        <HistoryCard
          title="Неактивы"
          empty="Заявок на неактив не было."
          rows={inactivities.map((p) => ({
            key: p.id,
            title: `до ${formatDate(p.until)} — ${
              p.status === "approved"
                ? "одобрен"
                : p.status === "rejected"
                  ? "отклонён"
                  : "ожидает"
            }`,
            sub: `${p.reason} · ${formatDateTime(p.createdAt)}`,
            tone:
              p.status === "approved"
                ? "text-leaf"
                : p.status === "rejected"
                  ? "text-rose"
                  : "text-amber",
          }))}
        />
      </section>
    </div>
  );
}

function HistoryCard({
  title,
  empty,
  rows,
}: {
  title: string;
  empty: string;
  rows: { key: number; title: string; sub: string; tone?: string }[];
}) {
  return (
    <div className="card p-5">
      <h2 className="section-title mb-4">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-mist">{empty}</p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((r) => (
            <li key={r.key} className="rounded-xl border border-edge/60 bg-abyss px-3 py-2">
              <p className={`text-sm font-semibold ${r.tone ?? ""}`}>{r.title}</p>
              <p className="mt-0.5 text-xs text-mist">{r.sub}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
