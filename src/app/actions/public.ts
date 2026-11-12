"use server";

import { z } from "zod";
import { db } from "@/db";
import { joinRequests } from "@/db/schema";
import { audit } from "@/server/audit";
import { headers } from "next/headers";
import { isRateLimited, requestIp } from "@/server/rate-limit";

export type FormState = { error?: string; ok?: string } | null;

/** Публичная заявка на вступление в персонал. */
export async function submitJoinAction(_state: FormState, formData: FormData): Promise<FormState> {
  const schema = z.object({
    nickname: z.string().trim().min(2).max(48),
    age: z.coerce.number().int().min(10).max(80),
    contact: z.string().trim().min(4).max(120),
    about: z.string().trim().min(20).max(2000),
  });

  const parsed = schema.safeParse({
    nickname: formData.get("nickname"),
    age: formData.get("age"),
    contact: formData.get("contact"),
    about: formData.get("about"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Проверьте поля формы." };
  }

  const ip = requestIp(await headers());
  if (isRateLimited(`join:${ip}`, 3, 30 * 60_000)) {
    return { error: "Слишком много заявок. Попробуйте позже." };
  }

  await db.insert(joinRequests).values({
    nickname: parsed.data.nickname,
    age: parsed.data.age,
    contact: parsed.data.contact,
    about: parsed.data.about,
  });

  await audit({
    actorId: null,
    action: "join.submitted",
    targetType: "join_request",
    details: { nickname: parsed.data.nickname },
    ip,
  });

  return { ok: "Заявка отправлена! Руководство рассмотрит её и свяжется с вами." };
}
