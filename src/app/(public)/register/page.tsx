import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/forms/auth-forms";
import { getActor } from "@/server/auth";

export const metadata: Metadata = { title: "Регистрация" };

export default async function RegisterPage() {
  const actor = await getActor().catch(() => null);
  if (actor) redirect("/panel");

  return (
    <div className="mx-auto max-w-md">
      <div className="card p-6 md:p-8">
        <h1 className="font-display text-2xl font-bold">Регистрация по инвайту</h1>
        <p className="mt-1 mb-6 text-sm text-mist">
          Аккаунт создаётся только по инвайт-коду, который выдаёт руководство персонала.
        </p>
        <RegisterForm />
      </div>
    </div>
  );
}
