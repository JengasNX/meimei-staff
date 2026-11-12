import type { Metadata } from "next";
import { JoinForm } from "@/components/forms/join-form";

export const metadata: Metadata = { title: "Вступить" };

const STEPS = [
  { n: 1, title: "Заполни заявку", text: "Ник, возраст, контакт и пара слов о себе — 2 минуты." },
  { n: 2, title: "Дождись ответа", text: "Руководство рассматривает заявки в личном кабинете." },
  { n: 3, title: "Получи инвайт", text: "После одобрения пришлём код регистрации и логин." },
];

export default function JoinPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <header className="text-center">
        <h1 className="font-display text-3xl font-bold md:text-4xl">Вступить в команду</h1>
        <p className="mt-3 text-mist">
          Мы ищем активных и ответственных. Заявки рассматривает руководство персонала.
        </p>
      </header>

      <ol className="grid gap-4 md:grid-cols-3">
        {STEPS.map((s) => (
          <li key={s.n} className="card p-5">
            <span className="grid size-9 place-items-center rounded-xl bg-accent/15 font-display font-bold text-accent">
              {s.n}
            </span>
            <h2 className="mt-3 font-display font-bold">{s.title}</h2>
            <p className="mt-1 text-sm text-mist">{s.text}</p>
          </li>
        ))}
      </ol>

      <section className="card p-6 md:p-8">
        <h2 className="font-display text-xl font-bold">Заявка</h2>
        <p className="mt-1 mb-6 text-sm text-mist">
          Отвечай честно и подробно — это первое, что о нас увидит руководство.
        </p>
        <JoinForm />
      </section>
    </div>
  );
}
