import { ArrowLeft, Bot, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MessageThread } from "@/components/chat/message-thread";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireProfile();
  const { id } = await params;
  const supabase = await createClient();

  // RLS: yalnızca üye (veya personel) konuşmayı görebilir.
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, type, title, ai_enabled")
    .eq("id", id)
    .single();

  if (!conversation) notFound();

  const ai = conversation.ai_enabled;
  const title =
    conversation.title ?? (conversation.type === "group" ? "Grup" : "Sohbet");
  const subtitle = ai
    ? "Yapay zekâ asistan"
    : conversation.type === "group"
      ? "Grup sohbeti"
      : "Birebir sohbet";

  const { data: messages } = await supabase
    .from("messages")
    .select("id, sender_id, type, content, image_path, created_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center gap-3 border-b border-gray-200 bg-white/80 px-3 py-2.5 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-950/70">
        <Link
          href="/sohbet"
          aria-label="Sohbetlere geri dön"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-gray-500 transition hover:bg-black/5 active:scale-95 dark:hover:bg-white/10"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span
          className={
            "grid h-10 w-10 shrink-0 place-items-center rounded-full " +
            (ai
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
              : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-300")
          }
        >
          {ai ? (
            <Bot className="h-5 w-5" strokeWidth={2} />
          ) : (
            <Users className="h-5 w-5" strokeWidth={2} />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-semibold leading-tight">{title}</h1>
          <p className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
            {ai && (
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            )}
            {subtitle}
          </p>
        </div>
      </div>

      <MessageThread
        conversationId={conversation.id}
        currentUserId={profile.id}
        initialMessages={messages ?? []}
      />
    </div>
  );
}
