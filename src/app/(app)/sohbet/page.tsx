import Link from "next/link";

import { openAssistant } from "@/app/(app)/sohbet/actions";
import { Button } from "@/components/ui/button";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function SohbetListPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: memberships } = await supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", profile.id);

  const ids = (memberships ?? []).map((m) => m.conversation_id);
  const { data: conversations } = ids.length
    ? await supabase
        .from("conversations")
        .select("id, type, title, ai_enabled, created_at")
        .in("id", ids)
        .order("created_at", { ascending: false })
    : { data: [] };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sohbetler</h1>
        <form action={openAssistant}>
          <Button type="submit">Asistan ile sohbet</Button>
        </form>
      </div>

      {conversations && conversations.length > 0 ? (
        <ul className="divide-y divide-gray-200 rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
          {conversations.map((c) => (
            <li key={c.id}>
              <Link
                href={`/sohbet/${c.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-900"
              >
                <span className="font-medium">
                  {c.title ?? (c.type === "group" ? "Grup" : "Sohbet")}
                </span>
                {c.ai_enabled && (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                    AI
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-500">
          Henüz sohbetin yok. “Asistan ile sohbet” diyerek başlayabilirsin.
        </p>
      )}
    </div>
  );
}
