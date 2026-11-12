/**
 * requireActor — единая точка проверки сессии для Server Actions
 * и страниц: cookie → JWT → пользователь в БД → статус → право.
 */
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { actorCan, type Actor } from "@/lib/rbac/engine";
import type { PermissionKey } from "@/lib/rbac/permissions";
import { SESSION_COOKIE, readSessionToken } from "@/lib/auth/session";

export type SessionUser = Actor & {
  roleTitle: string;
  avatarUrl: string | null;
  rating: number;
  hiredAt: Date;
  levelAssignedAt: Date;
  mustChangePassword: boolean;
};

/** Текущий пользователь или null (без редиректа). */
export async function getActor(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = await readSessionToken(token);
  if (!payload) return null;

  const [user] = await db.select().from(users).where(eq(users.id, payload.uid)).limit(1);
  if (!user) return null;
  if (user.tokenVersion !== payload.tv) return null;

  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    level: user.level,
    status: user.status,
    roleTitle: user.roleTitle,
    avatarUrl: user.avatarUrl,
    rating: user.rating,
    hiredAt: user.hiredAt,
    levelAssignedAt: user.levelAssignedAt,
    mustChangePassword: user.mustChangePassword,
  };
}

/** Для страниц: без сессии — на логин; без права — на 403. */
export async function requirePageAuth(permission?: PermissionKey): Promise<SessionUser> {
  const actor = await getActor();
  if (!actor) redirect("/login");
  if (permission && !actorCan(actor, permission)) redirect("/panel/403");
  return actor;
}

/** Для Server Actions: бросает понятную ошибку вместо редиректа. */
export class ActionError extends Error {}

export async function requireActionAuth(permission?: PermissionKey): Promise<SessionUser> {
  const actor = await getActor();
  if (!actor) throw new ActionError("Требуется вход в систему.");
  if (actor.status !== "active") throw new ActionError("Аккаунт не активен.");
  if (permission && !actorCan(actor, permission)) {
    throw new ActionError("Недостаточно прав для этого действия.");
  }
  return actor;
}
