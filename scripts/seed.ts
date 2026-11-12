/**
 * Идемпотентный сид: каталог есть в коде (RBAC), в БД сидируем только
 * основателя и демо-данные.
 *
 * Основатель: логин `founder`, пароль из FOUNDER_PASSWORD или случайный,
 * который печатается в консоль один раз.
 *
 * Демо-данные создаются только если в users нет никого, кроме основателя.
 *
 * Использование: npm run db:seed
 */
import "dotenv/config";
import postgres from "postgres";
import { randomBytes, scrypt as _scrypt } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(_scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

async function hash(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

const url = process.env.DATABASE_URL ?? "";
if (!url) {
  console.error("Не задан DATABASE_URL. Заполни .env.local.");
  process.exit(1);
}
const sql = postgres(url, { prepare: false, max: 1 });

async function main() {
  const [{ count }] = await sql`select count(*)::int as count from users`;
  if (count > 0) {
    console.log(`В users уже ${count} записей — сид пропущен (идемпотентно).`);
    await sql.end();
    return;
  }

  const founderPassword = process.env.FOUNDER_PASSWORD ?? randomBytes(9).toString("base64url");
  const [founder] = await sql`
    insert into users (username, password_hash, display_name, level, role_title, hired_at, level_assigned_at)
    values ('founder', ${await hash(founderPassword)}, 'Основатель', 7, 'Основатель проекта', now(), now())
    returning id
  `;
  await sql`
    insert into staff_terms (user_id, kind, level, role_title, reason)
    values (${founder.id}, 'hire', 7, 'Основатель проекта', 'Первичная инициализация')
  `;

  // Демо-состав (удаляется/заменяется реальными людьми через панель)
  const demo = [
    { u: "deputy", n: "З deputy", l: 6, r: "Заместитель основателя" },
    { u: "curator", n: "Куратор Мей", l: 4, r: "Куратор контента" },
    { u: "senior", n: "Старший состав", l: 3, r: "Старший модератор" },
    { u: "member", n: "Состав", l: 2, r: "Модератор" },
    { u: "junior", n: "Младший состав", l: 1, r: "Хелпер" },
  ];
  for (const d of demo) {
    const [row] = await sql`
      insert into users (username, password_hash, display_name, level, role_title)
      values (${d.u}, ${await hash("meimei-demo")}, ${d.n}, ${d.l}, ${d.r})
      returning id
    `;
    await sql`
      insert into staff_terms (user_id, kind, level, role_title, reason)
      values (${row.id}, 'hire', ${d.l}, ${d.r}, 'Демо-сотрудник')
    `;
    await sql`
      insert into rating_events (user_id, delta, balance_before, balance_after, reason, actor_id)
      values (${row.id}, 100, 0, 100, 'Стартовый рейтинг (демо)', ${founder.id})
    `;
    await sql`update users set rating = 100 where id = ${row.id}`;
  }

  await sql`
    insert into news (title, body, author_id)
    values (
      'Сайт персонала запущен',
      'Открыт сайт персонала проекта «Слово Меймея»: состав, рейтинг, дисциплина, новости и заявки на вступление. Демо-сотрудники созданы сидом — замени их через панель управления.',
      ${founder.id}
    )
  `;

  await sql`
    insert into invites (code, level, role_title, created_by, expires_at)
    values ('DEMO-INVITE-24', 2, 'Модератор', ${founder.id}, now() + interval '30 days')
  `;

  await sql.end();
  console.log("Сид выполнен.");
  console.log(`Логин основателя: founder`);
  console.log(`Пароль основателя: ${founderPassword}`);
  console.log("Демо-аккаунты: deputy / curator / senior / member / junior, пароль: meimei-demo");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
