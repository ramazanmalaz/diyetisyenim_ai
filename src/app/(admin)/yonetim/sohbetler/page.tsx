import Link from "next/link";

import { CreateGroupForm } from "@/components/admin/create-group-form";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function SohbetlerPage() {
  await requireStaff();
  const supabase = await createClient();

  const { data: groups } = await supabase
    .from("conversations")
    .select("id, title, ai_enabled, created_at")
    .eq("type", "group")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8">
      <div>
        <Link href="/yonetim" className="text-sm text-emerald-600">
          ← Yönetim
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Sohbet Grupları</h1>
      </div>

      <CreateGroupForm />

      {groups && groups.length > 0 ? (
        <ul className="divide-y divide-gray-200 rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
          {groups.map((g) => (
            <li key={g.id}>
              <Link
                href={`/yonetim/sohbetler/${g.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-900"
              >
                <span className="font-medium">{g.title ?? "Grup"}</span>
                {g.ai_enabled && (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                    AI
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-500">Henüz grup yok.</p>
      )}
    </div>
  );
}
