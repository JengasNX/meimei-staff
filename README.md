# meimei-staff — сайт персонала «Слово Меймея»

Публичная часть (состав, новости, заявки на вступление) + закрытый личный
кабинет (логин/пароль, инвайт-коды, рейтинг, дисциплина, аудит).

**Живой сайт:** https://meimei-staff.netlify.app

## Стек

- Next.js 16 (App Router, Server Actions) + React 19 + TypeScript
- Tailwind CSS v4 (токены в `src/app/globals.css`)
- PostgreSQL (Netlify Database на базе Neon) + Drizzle ORM
- Сессии: HS256 JWT в httpOnly-cookie (`jose`), пароли: scrypt (`node:crypto`)
- Валидация: zod · Иконки: Lucide
- Хостинг: Netlify (`netlify.toml`, плагин `@netlify/plugin-nextjs`)

## Запуск

```bash
npm install
npm run dev                      # http://localhost:3000
```

Локальная БД стартует вместе с `netlify dev` и управляется Netlify:

```bash
netlify dev                      # dev-сервер + локальная БД
netlify db migrations apply      # применить netlify/database/migrations локально
netlify db connect --query "SELECT username FROM users"
```

Другие скрипты: `db:generate` (после правок `src/db/schema.ts`),
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
netlify/database/migrations/ — SQL-миграции: схема, триггеры целостности, сид
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

## База данных

Netlify Database создаётся автоматически при деплое (пакет `@netlify/database`).
Миграции из `netlify/database/migrations/` применяются при каждом деплое:

1. схема (10 таблиц, enum'ы, индексы) — сгенерирована drizzle-kit;
2. триггеры целостности (append-only аудит, ledger-проверка рейтинга, updated_at);
3. сид: основатель `founder` + демо-состав (идемпотентно — только если `users` пуста).

Клиент читает `DATABASE_URL`, а в окружении Netlify — `NETLIFY_DB_URL` автоматически.

## Деплой

```bash
netlify deploy --build --prod
```

Переменные окружения Netlify: `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`
(`netlify env:set …`). Строка БД подставляется платформой сама.

Первый вход: `/login` под `founder` (пароль задаётся при сида) → сразу сменить
пароль в профиле → создать реальный состав через инвайты.
