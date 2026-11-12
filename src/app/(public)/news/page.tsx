import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import { getNews } from "@/lib/queries/public";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Новости" };

export default async function NewsPage() {
  const items = await getNews();

  if (items === null) {
    return (
      <div className="card p-10 text-center text-mist">
        База данных пока не подключена. Новости появятся после настройки Supabase.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="text-center">
        <h1 className="font-display text-3xl font-bold md:text-4xl">Новости</h1>
        <p className="mt-3 text-mist">Объявления и важные события проекта.</p>
      </header>

      {items.length === 0 ? (
        <div className="card p-10 text-center text-mist">Новостей пока нет.</div>
      ) : (
        <div className="space-y-4">
          {items.map((n) => (
            <article key={n.id} className="card p-6">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-display text-lg font-bold">{n.title}</h2>
                <span className="badge-muted">
                  <CalendarDays className="size-3" />
                  {formatDateTime(n.publishedAt)}
                </span>
              </div>
              <div className="mt-4 whitespace-pre-line text-sm leading-relaxed text-mist">
                {n.body}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
