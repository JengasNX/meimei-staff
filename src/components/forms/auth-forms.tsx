"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, registerAction, type FormState } from "@/app/actions/auth";

const initialState: FormState = null;

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initialState);

  return (
    <form action={action} className="space-y-5">
      <div>
        <label htmlFor="username" className="label">
          Логин
        </label>
        <input
          id="username"
          name="username"
          required
          autoComplete="username"
          className="input"
          placeholder="ваш_логин"
        />
      </div>
      <div>
        <label htmlFor="password" className="label">
          Пароль
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="input"
          placeholder="••••••••"
        />
      </div>

      {state?.error && (
        <p className="rounded-xl border border-rose/40 bg-rose/10 px-4 py-3 text-sm text-rose">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Входим…" : "Войти в кабинет"}
      </button>

      <p className="text-center text-sm text-mist">
        Есть инвайт-код?{" "}
        <Link href="/register" className="link-accent">
          Зарегистрируйтесь
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, initialState);

  return (
    <form action={action} className="space-y-5">
      <div>
        <label htmlFor="code" className="label">
          Инвайт-код
        </label>
        <input
          id="code"
          name="code"
          required
          className="input font-mono"
          placeholder="выдаётся руководством"
        />
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label htmlFor="username" className="label">
            Логин (латиница)
          </label>
          <input
            id="username"
            name="username"
            required
            pattern="[A-Za-z0-9_]{3,32}"
            autoComplete="username"
            className="input"
            placeholder="nickname"
          />
        </div>
        <div>
          <label htmlFor="displayName" className="label">
            Ник для показа
          </label>
          <input
            id="displayName"
            name="displayName"
            required
            minLength={2}
            maxLength={48}
            className="input"
            placeholder="Nick_Name"
          />
        </div>
      </div>
      <div>
        <label htmlFor="password" className="label">
          Пароль (минимум 8 символов)
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="input"
          placeholder="••••••••"
        />
      </div>

      {state?.error && (
        <p className="rounded-xl border border-rose/40 bg-rose/10 px-4 py-3 text-sm text-rose">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Создаём аккаунт…" : "Создать аккаунт"}
      </button>

      <p className="text-center text-sm text-mist">
        Уже есть аккаунт?{" "}
        <Link href="/login" className="link-accent">
          Войти
        </Link>
      </p>
    </form>
  );
}
