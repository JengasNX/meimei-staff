/**
 * Чистые функции принятия решений (по образцу engine.ts brainburg-admin).
 * Всё тестируемо, без обращения к БД и cookies.
 */
import { isValidLevel, MAX_LEVEL } from "./levels";
import { PERMISSIONS, type PermissionKey } from "./permissions";

export type Actor = {
  id: number;
  username: string;
  displayName: string;
  level: number;
  status: "active" | "suspended" | "blocked";
};

/** Неактивный аккаунт не может ничего. */
export function isActive(actor: Pick<Actor, "status">): boolean {
  return actor.status === "active";
}

/** Право доступно уровню? (уровень 7 — всё) */
export function can(level: number, permission: PermissionKey): boolean {
  if (!isValidLevel(level)) return false;
  if (level >= MAX_LEVEL) return true;
  return level >= PERMISSIONS[permission].minLevel;
}

/** Проверка права с учётом статуса аккаунта. */
export function actorCan(actor: Actor, permission: PermissionKey): boolean {
  return isActive(actor) && can(actor.level, permission);
}

/**
 * Может ли actor управлять target (изменять уровень, наказывать, начислять очки)?
 * Правило: строго выше по уровню; основатель (7) может всеми, кроме других 7.
 * Над самим собой метрики другие не меняют — только свои профильные действия.
 */
export function canManage(actorLevel: number, targetLevel: number, sameUser: boolean): boolean {
  if (!isValidLevel(actorLevel) || !isValidLevel(targetLevel)) return false;
  if (sameUser) return false;
  if (actorLevel >= MAX_LEVEL) return targetLevel < MAX_LEVEL;
  return actorLevel > targetLevel;
}

/**
 * Какой максимальный уровень actor может назначить при найме/изменении?
 * Строго ниже себя; основатель может назначить до 6.
 */
export function assignableLevel(actorLevel: number): number {
  return actorLevel >= MAX_LEVEL ? MAX_LEVEL - 1 : actorLevel - 1;
}
