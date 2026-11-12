/**
 * Схема БД сайта персонала meimei (Drizzle ORM / PostgreSQL).
 *
 * Принципы (по мотивам arizona-brainburg-admin):
 *  - неизменяемые таблицы (rating_events, disciplinary_actions, audit_logs,
 *    staff_terms) — только INSERT; принудительно триггерами в 0001_integrity.sql;
 *  - рейтинг — производная от ledger: users.rating меняется только вместе
 *    с записью в rating_events (CHECK balance_after = balance_before + delta);
 *  - статусные домены через pgEnum.
 */
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/* ── Домены ─────────────────────────────────────────────────── */

export const userStatus = pgEnum("user_status", ["active", "suspended", "blocked"]);
export const disciplineType = pgEnum("discipline_type", ["reprimand", "warning", "complaint"]);
export const termKind = pgEnum("term_kind", ["hire", "level_change", "fire", "rehire"]);
export const inactivityStatus = pgEnum("inactivity_status", ["pending", "approved", "rejected"]);
export const requestStatus = pgEnum("request_status", ["pending", "accepted", "rejected"]);

/* ── Пользователи (персонал) ────────────────────────────────── */

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    /** Логин для входа: латиница/цифры, 3–32 символа, уникальный. */
    username: text("username").notNull(),
    passwordHash: text("password_hash").notNull(),
    /** Игровой ник для показа (может совпадать с username). */
    displayName: text("display_name").notNull(),
    /** Уровень 1–7 (иерархия персонала). */
    level: integer("level").notNull().default(1),
    /** Должность текстом, может быть несколько через «/» — как в admin.arztools. */
    roleTitle: text("role_title").notNull().default("Персонал"),
    /** Аватар: внешняя ссылка (v1 без загрузки файлов). */
    avatarUrl: text("avatar_url"),
    status: userStatus("status").notNull().default("active"),
    /** Производный рейтинг: меняется только вместе с rating_events. */
    rating: integer("rating").notNull().default(0),
    /** Дата найма (стаж всего) и дата присвоения текущего уровня. */
    hiredAt: timestamp("hired_at", { withTimezone: true }).notNull().defaultNow(),
    levelAssignedAt: timestamp("level_assigned_at", { withTimezone: true }).notNull().defaultNow(),
    /** true → при входе заставляем сменить пароль (после сброса админом). */
    mustChangePassword: boolean("must_change_password").notNull().default(false),
    /** Инкремент при logout-all / сбросе пароля инвалидирует все JWT. */
    tokenVersion: integer("token_version").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("users_username_key").on(t.username),
    check("users_level_range", sql`${t.level} between 1 and 7`),
  ],
);

/* ── История должностей (найм / изменение уровня / снятие) ───── */

export const staffTerms = pgTable(
  "staff_terms",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    kind: termKind("kind").notNull(),
    level: integer("level").notNull(),
    roleTitle: text("role_title").notNull(),
    reason: text("reason"),
    actorId: integer("actor_id"),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("staff_terms_user_idx").on(t.userId, t.at)],
);

/* ── Рейтинг: append-only ledger ────────────────────────────── */

export const ratingEvents = pgTable(
  "rating_events",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    delta: integer("delta").notNull(),
    balanceBefore: integer("balance_before").notNull(),
    balanceAfter: integer("balance_after").notNull(),
    reason: text("reason").notNull(),
    actorId: integer("actor_id"),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("rating_events_user_idx").on(t.userId, t.at),
    check("rating_events_ledger", sql`${t.balanceAfter} = ${t.balanceBefore} + ${t.delta}`),
    check("rating_delta_nonzero", sql`${t.delta} <> 0`),
  ],
);

/* ── Дисциплина: выговоры / предупреждения / жалобы ──────────── */

export const disciplinaryActions = pgTable(
  "disciplinary_actions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: disciplineType("type").notNull(),
    reason: text("reason").notNull(),
    actorId: integer("actor_id"),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("disciplinary_user_idx").on(t.userId, t.at)],
);

/* ── Неактивы ───────────────────────────────────────────────── */

export const inactivityPeriods = pgTable(
  "inactivity_periods",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    from: timestamp("from", { withTimezone: true }).notNull().defaultNow(),
    until: timestamp("until", { withTimezone: true }).notNull(),
    reason: text("reason").notNull(),
    status: inactivityStatus("status").notNull().default("pending"),
    actorId: integer("actor_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("inactivity_user_idx").on(t.userId, t.status)],
);

/* ── Новости ────────────────────────────────────────────────── */

export const news = pgTable("news", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  authorId: integer("author_id"),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ── Заявки на вступление ───────────────────────────────────── */

export const joinRequests = pgTable("join_requests", {
  id: serial("id").primaryKey(),
  nickname: text("nickname").notNull(),
  age: integer("age"),
  contact: text("contact").notNull(),
  about: text("about").notNull(),
  status: requestStatus("status").notNull().default("pending"),
  reviewNote: text("review_note"),
  reviewedBy: integer("reviewed_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ── Инвайт-коды ────────────────────────────────────────────── */

export const invites = pgTable(
  "invites",
  {
    id: serial("id").primaryKey(),
    code: text("code").notNull(),
    /** Уровень, с которым зарегистрируется новый участник (1–6). */
    level: integer("level").notNull().default(1),
    roleTitle: text("role_title").notNull().default("Персонал"),
    createdBy: integer("created_by"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedBy: integer("used_by"),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("invites_code_key").on(t.code),
    check("invites_level_range", sql`${t.level} between 1 and 6`),
  ],
);

/* ── Журнал аудита (append-only) ────────────────────────────── */

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: serial("id").primaryKey(),
    actorId: integer("actor_id"),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    details: jsonb("details"),
    ip: text("ip"),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_at_idx").on(t.at)],
);

/* ── Уведомления ────────────────────────────────────────────── */

export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.isRead)],
);
