"use client";

import { useActionState } from "react";
import { submitJoinAction, type FormState } from "@/app/actions/public";

const initialState: FormState = null;

export function JoinForm() {
  const [state, action, pending] = useActionState(submitJoinAction, initialState);

  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label htmlFor="nickname" className="label">
            Игровой ник
          </label>
          <input
            id="nickname"
            name="nickname"
            required
            minLength={2}
            maxLength={48}
            className="input"
            placeholder="Nick_Name"
          />
        </div>
        <div>
          <label htmlFor="age" className="label">
            Возраст
          </label>
          <input
            id="age"
            name="age"
            type="number"
            required
            min={10}
            max={80}
            className="input"
            placeholder="14"
          />
        </div>
      </div>

      <div>
        <label htmlFor="contact" className="label">
          Контакт (VK / Telegram)
        </label>
        <input
          id="contact"
          name="contact"
          required
          minLength={4}
          maxLength={120}
          className="input"
          placeholder="vk.com/… или @username"
        />
      </div>

      <div>
        <label htmlFor="about" className="label">
          О себе: чем хочешь заниматься, опыт, время на проект
        </label>
        <textarea
          id="about"
          name="about"
          required
          minLength={20}
          maxLength={2000}
          rows={5}
          className="input resize-y"
          placeholder="Расскажи о себе — минимум 20 символов"
        />
      </div>

      {state?.error && (
        <p className="rounded-xl border border-rose/40 bg-rose/10 px-4 py-3 text-sm text-rose">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="rounded-xl border border-leaf/40 bg-leaf/10 px-4 py-3 text-sm text-leaf">
          {state.ok}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary w-full md:w-auto">
        {pending ? "Отправляем…" : "Отправить заявку"}
      </button>
    </form>
  );
}
