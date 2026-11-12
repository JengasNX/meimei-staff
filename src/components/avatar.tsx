/**
 * Аватар без загрузки файлов: внешняя ссылка либо градиентная плашка
 * с первой буквой ника.
 */
import { isValidAvatarUrl } from "@/lib/utils";

export function Avatar({
  name,
  url,
  size = 44,
}: {
  name: string;
  url?: string | null;
  size?: number;
}) {
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  const style = { width: size, height: size, fontSize: Math.max(12, size * 0.4) };

  if (url && isValidAvatarUrl(url)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name}
        style={style}
        className="shrink-0 rounded-xl border border-edge object-cover"
      />
    );
  }

  return (
    <span
      style={style}
      className="grid shrink-0 place-items-center rounded-xl border border-edge bg-gradient-to-br from-accent/25 to-neon/10 font-display font-bold text-accent-soft"
    >
      {initial}
    </span>
  );
}
