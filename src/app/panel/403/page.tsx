import Link from "next/link";
import { ShieldX } from "lucide-react";
import { requirePageAuth } from "@/server/auth";

export default async function ForbiddenPage() {
  await requirePageAuth();
  return (
    <div className="card mx-auto max-w-lg p-10 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-rose/15 text-rose">
        <ShieldX className="size-7" />
      </span>
      <h1 className="mt-5 font-display text-2xl font-bold">Доступ запрещён</h1>
      <p className="mt-2 text-sm text-mist">
        У вашего уровня нет прав на этот раздел.
      </p>
      <Link href="/panel" className="btn-primary mt-6">
        Вернуться на дашборд
      </Link>
    </div>
  );
}
