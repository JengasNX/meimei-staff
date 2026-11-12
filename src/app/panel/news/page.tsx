import { desc, eq } from "drizzle-orm";
import { requirePageAuth } from "@/server/auth";
import { getDb } from "@/db";
import { news, users } from "@/db/schema";
import { formatDateTime } from "@/lib/utils";
import { NewsDeleteButton, NewsForm } from "@/components/panel/manage-forms";

export default async function PanelNewsPage() {
  await requirePageAuth("NEWS_MANAGE");

  const items = await getDb()
    .select({
      id: news.id,
      title: news.title,
      body: news.body,
      publishedAt: news.publishedAt,
      authorName: users.displayName,
    })
    .from(news)
    .leftJoin(users, eq(users.id, news.authorId))
    .orderBy(desc(news.publishedAt))
    .limit(50);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold">Новости</h1>
        <p className="mt-1 text-sm text-mist">Публикации видны всем на публичной странице новостей.</p>
      </header>

      <section className="card p-5">
        <h2 className="section-title mb-4">Новая публикация</h2>
        <NewsForm />
      </section>

      <section className="space-y-3">
        {items.length === 0 && (
          <div className="card p-8 text-center text-sm text-mist">Публикаций пока нет.</div>
        )}
        {items.map((n) => (
          <article key={n.id} className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-bold">{n.title}</h3>
                <p className="text-xs text-mist">
                  {formatDateTime(n.publishedAt)} · автор: {n.authorName ?? "система"}
                </p>
              </div>
              <NewsDeleteButton newsId={n.id} />
            </div>
            <p className="mt-3 line-clamp-4 whitespace-pre-line text-sm text-mist">{n.body}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
