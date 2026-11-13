/**
 * Drizzle-клиент. DATABASE_URL подставляется из .env.local (локально)
 * или переменных окружения Vercel (прод).
 *
 * Клиент создаётся лениво (при первом обращении), чтобы сборка не падала
 * без ключа БД — страницы в этом случае отдают «пустое» состояние.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let _client: ReturnType<typeof postgres> | null = null;

export function getDb() {
  const url =
    process.env.DATABASE_URL ??
    process.env.NETLIFY_DB_URL ??
    process.env.NETLIFY_DATABASE_URL_WITH_POOL ??
    process.env.NETLIFY_DATABASE_URL;
  if (!url) {
    throw new Error("База данных не настроена: переменная DATABASE_URL не задана.");
  }
  if (!_client) {
    _client = postgres(url, { prepare: false, max: 5 });
  }
  return drizzle(_client, { schema });
}

export type Db = ReturnType<typeof getDb>;
/** Тип транзакционного клиента (параметр колбэка db.transaction). */
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/**
 * Ленивый экспорт `db`: свойства резолвятся на реальный клиент при каждом
 * обращении, поэтому импортировать можно без опасений на этапе сборки.
 */
export const db = new Proxy({} as Db, {
  get(_target, prop) {
    const real = getDb() as unknown as Record<string | symbol, unknown>;
    const value = real[prop];
    return typeof value === "function" ? value.bind(real) : value;
  },
});
