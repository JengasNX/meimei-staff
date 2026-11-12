/**
 * Каталог прав. Роль = уровень (1–7), права выдаются уровнем:
 * право доступно, если уровень пользователя >= minLevel.
 *
 * critical: только владелец (7) и уровень 6 могут раздавать/получать
 * эти права (в v1 это влияет только на выдачу уровней при найме).
 */
export const PERMISSIONS = {
  DASHBOARD_VIEW: { minLevel: 1, title: "Просмотр дашборда" },
  TEAM_VIEW: { minLevel: 1, title: "Просмотр состава" },
  PROFILE_EDIT: { minLevel: 1, title: "Редактирование своего профиля" },
  REQUEST_INACTIVITY: { minLevel: 2, title: "Запрос неактива" },
  AUDIT_VIEW: { minLevel: 3, title: "Просмотр журнала аудита" },
  JOIN_VIEW: { minLevel: 3, title: "Просмотр заявок" },
  JOIN_MANAGE: { minLevel: 4, title: "Рассмотрение заявок" },
  DISCIPLINE_MANAGE: { minLevel: 4, title: "Выдача наказаний" },
  RATING_MANAGE: { minLevel: 4, title: "Изменение рейтинга" },
  INACTIVITY_MANAGE: { minLevel: 4, title: "Управление неактивами" },
  NEWS_MANAGE: { minLevel: 4, title: "Управление новостями" },
  INVITES_MANAGE: { minLevel: 5, title: "Управление инвайт-кодами" },
  PASSWORD_RESET: { minLevel: 5, title: "Сброс паролей" },
  TEAM_MANAGE: { minLevel: 6, title: "Наём/снятие/изменение уровня", critical: true },
  SYSTEM_SETTINGS: { minLevel: 7, title: "Системные настройки", critical: true },
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

export function permissionTitle(key: PermissionKey): string {
  return PERMISSIONS[key].title;
}
