"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
import {
  disciplinaryActions,
  inactivityPeriods,
  invites,
  joinRequests,
  news,
  notifications,
  ratingEvents,
  staffTerms,
  users,
} from "@/db/schema";
import { generatePassword, hashPassword } from "@/lib/auth/password";
import { assignableLevel, actorCan, canManage } from "@/lib/rbac/engine";
import { isValidLevel } from "@/lib/rbac/levels";
import { audit } from "@/server/audit";
import { ActionError, requireActionAuth } from "@/server/auth";
import type { FormState } from "@/app/actions/auth";
import type { Tx } from "@/db";

const reasonSchema = z.string().trim().min(3, "Укажите причину (минимум 3 символа).").max(500);
/** IP текущего запроса (для аудита). */
const requestIp = (h: Headers) => {
  const fwd = h.get("x-forwarded-for");
  return fwd ? fwd.split(",")[0]!.trim() : (h.get("x-real-ip") ?? "unknown");
};
const ip = async () => requestIp(await headers());

/** Загружает цель и проверяет, что actor может ею управлять. */
async function loadTarget(actorId: number, actorLevel: number, targetId: number) {
  const [target] = await db.select().from(users).where(eq(users.id, targetId)).limit(1);
  if (!target) throw new ActionError("Пользователь не найден.");
  if (!canManage(actorLevel, target.level, target.id === actorId)) {
    throw new ActionError("Нельзя управлять пользователем своего уровня и выше.");
  }
  return target;
}

/* ── Рейтинг ─────────────────────────────────────────────── */

export async function ratingAction(_s: FormState, fd: FormData): Promise<FormState> {
  const actor = await requireActionAuth("RATING_MANAGE");
  const targetId = z.coerce.number().int().positive().safeParse(fd.get("userId"));
  const delta = z.coerce.number().int().safeParse(fd.get("delta"));
  const reason = reasonSchema.safeParse(fd.get("reason"));
  if (!targetId.success) return { error: "Не указан пользователь." };
  if (!delta.success || delta.data === 0) return { error: "Изменение не может быть нулевым." };
  if (!reason.success) return { error: reason.error.issues[0]?.message };

  const target = await loadTarget(actor.id, actor.level, targetId.data);

  await db.transaction(async (tx: Tx) => {
    const [locked] = await tx
      .select({ rating: users.rating })
      .from(users)
      .where(eq(users.id, target.id))
      .for("update");
    const before = locked?.rating ?? 0;
    const after = before + delta.data;
    if (after < 0) throw new ActionError("Рейтинг не может стать отрицательным.");

    await tx.insert(ratingEvents).values({
      userId: target.id,
      delta: delta.data,
      balanceBefore: before,
      balanceAfter: after,
      reason: reason.data,
      actorId: actor.id,
    });
    await tx
      .update(users)
      .set({ rating: after, updatedAt: new Date() })
      .where(eq(users.id, target.id));
    await tx.insert(notifications).values({
      userId: target.id,
      kind: "rating",
      title: delta.data > 0 ? "Рейтинг повышен" : "Рейтинг снижен",
      body: `${delta.data > 0 ? "+" : ""}${delta.data} очков. Причина: ${reason.data}`,
    });
  });

  await audit({
    actorId: actor.id,
    action: "rating.changed",
    targetType: "user",
    targetId: target.id,
    details: { delta: delta.data, reason: reason.data },
    ip: await ip(),
  });
  revalidatePath(`/panel/team/${target.id}`);
  return { ok: "Рейтинг обновлён." };
}

/* ── Дисциплина: выговор / предупреждение / жалоба ────────── */

export async function disciplineAction(_s: FormState, fd: FormData): Promise<FormState> {
  const actor = await requireActionAuth("DISCIPLINE_MANAGE");
  const targetId = z.coerce.number().int().positive().safeParse(fd.get("userId"));
  const type = z.enum(["reprimand", "warning", "complaint"]).safeParse(fd.get("type"));
  const reason = reasonSchema.safeParse(fd.get("reason"));
  if (!targetId.success) return { error: "Не указан пользователь." };
  if (!type.success) return { error: "Выберите тип наказания." };
  if (!reason.success) return { error: reason.error.issues[0]?.message };

  const target = await loadTarget(actor.id, actor.level, targetId.data);
  const labels = { reprimand: "Выговор", warning: "Предупреждение", complaint: "Жалоба" };

  await db.insert(disciplinaryActions).values({
    userId: target.id,
    type: type.data,
    reason: reason.data,
    actorId: actor.id,
  });
  await db.insert(notifications).values({
    userId: target.id,
    kind: "discipline",
    title: labels[type.data],
    body: reason.data,
  });

  await audit({
    actorId: actor.id,
    action: `discipline.${type.data}`,
    targetType: "user",
    targetId: target.id,
    details: { reason: reason.data },
    ip: await ip(),
  });
  revalidatePath(`/panel/team/${target.id}`);
  return { ok: `${labels[type.data]} зафиксирован(о).` };
}

/* ── Изменение уровня и должности ────────────────────────── */

export async function levelAction(_s: FormState, fd: FormData): Promise<FormState> {
  const actor = await requireActionAuth("TEAM_MANAGE");
  const targetId = z.coerce.number().int().positive().safeParse(fd.get("userId"));
  const level = z.coerce.number().int().safeParse(fd.get("level"));
  const roleTitle = z.string().trim().min(2).max(120).safeParse(fd.get("roleTitle"));
  if (!targetId.success) return { error: "Не указан пользователь." };
  if (level.success !== true || !isValidLevel(level.data)) return { error: "Уровень должен быть 1–7." };
  if (!roleTitle.success) return { error: "Укажите должность." };

  const target = await loadTarget(actor.id, actor.level, targetId.data);
  const maxAssignable = assignableLevel(actor.level);
  if (level.data > maxAssignable) {
    throw new ActionError(`Вы не можете назначать уровень выше ${maxAssignable}.`);
  }
  if (level.data === target.level && roleTitle.data === target.roleTitle) {
    return { error: "Изменений нет." };
  }

  await db.transaction(async (tx: Tx) => {
    await tx
      .update(users)
      .set({
        level: level.data,
        roleTitle: roleTitle.data,
        levelAssignedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, target.id));
    await tx.insert(staffTerms).values({
      userId: target.id,
      kind: "level_change",
      level: level.data,
      roleTitle: roleTitle.data,
      reason: "Изменение должности",
      actorId: actor.id,
    });
    await tx.insert(notifications).values({
      userId: target.id,
      kind: "level",
      title: "Изменена должность",
      body: `Новый уровень: ${level.data}, должность: ${roleTitle.data}`,
    });
  });

  await audit({
    actorId: actor.id,
    action: "team.level_changed",
    targetType: "user",
    targetId: target.id,
    details: { from: target.level, to: level.data, roleTitle: roleTitle.data },
    ip: await ip(),
  });
  revalidatePath(`/panel/team/${target.id}`);
  revalidatePath("/panel/team");
  return { ok: "Уровень и должность обновлены." };
}

/* ── Снятие с поста ──────────────────────────────────────── */

export async function fireAction(_s: FormState, fd: FormData): Promise<FormState> {
  const actor = await requireActionAuth("TEAM_MANAGE");
  const targetId = z.coerce.number().int().positive().safeParse(fd.get("userId"));
  const reason = reasonSchema.safeParse(fd.get("reason"));
  if (!targetId.success) return { error: "Не указан пользователь." };
  if (!reason.success) return { error: reason.error.issues[0]?.message };

  const target = await loadTarget(actor.id, actor.level, targetId.data);
  if (target.status === "blocked") return { error: "Пользователь уже снят." };

  await db.transaction(async (tx: Tx) => {
    await tx
      .update(users)
      .set({ status: "blocked", roleTitle: "Снят с поста", updatedAt: new Date() })
      .where(eq(users.id, target.id));
    await tx.insert(staffTerms).values({
      userId: target.id,
      kind: "fire",
      level: target.level,
      roleTitle: target.roleTitle,
      reason: reason.data,
      actorId: actor.id,
    });
    await tx.insert(notifications).values({
      userId: target.id,
      kind: "fire",
      title: "Вы сняты с поста",
      body: reason.data,
    });
  });

  await audit({
    actorId: actor.id,
    action: "team.fired",
    targetType: "user",
    targetId: target.id,
    details: { reason: reason.data },
    ip: await ip(),
  });
  revalidatePath(`/panel/team/${target.id}`);
  revalidatePath("/panel/team");
  return { ok: "Пользователь снят с поста." };
}

/* ── Восстановление после снятия ─────────────────────────── */

export async function rehireAction(_s: FormState, fd: FormData): Promise<FormState> {
  const actor = await requireActionAuth("TEAM_MANAGE");
  const targetId = z.coerce.number().int().positive().safeParse(fd.get("userId"));
  if (!targetId.success) return { error: "Не указан пользователь." };

  const target = await loadTarget(actor.id, actor.level, targetId.data);
  if (target.status !== "blocked") return { error: "Пользователь не снят с поста." };

  await db.transaction(async (tx: Tx) => {
    await tx
      .update(users)
      .set({
        status: "active",
        roleTitle: target.roleTitle === "Снят с поста" ? "Персонал" : target.roleTitle,
        updatedAt: new Date(),
      })
      .where(eq(users.id, target.id));
    await tx.insert(staffTerms).values({
      userId: target.id,
      kind: "rehire",
      level: target.level,
      roleTitle: target.roleTitle,
      reason: "Восстановление",
      actorId: actor.id,
    });
  });

  await audit({
    actorId: actor.id,
    action: "team.rehired",
    targetType: "user",
    targetId: target.id,
    ip: await ip(),
  });
  revalidatePath(`/panel/team/${target.id}`);
  revalidatePath("/panel/team");
  return { ok: "Пользователь восстановлен." };
}

/* ── Неактивы ────────────────────────────────────────────── */

export async function inactivityRequestAction(_s: FormState, fd: FormData): Promise<FormState> {
  const actor = await requireActionAuth("REQUEST_INACTIVITY");
  const until = z.string().min(1).safeParse(fd.get("until"));
  const reason = reasonSchema.safeParse(fd.get("reason"));
  if (!until.success) return { error: "Укажите дату окончания." };
  const untilDate = new Date(until.data);
  if (Number.isNaN(untilDate.getTime()) || untilDate.getTime() <= Date.now()) {
    return { error: "Дата окончания должна быть в будущем." };
  }
  if (!reason.success) return { error: reason.error.issues[0]?.message };

  await db.insert(inactivityPeriods).values({
    userId: actor.id,
    until: untilDate,
    reason: reason.data,
    // Кураторы и выше одобряют свой неактив автоматически.
    status: actorCan(actor, "INACTIVITY_MANAGE") ? "approved" : "pending",
  });
  await audit({
    actorId: actor.id,
    action: "inactivity.requested",
    targetType: "user",
    targetId: actor.id,
    details: { until: until.data, reason: reason.data },
    ip: await ip(),
  });
  revalidatePath("/panel/profile");
  return { ok: "Заявка на неактив отправлена." };
}

export async function inactivityReviewAction(_s: FormState, fd: FormData): Promise<FormState> {
  const actor = await requireActionAuth("INACTIVITY_MANAGE");
  const periodId = z.coerce.number().int().positive().safeParse(fd.get("periodId"));
  const decision = z.enum(["approved", "rejected"]).safeParse(fd.get("decision"));
  if (!periodId.success || !decision.success) return { error: "Некорректные данные." };

  const [period] = await db
    .select()
    .from(inactivityPeriods)
    .where(eq(inactivityPeriods.id, periodId.data))
    .limit(1);
  if (!period) return { error: "Заявка не найдена." };
  if (period.status !== "pending") return { error: "Заявка уже рассмотрена." };
  if (period.userId === actor.id) {
    throw new ActionError("Свою заявку рассматривает другой сотрудник.");
  }

  await db
    .update(inactivityPeriods)
    .set({ status: decision.data, actorId: actor.id })
    .where(eq(inactivityPeriods.id, period.id));

  await db.insert(notifications).values({
    userId: period.userId,
    kind: "inactivity",
    title: decision.data === "approved" ? "Неактив одобрен" : "Неактив отклонён",
    body: period.reason,
  });

  await audit({
    actorId: actor.id,
    action: `inactivity.${decision.data}`,
    targetType: "inactivity",
    targetId: period.id,
    details: { userId: period.userId },
    ip: await ip(),
  });
  revalidatePath("/panel/inactivity");
  return { ok: decision.data === "approved" ? "Неактив одобрен." : "Неактив отклонён." };
}

/* ── Новости ─────────────────────────────────────────────── */

export async function newsCreateAction(_s: FormState, fd: FormData): Promise<FormState> {
  const actor = await requireActionAuth("NEWS_MANAGE");
  const title = z.string().trim().min(4).max(160).safeParse(fd.get("title"));
  const body = z.string().trim().min(10).max(8000).safeParse(fd.get("body"));
  if (!title.success) return { error: "Заголовок: 4–160 символов." };
  if (!body.success) return { error: "Текст: минимум 10 символов." };

  await db.insert(news).values({ title: title.data, body: body.data, authorId: actor.id });
  await audit({
    actorId: actor.id,
    action: "news.created",
    targetType: "news",
    details: { title: title.data },
    ip: await ip(),
  });
  revalidatePath("/panel/news");
  revalidatePath("/news");
  return { ok: "Новость опубликована." };
}

export async function newsDeleteAction(_s: FormState, fd: FormData): Promise<FormState> {
  const actor = await requireActionAuth("NEWS_MANAGE");
  const id = z.coerce.number().int().positive().safeParse(fd.get("newsId"));
  if (!id.success) return { error: "Не указана новость." };

  await db.delete(news).where(eq(news.id, id.data));
  await audit({
    actorId: actor.id,
    action: "news.deleted",
    targetType: "news",
    targetId: id.data,
    ip: await ip(),
  });
  revalidatePath("/panel/news");
  revalidatePath("/news");
  return { ok: "Новость удалена." };
}

/* ── Инвайт-коды ─────────────────────────────────────────── */

export async function inviteCreateAction(_s: FormState, fd: FormData): Promise<FormState> {
  const actor = await requireActionAuth("INVITES_MANAGE");
  const level = z.coerce.number().int().safeParse(fd.get("level"));
  const roleTitle = z.string().trim().min(2).max(120).safeParse(fd.get("roleTitle"));
  const days = z.coerce.number().int().min(1).max(30).default(7).safeParse(fd.get("days"));

  if (level.success !== true || !isValidLevel(level.data)) return { error: "Уровень должен быть 1–7." };
  const maxAssignable = assignableLevel(actor.level);
  if (level.data > maxAssignable) {
    return { error: `Вы можете выдавать инвайты не выше уровня ${maxAssignable}.` };
  }
  if (!roleTitle.success) return { error: "Укажите должность." };
  const expires = new Date(Date.now() + (days.success ? days.data : 7) * 86_400_000);

  const code = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  await db.insert(invites).values({
    code,
    level: level.data,
    roleTitle: roleTitle.data,
    createdBy: actor.id,
    expiresAt: expires,
  });
  await audit({
    actorId: actor.id,
    action: "invite.created",
    targetType: "invite",
    details: { level: level.data, roleTitle: roleTitle.data },
    ip: await ip(),
  });
  revalidatePath("/panel/invites");
  return { ok: `Код создан: ${code}` };
}

export async function inviteRevokeAction(_s: FormState, fd: FormData): Promise<FormState> {
  const actor = await requireActionAuth("INVITES_MANAGE");
  const id = z.coerce.number().int().positive().safeParse(fd.get("inviteId"));
  if (!id.success) return { error: "Не указан инвайт." };

  await db
    .delete(invites)
    .where(and(eq(invites.id, id.data), isNull(invites.usedBy)));
  await audit({
    actorId: actor.id,
    action: "invite.revoked",
    targetType: "invite",
    targetId: id.data,
    ip: await ip(),
  });
  revalidatePath("/panel/invites");
  return { ok: "Инвайт отозван." };
}

/* ── Заявки на вступление ────────────────────────────────── */

export async function joinReviewAction(_s: FormState, fd: FormData): Promise<FormState> {
  const actor = await requireActionAuth("JOIN_MANAGE");
  const requestId = z.coerce.number().int().positive().safeParse(fd.get("requestId"));
  const decision = z.enum(["accepted", "rejected"]).safeParse(fd.get("decision"));
  const username = z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{3,32}$/)
    .safeParse(fd.get("username"));
  const level = z.coerce.number().int().safeParse(fd.get("level"));
  if (!requestId.success || !decision.success) return { error: "Некорректные данные." };

  const [request] = await db
    .select()
    .from(joinRequests)
    .where(eq(joinRequests.id, requestId.data))
    .limit(1);
  if (!request) return { error: "Заявка не найдена." };
  if (request.status !== "pending") return { error: "Заявка уже рассмотрена." };

  if (decision.data === "rejected") {
    await db
      .update(joinRequests)
      .set({ status: "rejected", reviewedBy: actor.id, reviewNote: "Отклонена" })
      .where(eq(joinRequests.id, request.id));
    await audit({
      actorId: actor.id,
      action: "join.rejected",
      targetType: "join_request",
      targetId: request.id,
      ip: await ip(),
    });
    revalidatePath("/panel/requests");
    return { ok: "Заявка отклонена." };
  }

  if (username.success !== true) return { error: "Укажите логин нового сотрудника (латиница)." };
  if (level.success !== true || !isValidLevel(level.data) || level.data > assignableLevel(actor.level)) {
    return { error: `Уровень нового сотрудника — не выше ${assignableLevel(actor.level)}.` };
  }

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username.data))
    .limit(1);
  if (existing) return { error: "Такой логин уже занят." };

  const tempPassword = generatePassword(12);
  const [user] = await db
    .insert(users)
    .values({
      username: username.data,
      passwordHash: await hashPassword(tempPassword),
      displayName: request.nickname,
      level: level.data,
      roleTitle: "Персонал",
      mustChangePassword: true,
    })
    .returning();

  await db
    .update(joinRequests)
    .set({ status: "accepted", reviewedBy: actor.id, reviewNote: `Принят как ${username.data}` })
    .where(eq(joinRequests.id, request.id));

  await db.insert(staffTerms).values({
    userId: user.id,
    kind: "hire",
    level: level.data,
    roleTitle: "Персонал",
    reason: "Принят по заявке",
    actorId: actor.id,
  });
  await db.insert(notifications).values({
    userId: user.id,
    kind: "welcome",
    title: "Добро пожаловать в команду!",
    body: "Смените пароль в профиле при первом входе.",
  });

  await audit({
    actorId: actor.id,
    action: "join.accepted",
    targetType: "join_request",
    targetId: request.id,
    details: { userId: user.id, level: level.data },
    ip: await ip(),
  });
  revalidatePath("/panel/requests");
  revalidatePath("/panel/team");
  return {
    ok: `Принят! Логин: ${username.data}, временный пароль: ${tempPassword} — передайте лично и попросите сменить.`,
  };
}

/* ── Профиль: ник и аватар ───────────────────────────────── */

export async function updateProfileAction(_s: FormState, fd: FormData): Promise<FormState> {
  const actor = await requireActionAuth("PROFILE_EDIT");
  const displayName = z.string().trim().min(2).max(48).safeParse(fd.get("displayName"));
  const avatarUrlRaw = z.string().trim().max(500).optional().safeParse(fd.get("avatarUrl"));
  if (!displayName.success) return { error: "Ник: 2–48 символов." };

  let avatarUrl: string | null = null;
  if (avatarUrlRaw.success && avatarUrlRaw.data) {
    try {
      const u = new URL(avatarUrlRaw.data);
      if (u.protocol !== "https:" && u.protocol !== "http:") {
        return { error: "Ссылка на аватар должна начинаться с http(s)://" };
      }
      avatarUrl = avatarUrlRaw.data;
    } catch {
      return { error: "Некорректная ссылка на аватар." };
    }
  }

  await db
    .update(users)
    .set({ displayName: displayName.data, avatarUrl, updatedAt: new Date() })
    .where(eq(users.id, actor.id));

  await audit({
    actorId: actor.id,
    action: "profile.updated",
    targetType: "user",
    targetId: actor.id,
    ip: await ip(),
  });
  revalidatePath("/panel/profile");
  return { ok: "Профиль обновлён." };
}
