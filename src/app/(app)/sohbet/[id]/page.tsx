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
    .select("id, type, title")
    .eq("id", id)
    .single();

  if (!conversation) notFound();

  const { data: messages } = await supabase
    .from("messages")
    .select("id, sender_id, type, content, image_path, created_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3 dark:border-gray-800">
        <Link
          href="/sohbet"
          aria-label="Sohbetlere geri dön"
          className="text-sm text-emerald-600"
        >
          ←
        </Link>
        <h1 className="font-semibold">
          {conversation.title ??
            (conversation.type === "group" ? "Grup" : "Sohbet")}
        </h1>
      </div>

      <MessageThread
        conversationId={conversation.id}
        currentUserId={profile.id}
        initialMessages={messages ?? []}
      />
    </div>
  );
}
