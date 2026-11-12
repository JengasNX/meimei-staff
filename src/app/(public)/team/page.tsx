import type { Metadata } from "next";
import { Coffee, Star } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { getTeamData } from "@/lib/queries/public";
import { levelName } from "@/lib/rbac/levels";
import { daysLabel, daysSince, formatDate, isFuture } from "@/lib/utils";

export const metadata: Metadata = { title: "Состав" };

const STATUS_LABEL = {
  active: { text: "Активен", cls: "badge-ok" },
  suspended: { text: "Приостановлен", cls: "badge-warn" },
  blocked: { text: "Заблокирован", cls: "badge-bad" },
} as const;

export default async function TeamPage() {
  const { available, members } = await getTeamData();

  if (!available) {
    return (
      <div className="card p-10 text-center text-mist">
        База данных пока не подключена. Состав появится после настройки Supabase.
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="card p-10 text-center text-mist">
        Состав ещё не сформирован. Загляните позже!
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="text-center">
        <h1 className="font-display text-3xl font-bold md:text-4xl">Состав команды</h1>
        <p className="mt-3 text-mist">
          Уровни 1–7: от младшего состава до основателя. Все данные открыты.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {members.map((m) => {
          const status = STATUS_LABEL[m.status];
          const inActive =
            m.inactiveUntil && isFuture(m.inactiveUntil);
          return (
            <article key={m.id} className="card p-5">
              <div className="flex items-start gap-4">
                <Avatar name={m.displayName} url={m.avatarUrl} size={56} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-lg font-bold">{m.displayName}</h2>
                    <span className="badge-level">{levelName(m.level)}</span>
                    <span className={status.cls}>{status.text}</span>
                    {inActive && (
                      <span className="badge-warn">
                        <Coffee className="size-3" /> неактив до {formatDate(m.inactiveUntil)}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-sm text-mist">{m.roleTitle}</p>

                  <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-4">
                    <div>
                      <dt className="text-xs text-mist">Рейтинг</dt>
                      <dd className="flex items-center gap-1 font-semibold text-accent">
                        <Star className="size-3.5" /> {m.rating}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-mist">Стаж</dt>
                      <dd className="font-semibold">{daysLabel(daysSince(m.hiredAt))}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-mist">Выговоры</dt>
                      <dd className={m.reprimands > 0 ? "font-semibold text-rose" : "font-semibold"}>
                        {m.reprimands}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-mist">Предупреждения</dt>
                      <dd className={m.warnings > 0 ? "font-semibold text-amber" : "font-semibold"}>
                        {m.warnings}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
