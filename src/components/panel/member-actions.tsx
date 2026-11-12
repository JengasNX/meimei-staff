"use client";

import { useActionState } from "react";
import {
  disciplineAction,
  fireAction,
  levelAction,
  ratingAction,
} from "@/app/panel/actions";
import { changePasswordAction, resetPasswordAction, type FormState } from "@/app/actions/auth";
import { updateProfileAction } from "@/app/panel/actions";
import { inactivityRequestAction } from "@/app/panel/actions";

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

export function RatingForm({ userId }: { userId: number }) {
  const [state, action, pending] = useActionState(ratingAction, init);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="userId" value={userId} />
      <div className="grid grid-cols-[90px_1fr] gap-2">
        <input
          name="delta"
          type="number"
          required
          className="input"
          placeholder="+10"
          aria-label="Изменение рейтинга"
        />
        <input
          name="reason"
          required
          minLength={3}
          className="input"
          placeholder="Причина изменения рейтинга"
          aria-label="Причина"
        />
      </div>
      <Status state={state} />
      <button type="submit" disabled={pending} className="btn-primary btn-sm">
        {pending ? "…" : "Изменить рейтинг"}
      </button>
    </form>
  );
}

export function DisciplineForm({ userId }: { userId: number }) {
  const [state, action, pending] = useActionState(disciplineAction, init);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="userId" value={userId} />
      <div className="grid gap-2 sm:grid-cols-[160px_1fr]">
        <select name="type" className="input" aria-label="Тип наказания" defaultValue="reprimand">
          <option value="reprimand">Выговор</option>
          <option value="warning">Предупреждение</option>
          <option value="complaint">Жалоба</option>
        </select>
        <input
          name="reason"
          required
          minLength={3}
          className="input"
          placeholder="Причина"
          aria-label="Причина"
        />
      </div>
      <Status state={state} />
      <button type="submit" disabled={pending} className="btn-ghost btn-sm">
        {pending ? "…" : "Зафиксировать"}
      </button>
    </form>
  );
}

export function LevelForm({
  userId,
  currentLevel,
  currentRole,
  maxLevel,
}: {
  userId: number;
  currentLevel: number;
  currentRole: string;
  maxLevel: number;
}) {
  const [state, action, pending] = useActionState(levelAction, init);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="userId" value={userId} />
      <div className="grid gap-2 sm:grid-cols-[140px_1fr]">
        <select
          name="level"
          className="input"
          defaultValue={currentLevel}
          aria-label="Уровень"
        >
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
          defaultValue={currentRole}
          className="input"
          placeholder="Должность (можно несколько через /)"
          aria-label="Должность"
        />
      </div>
      <Status state={state} />
      <button type="submit" disabled={pending} className="btn-primary btn-sm">
        {pending ? "…" : "Сохранить"}
      </button>
    </form>
  );
}

export function FireForm({ userId }: { userId: number }) {
  const [state, action, pending] = useActionState(fireAction, init);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="userId" value={userId} />
      <input
        name="reason"
        required
        minLength={3}
        className="input"
        placeholder="Причина снятия"
        aria-label="Причина снятия"
      />
      <Status state={state} />
      <button type="submit" disabled={pending} className="btn-danger btn-sm">
        {pending ? "…" : "Снять с поста"}
      </button>
    </form>
  );
}

export function PasswordChangeForm() {
  const [state, action, pending] = useActionState(changePasswordAction, init);
  return (
    <form action={action} className="space-y-3">
      <input
        name="current"
        type="password"
        required
        className="input"
        placeholder="Текущий пароль"
        autoComplete="current-password"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          name="next"
          type="password"
          required
          minLength={8}
          className="input"
          placeholder="Новый пароль"
          autoComplete="new-password"
        />
        <input
          name="repeat"
          type="password"
          required
          minLength={8}
          className="input"
          placeholder="Повторите пароль"
          autoComplete="new-password"
        />
      </div>
      <Status state={state} />
      <button type="submit" disabled={pending} className="btn-primary btn-sm">
        {pending ? "…" : "Сменить пароль"}
      </button>
    </form>
  );
}

export function ProfileForm({
  displayName,
  avatarUrl,
}: {
  displayName: string;
  avatarUrl: string | null;
}) {
  const [state, action, pending] = useActionState(updateProfileAction, init);
  return (
    <form action={action} className="space-y-3">
      <input
        name="displayName"
        required
        minLength={2}
        maxLength={48}
        defaultValue={displayName}
        className="input"
        placeholder="Ник для показа"
      />
      <input
        name="avatarUrl"
        type="url"
        defaultValue={avatarUrl ?? ""}
        className="input"
        placeholder="Ссылка на аватар (необязательно)"
      />
      <Status state={state} />
      <button type="submit" disabled={pending} className="btn-primary btn-sm">
        {pending ? "…" : "Сохранить профиль"}
      </button>
    </form>
  );
}

export function InactivityRequestForm() {
  const [state, action, pending] = useActionState(inactivityRequestAction, init);
  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
        <input name="until" type="date" required className="input" aria-label="До какой даты" />
        <input
          name="reason"
          required
          minLength={3}
          className="input"
          placeholder="Причина (учёба, отпуск…)"
          aria-label="Причина"
        />
      </div>
      <Status state={state} />
      <button type="submit" disabled={pending} className="btn-ghost btn-sm">
        {pending ? "…" : "Запросить неактив"}
      </button>
    </form>
  );
}

export function PasswordResetForm({ userId, username }: { userId: number; username: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, init);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="userId" value={userId} />
      <Status state={state} />
      <button type="submit" disabled={pending} className="btn-ghost btn-sm">
        {pending ? "…" : `Сбросить пароль @${username}`}
      </button>
    </form>
  );
}
