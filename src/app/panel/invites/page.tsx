import { desc, eq } from "drizzle-orm";
import { requirePageAuth } from "@/server/auth";
import { getDb } from "@/db";
import { invites, users } from "@/db/schema";
import { assignableLevel } from "@/lib/rbac/engine";
import { CopyButton, InviteForm, InviteRevokeButton } from "@/components/panel/manage-forms";
import { formatDateTime, isFuture } from "@/lib/utils";

export default async function InvitesPage() {
  const actor = await requirePageAuth("INVITES_MANAGE");
  const maxLevel = assignableLevel(actor.level);
  const db = getDb();

  const rows = await db
    .select({
      id: invites.id,
      code: invites.code,
      level: invites.level,
      roleTitle: invites.roleTitle,
      expiresAt: invites.expiresAt,
      usedBy: invites.usedBy,
      usedAt: invites.usedAt,
      createdAt: invites.createdAt,
      usedByName: users.displayName,
    })
    .from(invites)
    .leftJoin(users, eq(users.id, invites.usedBy))
    .orderBy(desc(invites.createdAt))
    .limit(50);

  const unused = rows.filter((r) => !r.usedBy && isFuture(r.expiresAt));
  const usedOrExpired = rows.filter((r) => r.usedBy || !isFuture(r.expiresAt));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold">Инвайт-коды</h1>
        <p className="mt-1 text-sm text-mist">
          Код даёт право зарегистрироваться на выбранном уровне. Максимум для вас — уровень {maxLevel}.
        </p>
      </header>

      <section className="card p-5">
        <h2 className="section-title mb-4">Создать инвайт</h2>
        <InviteForm maxLevel={maxLevel} />
      </section>

      <section className="card p-5">
        <h2 className="section-title mb-4">Активные ({unused.length})</h2>
        {unused.length === 0 ? (
          <p className="text-sm text-mist">Активных инвайтов нет.</p>
        ) : (
          <ul className="space-y-3">
            {unused.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-edge/60 bg-abyss p-3"
              >
                <div className="min-w-0">
                  <code className="text-sm font-bold tracking-wider text-accent">{r.code}</code>
                  <p className="mt-0.5 text-xs text-mist">
                    Уровень {r.level} · {r.roleTitle} · действует до {formatDateTime(r.expiresAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <CopyButton text={r.code} />
                  <InviteRevokeButton inviteId={r.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {usedOrExpired.length > 0 && (
        <section className="card p-5">
          <h2 className="section-title mb-4">История</h2>
          <ul className="space-y-2 text-sm">
            {usedOrExpired.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2">
                <code className="text-xs text-mist">{r.code}</code>
                <span className="text-xs text-mist">
                  {r.usedBy
                    ? `использован: ${r.usedByName ?? `#${r.usedBy}`} · ${formatDateTime(r.usedAt)}`
                    : `истёк: ${formatDateTime(r.expiresAt)}`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
