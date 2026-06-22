import { Bot, ChevronRight, MessageCircle, Sparkles, Users } from "lucide-react";
import Link from "next/link";

import { openAssistant } from "@/app/(app)/sohbet/actions";
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

  const list = conversations ?? [];

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold">Sohbetler</h1>
        <p className="text-sm text-gray-500">
          Yapay zekâ asistanına diyetinle ilgili her şeyi sorabilirsin.
        </p>
      </div>

      {/* Asistanla sohbet — birincil CTA */}
      <form action={openAssistant}>
        <button
          type="submit"
          className="group flex w-full items-center gap-3 rounded-3xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 to-teal-50/40 p-4 text-left shadow-[var(--shadow-soft)] transition-[transform,box-shadow] duration-200 ease-[var(--ease-out)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-float)] dark:border-emerald-900/40 dark:from-emerald-950/20 dark:to-teal-950/10"
        >
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-600 text-white shadow-[0_6px_16px_-6px_rgba(5,150,105,0.7)]">
            <Bot className="h-6 w-6" strokeWidth={2} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 font-semibold text-emerald-900 dark:text-emerald-100">
              Asistana sor
              <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
            </span>
            <span className="block text-xs text-emerald-700/80 dark:text-emerald-300/70">
              İkame, kalori, sağlık soruları + tabak fotoğrafı analizi
            </span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-emerald-600/60 transition-transform group-hover:translate-x-0.5" />
        </button>
      </form>

      {list.length > 0 ? (
        <div className="space-y-2.5">
          <h2 className="px-1 text-xs font-semibold tracking-[0.14em] text-gray-400 uppercase">
            Sohbetlerin
          </h2>
          <ul className="space-y-2.5">
            {list.map((c) => {
              const ai = c.ai_enabled;
              const Icon = ai ? Bot : c.type === "group" ? Users : MessageCircle;
              return (
                <li key={c.id}>
                  <Link
                    href={`/sohbet/${c.id}`}
                    className="group flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3.5 shadow-[var(--shadow-soft)] transition-[transform,box-shadow] duration-200 ease-[var(--ease-out)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-float)] dark:border-gray-800 dark:bg-gray-900"
                  >
                    <span
                      className={
                        "grid h-11 w-11 shrink-0 place-items-center rounded-xl " +
                        (ai
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                          : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-300")
                      }
                    >
                      <Icon className="h-5 w-5" strokeWidth={2} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {c.title ?? (c.type === "group" ? "Grup" : "Sohbet")}
                      </span>
                      <span className="block text-xs text-gray-400">
                        {ai
                          ? "Yapay zekâ asistan"
                          : c.type === "group"
                            ? "Grup sohbeti"
                            : "Birebir sohbet"}
                      </span>
                    </span>
                    {ai && (
                      <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold tracking-wide text-emerald-700 uppercase dark:bg-emerald-950/40 dark:text-emerald-300">
                        AI
                      </span>
                    )}
                    <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 transition-transform group-hover:translate-x-0.5 dark:text-gray-600" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <p className="px-1 text-sm text-gray-500">
          Henüz bir sohbetin yok. Yukarıdan asistana ilk sorunu sor.
        </p>
      )}
    </div>
  );
}
