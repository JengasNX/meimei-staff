import Link from "next/link";
import { desc } from "drizzle-orm";
import { requirePageAuth } from "@/server/auth";
import { getDb } from "@/db";
import { disciplinaryActions, inactivityPeriods, users } from "@/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import { Avatar } from "@/components/avatar";
import { levelName } from "@/lib/rbac/levels";
import { daysLabel, daysSince, formatDate } from "@/lib/utils";

export default async function TeamListPage() {
  const actor = await requirePageAuth("TEAM_VIEW");
  const db = getDb();

  const members = await db
    .select()
    .from(users)
    .orderBy(desc(users.level), users.displayName);

  const counts = await db
    .select({
      userId: disciplinaryActions.userId,
      type: disciplinaryActions.type,
      count: sql<number>`count(*)::int`,
    })
    .from(disciplinaryActions)
    .groupBy(disciplinaryActions.userId, disciplinaryActions.type);

  const actives = await db
    .select({ userId: inactivityPeriods.userId, until: inactivityPeriods.until })
    .from(inactivityPeriods)
    .where(and(eq(inactivityPeriods.status, "approved"), gte(inactivityPeriods.until, new Date())));

  const pen = new Map<number, { r: number; w: number; c: number }>();
  for (const row of counts) {
    const e = pen.get(row.userId) ?? { r: 0, w: 0, c: 0 };
    if (row.type === "reprimand") e.r = row.count;
    if (row.type === "warning") e.w = row.count;
    if (row.type === "complaint") e.c = row.count;
    pen.set(row.userId, e);
  }
  const inact = new Map<number, Date>(actives.map((a) => [a.userId, a.until]));

  const STATUS = {
    active: { text: "Активен", cls: "badge-ok" },
    suspended: { text: "Приостановлен", cls: "badge-warn" },
    blocked: { text: "Снят с поста", cls: "badge-bad" },
  } as const;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Состав</h1>
          <p className="mt-1 text-sm text-mist">{members.length} сотрудников</p>
        </div>
      </header>

      <div className="card overflow-x-auto">
        <table className="table-base min-w-[900px]">
          <thead>
            <tr>
              <th>Участник</th>
              <th>Уровень</th>
              <th>Рейтинг</th>
              <th>В / П / Ж</th>
              <th>Стаж</th>
              <th>Неактив</th>
              <th>Статус</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const status = STATUS[m.status];
              const inactive = inact.get(m.id);
              const p = pen.get(m.id) ?? { r: 0, w: 0, c: 0 };
              return (
                <tr key={m.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <Avatar name={m.displayName} url={m.avatarUrl} size={36} />
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{m.displayName}</p>
                        <p className="truncate text-xs text-mist">{m.roleTitle}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="badge-level">{levelName(m.level)}</span>
                  </td>
                  <td className="font-semibold text-accent">{m.rating}</td>
                  <td>
                    <span className={p.r ? "text-rose" : ""}>{p.r}</span>
                    {" / "}
                    <span className={p.w ? "text-amber" : ""}>{p.w}</span>
                    {" / "}
                    {p.c}
                  </td>
                  <td className="text-mist">{daysLabel(daysSince(m.hiredAt))}</td>
                  <td className="text-mist">
                    {inactive ? `до ${formatDate(inactive)}` : "—"}
                  </td>
                  <td>
                    <span className={status.cls}>{status.text}</span>
                  </td>
                  <td>
                    <Link href={`/panel/team/${m.id}`} className="link-accent text-xs">
                      Открыть
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {actor.level >= 6 ? (
        <p className="text-xs text-mist">
          Приём новых сотрудников — через раздел «Инвайты» и заявки.
        </p>
      ) : null}
    </div>
  );
}
