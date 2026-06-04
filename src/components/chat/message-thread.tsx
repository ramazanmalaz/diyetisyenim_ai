"use client";

import { useEffect, useRef, useState } from "react";

import { sendMessage, sendPhotoMessage } from "@/app/(app)/sohbet/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Markdown } from "@/components/ui/markdown";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { MessageType } from "@/types/database";

const BUCKET = "progress-photos";

export type ChatMessageRow = {
  id: string;
  sender_id: string | null;
  type: MessageType;
  content: string;
  image_path: string | null;
  created_at: string;
};

const SELECT = "id, sender_id, type, content, image_path, created_at";

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
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fotoğraflı mesajlar için imzalı URL üret (gizli bucket).
  useEffect(() => {
    const missing = messages
      .map((m) => m.image_path)
      .filter((p): p is string => Boolean(p) && !(p! in imageUrls));
    if (missing.length === 0) return;
    const supabase = createClient();
    (async () => {
      const entries: [string, string][] = [];
      for (const path of missing) {
        const { data } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(path, 3600);
        if (data?.signedUrl) entries.push([path, data.signedUrl]);
      }
      if (entries.length > 0) {
        setImageUrls((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
      }
    })();
  }, [messages, imageUrls]);

  async function refetch() {
    const supabase = createClient();
    const { data } = await supabase
      .from("messages")
      .select(SELECT)
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    if (data) setMessages(data as ChatMessageRow[]);
  }

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput("");

    const optimistic: ChatMessageRow = {
      id: `temp-${Date.now()}`,
      sender_id: currentUserId,
      type: "user",
      content: text,
      image_path: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    const result = await sendMessage({ conversationId, content: text });
    await refetch();
    setSending(false);
    if (result && "error" in result) setInput(text);
  }

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || sending) return;
    setSending(true);

    const optimistic: ChatMessageRow = {
      id: `temp-${Date.now()}`,
      sender_id: currentUserId,
      type: "user",
      content: "📷 Tabağımın fotoğrafını paylaştım",
      image_path: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    const fd = new FormData();
    fd.set("conversationId", conversationId);
    fd.set("photo", file);
    await sendPhotoMessage(fd);
    await refetch();
    setSending(false);
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
            Henüz mesaj yok. İlk mesajını yaz ya da tabağının fotoğrafını paylaş.
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
          const url = m.image_path ? imageUrls[m.image_path] : undefined;
          return (
            <div
              key={m.id}
              className={cn("flex", mine ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2 text-sm",
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
                {url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={url}
                    alt="Tabak fotoğrafı"
                    className="mb-1 max-h-56 rounded-lg object-cover"
                  />
                )}
                {m.type === "ai" ? (
                  <Markdown>{m.content}</Markdown>
                ) : (
                  <span className="whitespace-pre-wrap">{m.content}</span>
                )}
              </div>
            </div>
          );
        })}
        {sending && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-gray-100 px-4 py-2 text-sm text-gray-500 dark:bg-gray-800">
              Asistan yazıyor…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={onSend}
        className="flex items-center gap-2 border-t border-gray-200 p-3 dark:border-gray-800"
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={onPhoto}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => fileRef.current?.click()}
          disabled={sending}
          aria-label="Fotoğraf ekle"
          className="px-3"
        >
          📷
        </Button>
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
