/**
 * Мини-раннер миграций без внешних зависимостей.
 * Применяет migrations/*.sql по алфавиту, каждый файл — в транзакции.
 * Учёт применённых — таблица schema_migrations.
 *
 * Использование: npm run db:migrate [-- --status]
 */
import "dotenv/config";
import postgres from "postgres";

const DIRECT_URL = process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "";
if (!DIRECT_URL) {
  console.error("Не задан DATABASE_URL (или DIRECT_URL). Заполни .env.local.");
  process.exit(1);
}

const sql = postgres(DIRECT_URL, { prepare: false, max: 1 });
const statusOnly = process.argv.includes("--status");

async function main() {
  await sql`create table if not exists schema_migrations (
    name text primary key,
    applied_at timestamptz not null default now()
  )`;

  const applied = new Set(
    (await sql`select name from schema_migrations`).map((r) => r.name as string),
  );

  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const dir = path.resolve(process.cwd(), "migrations");
  let files: string[] = [];
  try {
    files = (await fs.readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
  } catch {
    console.error("Папка migrations/ не найдена.");
    process.exit(1);
  }

  if (statusOnly) {
    for (const f of files) console.log(`[${applied.has(f) ? "applied" : "pending"}] ${f}`);
    await sql.end();
    return;
  }

  for (const file of files) {
    if (applied.has(file)) continue;
    const content = await fs.readFile(path.join(dir, file), "utf8");
    console.log(`Применяю ${file}…`);
    await sql.begin(async (tx) => {
      await tx.unsafe(content);
      await tx`insert into schema_migrations (name) values (${file})`;
    });
    console.log(`Готово: ${file}`);
  }

  await sql.end();
  console.log("Миграции применены.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
