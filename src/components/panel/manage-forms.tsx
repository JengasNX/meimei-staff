"use client";

import { useActionState } from "react";
import { joinReviewAction, inviteCreateAction, inviteRevokeAction, newsCreateAction, newsDeleteAction, inactivityReviewAction } from "@/app/panel/actions";
import type { FormState } from "@/app/actions/auth";

const init: FormState = null;

function Status({ state }: { state: FormState }) {
  if (!state) return null;
  if (state.error)
    return (
      <p className="rounded-xl border border-rose/40 bg-rose/10 px-3 py-2 text-xs text-rose">
        {state.error}
      </p>
    );
  if (state.ok)
    return (
      <p className="rounded-xl border border-leaf/40 bg-leaf/10 px-3 py-2 text-xs break-all text-leaf">
        {state.ok}
      </p>
    );
  return null;
}

export function RequestReviewForm({
  requestId,
  nickname,
  maxLevel,
}: {
  requestId: number;
  nickname: string;
  maxLevel: number;
}) {
  const [state, action, pending] = useActionState(joinReviewAction, init);
  const usernameSuggest = nickname
    .replace(/[^A-Za-z0-9_]/g, "")
    .slice(0, 20)
    .toLowerCase();

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="requestId" value={requestId} />
      <input type="hidden" name="decision" value="accepted" />
      <div className="grid gap-2 sm:grid-cols-[160px_130px]">
        <input
          name="username"
          required
          pattern="[A-Za-z0-9_]{3,32}"
          defaultValue={usernameSuggest || ""}
          className="input"
          placeholder="логин (латиница)"
          aria-label="Логин"
        />
        <select name="level" className="input" defaultValue={1} aria-label="Уровень">
          {Array.from({ length: maxLevel }, (_, i) => i + 1).map((lvl) => (
            <option key={lvl} value={lvl}>
              Уровень {lvl}
            </option>
          ))}
        </select>
      </div>
      <Status state={state} />
      <button type="submit" disabled={pending} className="btn-primary btn-sm">
        {pending ? "…" : "Принять в команду"}
      </button>
    </form>
  );
}

export function RequestRejectButton({ requestId }: { requestId: number }) {
  const [state, action, pending] = useActionState(joinReviewAction, init);
  return (
    <form action={action} className="inline">
      <input type="hidden" name="requestId" value={requestId} />
      <input type="hidden" name="decision" value="rejected" />
      <Status state={state} />
      <button type="submit" disabled={pending} className="btn-danger btn-sm">
        {pending ? "…" : "Отклонить"}
      </button>
    </form>
  );
}

export function NewsForm() {
  const [state, action, pending] = useActionState(newsCreateAction, init);
  return (
    <form action={action} className="space-y-3">
      <input
        name="title"
        required
        minLength={4}
        maxLength={160}
        className="input"
        placeholder="Заголовок новости"
      />
      <textarea
        name="body"
        required
        minLength={10}
        maxLength={8000}
        rows={6}
        className="input resize-y"
        placeholder="Текст новости…"
      />
      <Status state={state} />
      <button type="submit" disabled={pending} className="btn-primary btn-sm">
        {pending ? "…" : "Опубликовать"}
      </button>
    </form>
  );
}

export function NewsDeleteButton({ newsId }: { newsId: number }) {
  const [state, action, pending] = useActionState(newsDeleteAction, init);
  return (
    <form action={action} className="inline">
      <input type="hidden" name="newsId" value={newsId} />
      <Status state={state} />
      <button type="submit" disabled={pending} className="btn-danger btn-sm">
        {pending ? "…" : "Удалить"}
      </button>
    </form>
  );
}

export function InviteForm({ maxLevel }: { maxLevel: number }) {
  const [state, action, pending] = useActionState(inviteCreateAction, init);
  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-[130px_1fr_110px]">
        <select name="level" className="input" defaultValue={1} aria-label="Уровень">
          {Array.from({ length: maxLevel }, (_, i) => i + 1).map((lvl) => (
            <option key={lvl} value={lvl}>
              Уровень {lvl}
            </option>
          ))}
        </select>
        <input
          name="roleTitle"
          required
          minLength={2}
          maxLength={120}
          className="input"
          placeholder="Должность нового участника"
          aria-label="Должность"
        />
        <input
          name="days"
          type="number"
          min={1}
          max={30}
          defaultValue={7}
          className="input"
          aria-label="Срок действия (дней)"
        />
      </div>
      <Status state={state} />
      <button type="submit" disabled={pending} className="btn-primary btn-sm">
        {pending ? "…" : "Создать инвайт"}
      </button>
    </form>
  );
}

export function InviteRevokeButton({ inviteId }: { inviteId: number }) {
  const [state, action, pending] = useActionState(inviteRevokeAction, init);
  return (
    <form action={action} className="inline">
      <input type="hidden" name="inviteId" value={inviteId} />
      <Status state={state} />
      <button type="submit" disabled={pending} className="btn-danger btn-sm">
        {pending ? "…" : "Отозвать"}
      </button>
    </form>
  );
}

export function CopyButton({ text }: { text: string }) {
  return (
    <button
      type="button"
      onClick={() => void navigator.clipboard.writeText(text)}
      className="btn-ghost btn-sm"
    >
      Скопировать
    </button>
  );
}

export function InactivityReviewForm({ periodId }: { periodId: number }) {
  const [state, action, pending] = useActionState(inactivityReviewAction, init);
  return (
    <form action={action} className="flex flex-col items-end gap-2">
      <input type="hidden" name="periodId" value={periodId} />
      <Status state={state} />
      <div className="flex gap-2">
        <button
          type="submit"
          name="decision"
          value="approved"
          disabled={pending}
          className="btn-primary btn-sm"
        >
          Одобрить
        </button>
        <button
          type="submit"
          name="decision"
          value="rejected"
          disabled={pending}
          className="btn-danger btn-sm"
        >
          Отклонить
        </button>
      </div>
    </form>
  );
}
