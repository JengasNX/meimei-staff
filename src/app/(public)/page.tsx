import Link from "next/link";
import { ArrowRight, Newspaper, ShieldCheck, Users } from "lucide-react";
import { getPublicStats } from "@/lib/queries/public";
import { gameSite, site } from "@/lib/config/site";

export default async function HomePage() {
  const stats = await getPublicStats();

  return (
    <div className="space-y-20">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-edge bg-abyss px-6 py-16 text-center md:px-12 md:py-24">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(84,168,255,0.18),transparent_70%)]"
        />
        <p className="section-title">{site.tagline}</p>
        <h1 className="mx-auto mt-4 max-w-3xl font-display text-4xl font-extrabold leading-tight md:text-6xl">
          Сайт <span className="text-accent">персонала</span> {site.name}
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-mist md:text-lg">
          Единый центр команды проекта: состав и уровни, рейтинг и дисциплина,
          новости и заявки на вступление. Личный кабинет — для сотрудников.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link href="/team" className="btn-primary">
            Состав команды <ArrowRight className="size-4" />
          </Link>
          <Link href="/join" className="btn-ghost">
            Вступить в команду
          </Link>
          <a href={gameSite} target="_blank" rel="noreferrer" className="btn-ghost">
            Сайт игры
          </a>
        </div>

        {stats.available && (
          <div className="mx-auto mt-12 grid max-w-xl grid-cols-3 gap-3 text-center">
            <div className="card px-4 py-5">
              <div className="font-display text-2xl font-bold text-accent">{stats.total}</div>
              <div className="mt-1 text-xs text-mist">всего персонала</div>
            </div>
            <div className="card px-4 py-5">
              <div className="font-display text-2xl font-bold text-leaf">{stats.active}</div>
              <div className="mt-1 text-xs text-mist">активных</div>
            </div>
            <div className="card px-4 py-5">
              <div className="font-display text-2xl font-bold text-amber">
                {stats.pendingRequests}
              </div>
              <div className="mt-1 text-xs text-mist">заявок ждёт</div>
            </div>
          </div>
        )}
      </section>

      {/* Возможности */}
      <section className="grid gap-4 md:grid-cols-3">
        {[
          {
            icon: Users,
            title: "Состав 1–7 уровней",
            text: "Иерархия как в лучших админ-системах: от младшего состава до основателя, с должностями, стажем и неактивами.",
          },
          {
            icon: ShieldCheck,
            title: "Рейтинг и дисциплина",
            text: "Очки, выговоры, предупреждения и жалобы — история неизменяема, каждое действие фиксируется в журнале аудита.",
          },
          {
            icon: Newspaper,
            title: "Новости и заявки",
            text: "Объявления для команды и открытый приём заявок: заполните форму — руководство рассмотрит её в кабинете.",
          },
        ].map(({ icon: Icon, title, text }) => (
          <article key={title} className="card p-6">
            <span className="grid size-11 place-items-center rounded-xl bg-accent/15 text-accent">
              <Icon className="size-5" />
            </span>
            <h2 className="mt-4 font-display text-lg font-bold">{title}</h2>
            <p className="mt-2 text-sm text-mist">{text}</p>
          </article>
        ))}
      </section>

      {/* CTA */}
      <section className="card flex flex-col items-center gap-4 p-10 text-center">
        <h2 className="font-display text-2xl font-bold">Хочешь в команду?</h2>
        <p className="max-w-xl text-mist">
          Мы ищем активных и ответственных. Заполнить заявку — несложно,
          а рассмотреть её могут за один вечер.
        </p>
        <Link href="/join" className="btn-primary">
          Заполнить заявку <ArrowRight className="size-4" />
        </Link>
      </section>
    </div>
  );
}
