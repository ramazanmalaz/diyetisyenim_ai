import { Bot, MessageCircle, Users } from "lucide-react";
import Link from "next/link";

import { MessageThread } from "@/components/chat/message-thread";
import { requireProfile } from "@/lib/auth";
import { getAssistantConversationId } from "@/lib/chat/assistant";
import { resolveDirectConvId } from "@/lib/chat/conversations";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type Tab = "ai" | "diyetisyen";

export default async function SohbetPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activeTab: Tab | null =
    tab === "ai" || tab === "diyetisyen" ? tab : null;

  const profile = await requireProfile();
  const admin = createAdminClient();
  const supabase = await createClient();

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

  const directConvId = profile.dietitian_id
    ? await resolveDirectConvId(
        admin,
        profile.dietitian_id,
        profile.id,
        dietitianProfile?.full_name ?? null,
      )
    : null;

  // Üyesi olduğum gruplar (diyetisyen birden çok grup açabilir).
  const { data: groupRows } = await admin
    .from("client_group_members")
    .select("client_groups (id, name, note, conversation_id)")
    .eq("client_id", profile.id);

  const groups = (groupRows ?? [])
    .map(
      (r) =>
        r.client_groups as unknown as {
          id: string;
          name: string;
          note: string | null;
          conversation_id: string | null;
        } | null,
    )
    .filter(
      (
        g,
      ): g is {
        id: string;
        name: string;
        note: string | null;
        conversation_id: string;
      } => g != null && g.conversation_id != null,
    );

  const activeConvId =
    activeTab === "ai" ? aiConvId : activeTab === "diyetisyen" ? directConvId : null;

  const { data: initialMessages } = activeConvId
    ? await supabase
        .from("messages")
        .select("id, sender_id, type, content, image_path, created_at")
        .eq("conversation_id", activeConvId)
        .order("created_at", { ascending: true })
    : { data: [] };

  if (activeTab && activeConvId) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="sticky top-16 z-20 flex items-center gap-3 border-b border-gray-200 bg-white/90 px-4 py-2.5 backdrop-blur dark:border-gray-800 dark:bg-gray-950/90">
          <Link
            href="/sohbet"
            className="rounded-lg px-2 py-1 text-sm text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
          >
            ← Sohbetler
          </Link>
          <span className="font-semibold">
            {activeTab === "ai" ? "AI Asistan" : "Diyetisyenim"}
          </span>
        </div>
        <MessageThread
          conversationId={activeConvId}
          currentUserId={profile.id}
          initialMessages={initialMessages ?? []}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-8">
      <h1 className="text-2xl font-bold">Sohbet</h1>
      <p className="text-sm text-gray-500">
        Asistana sor, diyetisyeninle yaz ya da gruplarına katıl.
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
              AI Asistan
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
            <p className="font-semibold">
              {dietitianProfile?.full_name ?? "Diyetisyenim"}
            </p>
            <p className="text-sm text-gray-500">
              {directConvId
                ? "Diyetisyeninle birebir sohbet"
                : "Henüz diyetisyen atanmadı"}
            </p>
          </div>
        </Link>

        {/* Gruplar */}
        {groups.map((g) => (
          <Link
            key={g.id}
            href={`/sohbet/${g.conversation_id}`}
            className="group flex items-center gap-4 rounded-3xl border border-violet-200/70 bg-gradient-to-br from-violet-50 to-purple-50/40 p-4 shadow-[var(--shadow-soft)] transition-[transform,box-shadow] duration-200 ease-[var(--ease-out)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-float)] dark:border-violet-900/40 dark:from-violet-950/20"
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-violet-500 text-white shadow-[0_6px_16px_-6px_rgba(139,92,246,0.7)]">
              <Users className="h-6 w-6" strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{g.name}</p>
              <p className="truncate text-sm text-gray-500">
                {g.note ?? "Grup sohbeti"}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
