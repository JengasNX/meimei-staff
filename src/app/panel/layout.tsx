import { redirect } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { PanelNav, type PanelItem } from "@/components/panel/panel-nav";
import { logoutAction } from "@/app/actions/auth";
import { getActor } from "@/server/auth";
import { actorCan } from "@/lib/rbac/engine";
import { levelName } from "@/lib/rbac/levels";
import { Avatar } from "@/components/avatar";
import { site } from "@/lib/config/site";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const actor = await getActor().catch(() => null);
  if (!actor) redirect("/login");

  const items: PanelItem[] = [
    { href: "/panel", label: "Дашборд", icon: "dashboard", show: true },
    { href: "/panel/team", label: "Состав", icon: "team", show: actorCan(actor, "TEAM_VIEW") },
    {
      href: "/panel/requests",
      label: "Заявки",
      icon: "requests",
      show: actorCan(actor, "JOIN_VIEW"),
    },
    {
      href: "/panel/inactivity",
      label: "Неактивы",
      icon: "inactivity",
      show: actorCan(actor, "INACTIVITY_MANAGE"),
    },
    { href: "/panel/news", label: "Новости", icon: "news", show: actorCan(actor, "NEWS_MANAGE") },
    {
      href: "/panel/journal",
      label: "Журнал",
      icon: "journal",
      show: actorCan(actor, "AUDIT_VIEW"),
    },
    {
      href: "/panel/invites",
      label: "Инвайты",
      icon: "invites",
      show: actorCan(actor, "INVITES_MANAGE"),
    },
    { href: "/panel/profile", label: "Профиль", icon: "profile", show: true },
  ];
  const nav = items.filter((i) => i.show);

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="flex shrink-0 flex-col border-b border-edge bg-abyss lg:h-dvh lg:w-64 lg:border-r lg:border-b-0">
        <div className="flex items-center gap-2.5 px-4 py-4">
          <span className="grid size-9 place-items-center rounded-xl bg-accent/15 font-display text-sm font-bold text-accent">
            M
          </span>
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-bold">{site.name}</p>
            <p className="text-[10px] uppercase tracking-[0.25em] text-mist">персонал</p>
          </div>
        </div>

        <PanelNav items={nav} />

        <div className="mt-auto border-t border-edge p-4">
          <div className="mb-3 flex items-center gap-3">
            <Avatar name={actor.displayName} url={actor.avatarUrl} size={38} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{actor.displayName}</p>
              <p className="truncate text-xs text-mist">
                {levelName(actor.level)} · {actor.roleTitle}
              </p>
            </div>
          </div>
          <form action={logoutAction}>
            <button type="submit" className="btn-ghost btn-sm w-full">
              Выйти
            </button>
          </form>
        </div>
      </aside>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {actor.mustChangePassword && (
          <div className="flex items-center gap-2 border-b border-amber/40 bg-amber/10 px-4 py-2.5 text-sm text-amber">
            <AlertTriangle className="size-4 shrink-0" />
            Пароль временный —{" "}
            <a href="/panel/profile" className="underline">
              смените его в профиле
            </a>
            .
          </div>
        )}
        {actor.status === "suspended" && (
          <div className="flex items-center gap-2 border-b border-amber/40 bg-amber/10 px-4 py-2.5 text-sm text-amber">
            <AlertTriangle className="size-4 shrink-0" />
            Аккаунт приостановлен: доступно только чтение.
          </div>
        )}
        <main className="flex-1 px-4 py-8 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
