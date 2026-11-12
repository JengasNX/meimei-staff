import Link from "next/link";
import { Gamepad2, Home, LogIn, Newspaper, Users } from "lucide-react";
import { gameSite, site } from "@/lib/config/site";

const NAV = [
  { href: "/", label: "Главная", icon: Home },
  { href: "/team", label: "Состав", icon: Users },
  { href: "/news", label: "Новости", icon: Newspaper },
  { href: "/join", label: "Вступить", icon: Gamepad2 },
];

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-edge/70 bg-night/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-accent/15 text-accent">
            <Gamepad2 className="size-5" />
          </span>
          <span className="font-display text-sm font-bold tracking-wide">
            {site.name}
            <span className="ml-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-mist">
              персонал
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="rounded-lg px-3 py-2 text-sm text-mist transition hover:bg-surface hover:text-frost"
            >
              {label}
            </Link>
          ))}
        </nav>

        <Link href="/login" className="btn-primary btn-sm">
          <LogIn className="size-4" />
          Кабинет
        </Link>
      </div>

      <nav className="flex gap-1 border-t border-edge/70 px-3 py-2 md:hidden">
        {NAV.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="flex-1 rounded-lg px-2 py-1.5 text-center text-xs text-mist transition hover:bg-surface hover:text-frost"
          >
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="mt-auto border-t border-edge/70 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-mist md:flex-row">
        <p>
          {site.name}. {site.tagline} — сайт персонала
        </p>
        <div className="flex gap-4">
          <a href={gameSite} target="_blank" rel="noreferrer" className="link-accent">
            Сайт игры
          </a>
          <Link href="/team" className="link-accent">
            Состав
          </Link>
          <Link href="/join" className="link-accent">
            Вступить
          </Link>
        </div>
      </div>
    </footer>
  );
}
