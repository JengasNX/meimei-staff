/**
 * Запросы для публичных страниц. При отсутствии DATABASE_URL
 * возвращают fallback, чтобы сайт собирался и показывался без БД.
 */
import { and, asc, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  disciplinaryActions,
  inactivityPeriods,
  joinRequests,
  news,
  users,
} from "@/db/schema";

export type TeamMember = {
  id: number;
  displayName: string;
  username: string;
  level: number;
  roleTitle: string;
  avatarUrl: string | null;
  status: "active" | "suspended" | "blocked";
  rating: number;
  hiredAt: Date;
  levelAssignedAt: Date;
  reprimands: number;
  warnings: number;
  complaints: number;
  inactiveUntil: Date | null;
};

export type TeamData = {
  members: TeamMember[];
  available: boolean;
};

export async function getTeamData(): Promise<TeamData> {
  try {
    const base = await db
      .select({
        id: users.id,
        displayName: users.displayName,
        username: users.username,
        level: users.level,
        roleTitle: users.roleTitle,
        avatarUrl: users.avatarUrl,
        status: users.status,
        rating: users.rating,
        hiredAt: users.hiredAt,
        levelAssignedAt: users.levelAssignedAt,
      })
      .from(users)
      .orderBy(desc(users.level), asc(users.displayName));

    const counts = await db
      .select({
        userId: disciplinaryActions.userId,
        type: disciplinaryActions.type,
        count: sql<number>`count(*)::int`,
      })
      .from(disciplinaryActions)
      .groupBy(disciplinaryActions.userId, disciplinaryActions.type);

    const actives = await db
      .select({ userId: inactivityPeriods.userId, until: inactivityPeriods.until })
      .from(inactivityPeriods)
      .where(and(eq(inactivityPeriods.status, "approved"), gte(inactivityPeriods.until, new Date())));

    const byUser = new Map<number, { reprimands: number; warnings: number; complaints: number }>();
    for (const c of counts) {
      const entry = byUser.get(c.userId) ?? { reprimands: 0, warnings: 0, complaints: 0 };
      if (c.type === "reprimand") entry.reprimands = c.count;
      if (c.type === "warning") entry.warnings = c.count;
      if (c.type === "complaint") entry.complaints = c.count;
      byUser.set(c.userId, entry);
    }

    const inactiveUntil = new Map<number, Date>();
    for (const a of actives) inactiveUntil.set(a.userId, a.until);

    return {
      available: true,
      members: base.map((u) => ({
        ...u,
        reprimands: byUser.get(u.id)?.reprimands ?? 0,
        warnings: byUser.get(u.id)?.warnings ?? 0,
        complaints: byUser.get(u.id)?.complaints ?? 0,
        inactiveUntil: inactiveUntil.get(u.id) ?? null,
      })),
    };
  } catch {
    return { available: false, members: [] };
  }
}

export type NewsItem = {
  id: number;
  title: string;
  body: string;
  publishedAt: Date;
};

export async function getNews(limit = 50): Promise<NewsItem[] | null> {
  try {
    return await db
      .select({ id: news.id, title: news.title, body: news.body, publishedAt: news.publishedAt })
      .from(news)
      .orderBy(desc(news.publishedAt))
      .limit(limit);
  } catch {
    return null;
  }
}

export async function getPublicStats() {
  try {
    const [row] = await db
      .select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(*) filter (where ${users.status} = 'active')::int`,
      })
      .from(users);
    const [req] = await db
      .select({ pending: sql<number>`count(*) filter (where ${joinRequests.status} = 'pending')::int` })
      .from(joinRequests);
    return { available: true, ...row, pendingRequests: req?.pending ?? 0 };
  } catch {
    return { available: false, total: 0, active: 0, pendingRequests: 0 };
  }
}
