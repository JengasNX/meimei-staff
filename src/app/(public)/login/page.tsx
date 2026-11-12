import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/forms/auth-forms";
import { getActor } from "@/server/auth";
import { site } from "@/lib/config/site";

export const metadata: Metadata = { title: "Вход" };

export default async function LoginPage() {
  const actor = await getActor().catch(() => null);
  if (actor) redirect("/panel");

  return (
    <div className="mx-auto max-w-md">
      <div className="card p-6 md:p-8">
        <h1 className="font-display text-2xl font-bold">Личный кабинет</h1>
        <p className="mt-1 mb-6 text-sm text-mist">
          Вход для персонала {site.name}.
        </p>
        <LoginForm />
      </div>
    </div>
  );
}
