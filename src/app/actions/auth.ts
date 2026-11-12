"use server";

import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { invites, notifications, staffTerms, users } from "@/db/schema";
import { generatePassword, hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  clearSessionCookie,
  makeSessionToken,
  setSessionCookie,
} from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { ActionError, requireActionAuth } from "@/server/auth";
import { isRateLimited, requestIp } from "@/server/rate-limit";

export type FormState = { error?: string; ok?: string } | null;

const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,32}$/, "Логин: 3–32 символа, латиница, цифры и «_».");

const passwordSchema = z
  .string()
  .min(8, "Пароль: минимум 8 символов.")
  .max(128, "Пароль слишком длинный.");

/* ── Вход ──────────────────────────────────────────────────── */

export async function loginAction(_state: FormState, formData: FormData): Promise<FormState> {
  const username = usernameSchema.safeParse(formData.get("username"));
  const password = z.string().min(1).safeParse(formData.get("password"));
  if (!username.success) return { error: username.error.issues[0]?.message };
  if (!password.success) return { error: password.error.issues[0]?.message };

  const h = await headers();
  const ip = requestIp(h);
  if (isRateLimited(`login:${ip}`, 10, 10 * 60_000)) {
    return { error: "Слишком много попыток входа. Подождите 10 минут." };
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, username.data))
    .limit(1);

  if (!user || !(await verifyPassword(password.data, user.passwordHash))) {
    await audit({ actorId: user?.id ?? null, action: "auth.login_failed", ip });
    return { error: "Неверный логин или пароль." };
  }
  if (user.status === "blocked") {
    return { error: "Аккаунт заблокирован. Обратитесь к руководству." };
  }

  await setSessionCookie(await makeSessionToken(user.id, user.tokenVersion));
  await audit({
    actorId: user.id,
    action: "auth.login",
    targetType: "user",
    targetId: user.id,
    ip,
  });

  if (user.mustChangePassword) redirect("/panel/profile?must=1");
  redirect("/panel");
}

/* ── Регистрация по инвайт-коду ────────────────────────────── */

export async function registerAction(_state: FormState, formData: FormData): Promise<FormState> {
  const code = z.string().trim().min(4).max(64).safeParse(formData.get("code"));
  const username = usernameSchema.safeParse(formData.get("username"));
  const displayName = z.string().trim().min(2).max(48).safeParse(formData.get("displayName"));
  const password = passwordSchema.safeParse(formData.get("password"));

  if (!code.success) return { error: "Введите инвайт-код." };
  if (!username.success) return { error: username.error.issues[0]?.message };
  if (!displayName.success) return { error: "Введите ник для показа (2–48 символов)." };
  if (!password.success) return { error: password.error.issues[0]?.message };

  const h = await headers();
  const ip = requestIp(h);
  if (isRateLimited(`register:${ip}`, 10, 10 * 60_000)) {
    return { error: "Слишком много попыток. Подождите 10 минут." };
  }

  const [invite] = await db
    .select()
    .from(invites)
    .where(
      and(
        eq(invites.code, code.data),
        isNull(invites.usedBy),
        gt(invites.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!invite) {
    return { error: "Инвайт-код недействителен, уже использован или истёк." };
  }

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username.data))
    .limit(1);
  if (existing) return { error: "Такой логин уже занят." };

  const [user] = await db
    .insert(users)
    .values({
      username: username.data,
      passwordHash: await hashPassword(password.data),
      displayName: displayName.data,
      level: invite.level,
      roleTitle: invite.roleTitle,
      hiredAt: new Date(),
      levelAssignedAt: new Date(),
    })
    .returning();

  await db
    .update(invites)
    .set({ usedBy: user.id, usedAt: new Date() })
    .where(eq(invites.id, invite.id));

  await db.insert(staffTerms).values({
    userId: user.id,
    kind: "hire",
    level: invite.level,
    roleTitle: invite.roleTitle,
    actorId: null,
  });

  await db.insert(notifications).values({
    userId: user.id,
    kind: "welcome",
    title: "Добро пожаловать в команду!",
    body: "Заполните профиль и следите за уведомлениями здесь.",
  });

  await audit({
    actorId: user.id,
    action: "auth.register",
    targetType: "user",
    targetId: user.id,
    details: { inviteId: invite.id, level: invite.level },
    ip,
  });

  await setSessionCookie(await makeSessionToken(user.id, user.tokenVersion));
  redirect("/panel");
}

/* ── Выход ─────────────────────────────────────────────────── */

export async function logoutAction(): Promise<void> {
  const actor = await requireActionAuth().catch(() => null);
  if (actor) {
    await audit({ actorId: actor.id, action: "auth.logout", targetType: "user", targetId: actor.id });
  }
  await clearSessionCookie();
  redirect("/login");
}

/* ── Смена пароля (свой) ───────────────────────────────────── */

export async function changePasswordAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireActionAuth();
  const current = z.string().min(1).safeParse(formData.get("current"));
  const next = passwordSchema.safeParse(formData.get("next"));
  const repeat = z.string().safeParse(formData.get("repeat"));

  if (!current.success) return { error: "Введите текущий пароль." };
  if (!next.success) return { error: next.error.issues[0]?.message };
  if (!repeat.success || repeat.data !== next.data) {
    return { error: "Пароли не совпадают." };
  }

  const [user] = await db.select().from(users).where(eq(users.id, actor.id)).limit(1);
  if (!user || !(await verifyPassword(current.data, user.passwordHash))) {
    return { error: "Текущий пароль неверен." };
  }

  const passwordHash = await hashPassword(next.data);
  await db
    .update(users)
    .set({
      passwordHash,
      mustChangePassword: false,
      tokenVersion: sql`${users.tokenVersion} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, actor.id));

  await audit({ actorId: actor.id, action: "user.password_changed", targetType: "user", targetId: actor.id });
  return { ok: "Пароль изменён. Другие сессии завершены." };
}

/* ── Сброс пароля админом (право PASSWORD_RESET, уровень ≥ 5) ── */

export async function resetPasswordAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireActionAuth("PASSWORD_RESET");
  const userId = z.coerce.number().int().positive().safeParse(formData.get("userId"));
  if (!userId.success) return { error: "Не указан пользователь." };

  const [target] = await db.select().from(users).where(eq(users.id, userId.data)).limit(1);
  if (!target) return { error: "Пользователь не найден." };
  if (target.level >= actor.level && target.id !== actor.id) {
    throw new ActionError("Нельзя сбрасывать пароль пользователю своего уровня и выше.");
  }

  const tempPassword = generatePassword(12);
  await db
    .update(users)
    .set({
      passwordHash: await hashPassword(tempPassword),
      mustChangePassword: true,
      tokenVersion: sql`${users.tokenVersion} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, target.id));

  await audit({
    actorId: actor.id,
    action: "user.password_reset",
    targetType: "user",
    targetId: target.id,
    ip: requestIp(await headers()),
  });

  return { ok: `Новый временный пароль для ${target.username}: ${tempPassword} (покажите его лично)` };
}
