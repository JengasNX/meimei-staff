import Link from "next/link";
import { ClipboardList, Coffee, Mail, Users } from "lucide-react";
import { requirePageAuth } from "@/server/auth";import { actorCan } from "@/lib/rbac/engine";
import { levelName } from "@/lib/rbac/levels";
import { getDb } from "@/db";
import {
  auditLogs,
  inactivityPeriods,
  joinRequests,
  notifications,
  users,
} from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { formatDateTime } from "@/lib/utils";

export default async function DashboardPage() {
  const actor = await requirePageAuth("DASHBOARD_VIEW");

  let counts = { total: 0, active: 0, pendingRequests: 0, pendingInactivity: 0, unread: 0 };
  let recentAudit: { id: number; action: string; at: Date }[] = [];

  try {
    const db = getDb();
    const [u] = await db
      .select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(*) filter (where ${users.status} = 'active')::int`,
      })
      .from(users);
    const [r] = await db
      .select({
        pending: sql<number>`count(*) filter (where ${joinRequests.status} = 'pending')::int`,
      })
      .from(joinRequests);
    const [i] = await db
      .select({
        pending: sql<number>`count(*) filter (where ${inactivityPeriods.status} = 'pending')::int`,
      })
      .from(inactivityPeriods);
    const [n] = await db
      .select({ unread: sql<number>`count(*)::int` })
      .from(notifications)
      .where(eq(notifications.userId, actor.id));
    counts = {
      total: u?.total ?? 0,
      active: u?.active ?? 0,
      pendingRequests: r?.pending ?? 0,
      pendingInactivity: i?.pending ?? 0,
      unread: n?.unread ?? 0,
    };

    if (actorCan(actor, "AUDIT_VIEW")) {
      recentAudit = await db
        .select({ id: auditLogs.id, action: auditLogs.action, at: auditLogs.at })
        .from(auditLogs)
        .orderBy(desc(auditLogs.at))
        .limit(6);
    }
  } catch {
    // без БД — показываем нули
  }

  const myNotifications = await (async () => {
    try {
      return await getDb()
        .select()
        .from(notifications)
        .where(eq(notifications.userId, actor.id))
        .orderBy(desc(notifications.createdAt))
        .limit(5);
    } catch {
      return [];
    }
  })();

  const cards = [
    { icon: Users, label: "Персонал", value: counts.total, sub: `${counts.active} активных` },
    {
      icon: ClipboardList,
      label: "Заявки",
      value: counts.pendingRequests,
      sub: "ожидают решения",
    },
    { icon: Coffee, label: "Неактивы", value: counts.pendingInactivity, sub: "на рассмотрении" },
    { icon: Mail, label: "Уведомления", value: counts.unread, sub: "для вас" },
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Дашборд</h1>
          <p className="mt-1 text-sm text-mist">
            {actor.displayName} · {levelName(actor.level)} · {actor.roleTitle}
          </p>
        </div>
        <Link href="/panel/team" className="btn-ghost btn-sm">
          Открыть состав
        </Link>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ icon: Icon, label, value, sub }) => (
          <article key={label} className="card p-5">
            <div className="flex items-center justify-between">
              <span className="grid size-10 place-items-center rounded-xl bg-accent/15 text-accent">
                <Icon className="size-5" />
              </span>
              <span className="font-display text-3xl font-bold">{value}</span>
            </div>
            <p className="mt-3 text-sm font-semibold">{label}</p>
            <p className="text-xs text-mist">{sub}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="section-title mb-4">Мои уведомления</h2>
          {myNotifications.length === 0 ? (
            <p className="text-sm text-mist">Уведомлений нет.</p>
          ) : (
            <ul className="space-y-3">
              {myNotifications.map((n) => (
                <li key={n.id} className="rounded-xl border border-edge/60 bg-abyss p-3">
                  <p className="text-sm font-semibold">{n.title}</p>
                  {n.body && <p className="mt-0.5 text-xs text-mist">{n.body}</p>}
                  <p className="mt-1 text-[11px] text-mist/70">{formatDateTime(n.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <h2 className="section-title mb-4">Последние действия</h2>
          {recentAudit.length === 0 ? (
            <p className="text-sm text-mist">Журнал пуст или недоступен.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {recentAudit.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3">
                  <code className="truncate text-xs text-accent">{a.action}</code>
                  <span className="shrink-0 text-xs text-mist">{formatDateTime(a.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
