/**
 * Иерархия персонала meimei: уровни 1–7 (как в admin.arztools.ru).
 * 1 — младший состав, 7 — основатель.
 */
export const LEVEL_NAMES: Record<number, string> = {
  7: "Основатель",
  6: "Главный администратор",
  5: "Заместитель ГА",
  4: "Куратор",
  3: "Старший состав",
  2: "Состав",
  1: "Младший состав",
};

export const MIN_LEVEL = 1;
export const MAX_LEVEL = 7;

export function levelName(level: number): string {
  return LEVEL_NAMES[level] ?? `Уровень ${level}`;
}

export function isValidLevel(level: number): boolean {
  return Number.isInteger(level) && level >= MIN_LEVEL && level <= MAX_LEVEL;
}
