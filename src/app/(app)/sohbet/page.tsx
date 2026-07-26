import { Bot, MessageCircle, Users } from "lucide-react";
import Link from "next/link";

import { MessageThread } from "@/components/chat/message-thread";
import { requireProfile } from "@/lib/auth";
import { getAssistantConversationId } from "@/lib/chat/assistant";
import {
  resolveDirectConvId,
  resolveGroupConvId,
} from "@/lib/chat/conversations";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type Tab = "ai" | "grup" | "diyetisyen";

const TABS: { id: Tab; label: string; icon: typeof Bot }[] = [
  { id: "grup", label: "Grup", icon: Users },
  { id: "diyetisyen", label: "Diyetisyen", icon: MessageCircle },
  { id: "ai", label: "AI", icon: Bot },
];

export default async function SohbetPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activeTab: Tab | null =
    tab === "ai" || tab === "grup" || tab === "diyetisyen" ? tab : null;

  const profile = await requireProfile();
  const admin = createAdminClient();
  const supabase = await createClient();

  // Konuşma ID'lerini paralel çöz
  const [aiConvId, dietitianProfile] = await Promise.all([
    getAssistantConversationId(admin, profile.id),
    profile.dietitian_id
      ? admin
          .from("profiles")
          .select("full_name")
          .eq("id", profile.dietitian_id)
          .single()
          .then((r) => r.data)
      : Promise.resolve(null),
  ]);

  let groupConvId: string | null = null;
  let directConvId: string | null = null;

  if (profile.dietitian_id) {
    [groupConvId, directConvId] = await Promise.all([
      resolveGroupConvId(
        admin,
        profile.dietitian_id,
        dietitianProfile?.full_name ?? null,
      ),
      resolveDirectConvId(
        admin,
        profile.dietitian_id,
        profile.id,
        dietitianProfile?.full_name ?? null,
      ),
    ]);
  }

  // Aktif sekme için mesajları yükle
  let activeConvId: string | null = null;
  if (activeTab === "ai") activeConvId = aiConvId;
  else if (activeTab === "grup") activeConvId = groupConvId;
  else if (activeTab === "diyetisyen") activeConvId = directConvId;

  const { data: initialMessages } = activeConvId
    ? await supabase
        .from("messages")
        .select("id, sender_id, type, content, image_path, created_at")
        .eq("conversation_id", activeConvId)
        .order("created_at", { ascending: true })
    : { data: [] };

  const convIdByTab: Record<Tab, string | null> = {
    ai: aiConvId,
    grup: groupConvId,
    diyetisyen: directConvId,
  };

  return (
    <div className="flex flex-1 flex-col">
      {/* 3-tab çubuğu */}
      <div className="sticky top-16 z-20 border-b border-gray-200 bg-white/90 backdrop-blur dark:border-gray-800 dark:bg-gray-950/90">
        <div className="mx-auto flex max-w-2xl">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = activeTab === id;
            const disabled = id !== "ai" && !convIdByTab[id];
            return (
              <Link
                key={id}
                href={disabled ? "#" : `/sohbet?tab=${id}`}
                aria-disabled={disabled}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 py-3 text-xs font-semibold transition-[color,border-color] duration-150",
                  active
                    ? "border-b-2 border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-300"
                    : disabled
                      ? "cursor-not-allowed text-gray-300 dark:text-gray-700"
                      : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300",
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={1.75} />
                {label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* İçerik */}
      {activeTab && activeConvId ? (
        <MessageThread
          conversationId={activeConvId}
          currentUserId={profile.id}
          initialMessages={initialMessages ?? []}
        />
      ) : activeTab && !activeConvId ? (
        <div className="flex flex-1 items-center justify-center p-8 text-center">
          <div className="space-y-2">
            <p className="font-medium text-gray-600 dark:text-gray-300">
              Sohbet bulunamadı
            </p>
            <p className="text-sm text-gray-400">
              {activeTab === "grup" || activeTab === "diyetisyen"
                ? "Diyetisyeniniz henüz bir sohbet açmamış."
                : "Bir hata oluştu."}
            </p>
          </div>
        </div>
      ) : (
        /* Giriş ekranı — tab seçilmedi */
        <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-8">
          <h1 className="text-2xl font-bold">Sohbet</h1>
          <p className="text-sm text-gray-500">
            Aşağıdaki sekmelerden birine dokun.
          </p>
          <div className="space-y-3 pt-2">
            {/* AI */}
            <Link
              href="/sohbet?tab=ai"
              className="group flex items-center gap-4 rounded-3xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 to-teal-50/40 p-4 shadow-[var(--shadow-soft)] transition-[transform,box-shadow] duration-200 ease-[var(--ease-out)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-float)] dark:border-emerald-900/40 dark:from-emerald-950/20 dark:to-teal-950/10"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-600 text-white shadow-[0_6px_16px_-6px_rgba(5,150,105,0.7)]">
                <Bot className="h-6 w-6" strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-emerald-900 dark:text-emerald-100">
                  AI Diyetisyen
                </p>
                <p className="text-sm text-emerald-700/70 dark:text-emerald-300/60">
                  İkame, kalori, sağlık sorularını sor
                </p>
              </div>
            </Link>

            {/* Diyetisyen */}
            <Link
              href={directConvId ? "/sohbet?tab=diyetisyen" : "#"}
              aria-disabled={!directConvId}
              className={cn(
                "group flex items-center gap-4 rounded-3xl border p-4 shadow-[var(--shadow-soft)] transition-[transform,box-shadow] duration-200 ease-[var(--ease-out)]",
                directConvId
                  ? "border-sky-200/70 bg-gradient-to-br from-sky-50 to-blue-50/40 hover:-translate-y-0.5 hover:shadow-[var(--shadow-float)] dark:border-sky-900/40 dark:from-sky-950/20"
                  : "cursor-not-allowed border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50",
              )}
            >
              <span
                className={cn(
                  "grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white",
                  directConvId
                    ? "bg-sky-500 shadow-[0_6px_16px_-6px_rgba(14,165,233,0.7)]"
                    : "bg-gray-300 dark:bg-gray-700",
                )}
              >
                <MessageCircle className="h-6 w-6" strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">Diyetisyenim</p>
                <p className="text-sm text-gray-500">
                  {directConvId
                    ? "Diyetisyeninizle birebir sohbet"
                    : "Henüz diyetisyen atanmadı"}
                </p>
              </div>
            </Link>

            {/* Grup */}
            <Link
              href={groupConvId ? "/sohbet?tab=grup" : "#"}
              aria-disabled={!groupConvId}
              className={cn(
                "group flex items-center gap-4 rounded-3xl border p-4 shadow-[var(--shadow-soft)] transition-[transform,box-shadow] duration-200 ease-[var(--ease-out)]",
                groupConvId
                  ? "border-violet-200/70 bg-gradient-to-br from-violet-50 to-purple-50/40 hover:-translate-y-0.5 hover:shadow-[var(--shadow-float)] dark:border-violet-900/40 dark:from-violet-950/20"
                  : "cursor-not-allowed border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50",
              )}
            >
              <span
                className={cn(
                  "grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white",
                  groupConvId
                    ? "bg-violet-500 shadow-[0_6px_16px_-6px_rgba(139,92,246,0.7)]"
                    : "bg-gray-300 dark:bg-gray-700",
                )}
              >
                <Users className="h-6 w-6" strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">Grup</p>
                <p className="text-sm text-gray-500">
                  {groupConvId
                    ? "Diyetisyen ve tüm danışanlarla grup sohbeti"
                    : "Henüz grup sohbeti yok"}
                </p>
              </div>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
