/**
 * Единый конфиг проекта. Все внешние ссылки добавляются только сюда.
 */
export const site = {
  name: "Слово Меймея",
  tagline: "Шерсть на крови",
  description:
    "Сайт персонала проекта «Слово Меймея. Шерсть на крови» — состав команды, новости, заявки на вступление и личный кабинет.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
} as const;

export const links = {
  /** TODO: ссылка на страницу игры в Roblox */
  roblox: "",
  /** TODO: ссылка на Discord-сервер */
  discord: "",
  /** TODO: ссылка на Telegram-канал */
  telegram: "",
} as const;

/** Публичный сайт игры (для взаимных ссылок — «единый дизайн»). */
export const gameSite = "https://jengasnx.github.io/meimei-website/";
