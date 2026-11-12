# meimei-staff — сайт персонала «Слово Меймея»

Публичная часть (состав, новости, заявки на вступление) + закрытый личный
кабинет (логин/пароль, инвайт-коды, рейтинг, дисциплина, аудит).

Дизайн и архитектурные решения унаследованы от:
- **meimei-website** — дизайн-токены (тёмная тема, акцент `#54a8ff`, шрифты Unbounded + Inter);
- **admin.arztools.ru** — иерархия персонала 1–7 уровней, профиль с метриками, неактивы;
- **r-arrow.ru** — неизменяемая история рейтинга/наказаний, журнал аудита;
- **arizona-brainburg-admin** — серверные проверки прав, append-only ledger, pipeline.

## Стек

- Next.js 16 (App Router, Server Actions) + React 19 + TypeScript
- Tailwind CSS v4 (токены в `src/app/globals.css`)
- PostgreSQL (Supabase) + Drizzle ORM
- Сессии: HS256 JWT в httpOnly-cookie (`jose`), пароли: scrypt (`node:crypto`)
- Валидация: zod · Иконки: Lucide

## Запуск

```bash
npm install
copy .env.example .env.local     # Windows
# заполни DATABASE_URL и AUTH_SECRET
npm run db:migrate               # применить migrations/*.sql
npm run db:seed                  # основатель + демо-состав (идемпотентно)
npm run dev                      # http://localhost:3000
```

Другие скрипты: `db:migrate:status`, `db:generate` (после правок `src/db/schema.ts`),
`lint`, `typecheck`, `build`, `start`.

## Структура

```
src/app/(public)/      — публичные страницы: /, /team, /news, /join, /login, /register
src/app/panel/         — личный кабинет (защищён requirePageAuth)
src/app/actions/       — server actions входа/регистрации/заявок
src/app/panel/actions.ts — server actions управления (рейтинг, дисциплина, уровень…)
src/lib/rbac/          — уровни 1–7, каталог прав, чистый движок проверок
src/lib/auth/          — пароли (scrypt), сессии (JWT)
src/server/            — requirePageAuth/requireActionAuth, аудит, rate-limit
src/db/                — Drizzle схема и клиент
migrations/            — SQL: 0000 (drizzle-kit generate) + 0001_integrity.sql (триггеры)
scripts/               — migrate.ts, seed.ts
```

## Модель доступа

Уровни: 1 Младший состав → 2 Состав → 3 Старший → 4 Куратор →
5 Зам. ГА → 6 ГА → 7 Основатель. Права выдаются уровнем (`src/lib/rbac/permissions.ts`):

| Право | С уровня |
|---|---|
| Дашборд, состав, свой профиль | 1 |
| Запрос неактива | 2 |
| Журнал, просмотр заявок | 3 |
| Заявки, наказания, рейтинг, неактивы, новости | 4 |
| Инвайты, сброс паролей | 5 |
| Наём/снятие/изменение уровня | 6 |
| Системное (всё) | 7 |

Правила: нельзя управлять сотрудником своего уровня и выше; назначать уровень
только ниже своего; неактивный аккаунт ничего не может; каждое действие — запись
в append-only аудит.

## Что показать перед запуском

1. `.env.local` — DATABASE_URL (Supabase pooled), AUTH_SECRET (`openssl rand -base64 48`), NEXT_PUBLIC_APP_URL.
2. `npm run db:migrate` → `npm run db:seed` — сохрани напечатанный пароль основателя.
3. Войти `/login` под `founder`, сменить пароль, создать реальный состав через инвайты.
4. В `src/lib/config/site.ts` — ссылки Roblox/Discord/Telegram (пока пустые заглушки).

## Деплой (Vercel)

1. Импортировать репозиторий в Vercel.
2. Environment Variables: DATABASE_URL, DIRECT_URL, AUTH_SECRET, NEXT_PUBLIC_APP_URL.
3. Миграции применить локально (`npm run db:migrate` с DATABASE_URL) — схема одинаковая.
4. Первый вход: `founder` + пароль из сида.
