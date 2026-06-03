"use client";

import { useEffect, useRef, useState } from "react";

import { sendMessage } from "@/app/(app)/sohbet/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { MessageType } from "@/types/database";

export type ChatMessageRow = {
  id: string;
  sender_id: string | null;
  type: MessageType;
  content: string;
  created_at: string;
};

export function MessageThread({
  conversationId,
  currentUserId,
  initialMessages,
}: {
  conversationId: string;
  currentUserId: string;
  initialMessages: ChatMessageRow[];
}) {
  const [messages, setMessages] = useState<ChatMessageRow[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const row = payload.new as ChatMessageRow;
          setMessages((prev) =>
            prev.some((m) => m.id === row.id) ? prev : [...prev, row],
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId]);

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput("");
    const result = await sendMessage({ conversationId, content: text });
    setSending(false);
    if ("error" in result) {
      setInput(text); // hata: metni geri koy
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <div
        className="flex-1 space-y-3 overflow-y-auto p-4"
        aria-live="polite"
        aria-label="Mesajlar"
      >
        {messages.length === 0 && (
          <p className="pt-10 text-center text-sm text-gray-500">
            Henüz mesaj yok. İlk mesajını yaz.
          </p>
        )}

        {messages.map((m) => {
          if (m.type === "system") {
            return (
              <p key={m.id} className="text-center text-xs text-gray-400">
                {m.content}
              </p>
            );
          }
          const mine = m.type === "user" && m.sender_id === currentUserId;
          return (
            <div
              key={m.id}
              className={cn("flex", mine ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap",
                  mine
                    ? "bg-emerald-600 text-white"
                    : m.type === "ai"
                      ? "bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-50"
                      : "bg-gray-100 dark:bg-gray-800",
                )}
              >
                {m.type === "ai" && (
                  <span className="mb-0.5 block text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    Asistan
                  </span>
                )}
                {m.content}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={onSend}
        className="flex gap-2 border-t border-gray-200 p-3 dark:border-gray-800"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Mesaj yaz…"
          disabled={sending}
        />
        <Button type="submit" disabled={sending || !input.trim()}>
          Gönder
        </Button>
      </form>
    </div>
  );
}
