"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Coffee,
  History,
  LayoutDashboard,
  Mail,
  ScrollText,
  User,
  Users,
} from "lucide-react";

const ICONS = {
  dashboard: LayoutDashboard,
  team: Users,
  requests: Mail,
  inactivity: Coffee,
  news: Bell,
  journal: History,
  invites: ScrollText,
  profile: User,
} as const;

type Item = { href: string; label: string; icon: keyof typeof ICONS; show?: boolean };

export type { Item as PanelItem };

export function PanelNav({ items }: { items: Item[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto px-3 py-2 lg:flex-col lg:overflow-visible lg:py-3">
      {items.map(({ href, label, icon }) => {
        const Icon = ICONS[icon];
        const active =
          pathname === href || (href !== "/panel" && pathname.startsWith(href + "/"));
        return (
          <Link
            key={href}
            href={href}
            className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition ${
              active
                ? "bg-accent/15 font-semibold text-accent"
                : "text-mist hover:bg-surface hover:text-frost"
            }`}
          >
            <Icon className="size-4.5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
