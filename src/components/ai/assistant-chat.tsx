"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };

export function AssistantChat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const history: Msg[] = [...messages, { role: "user", content: text }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      if (!res.ok || !res.body) throw new Error("İstek başarısız");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: acc };
          return copy;
        });
      }
    } catch {
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = {
          role: "assistant",
          content: "Üzgünüm, bir hata oluştu. Lütfen tekrar dene.",
        };
        return copy;
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <div
        className="flex-1 space-y-4 overflow-y-auto p-4"
        aria-live="polite"
        aria-label="Sohbet mesajları"
      >
        {messages.length === 0 && (
          <div className="mx-auto max-w-md pt-10 text-center text-sm text-gray-500">
            Beslenme ve diyetinle ilgili sorularını yazabilirsin. Örneğin:
            “Akşam yemeğinde tok tutan hafif bir öneri var mı?”
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              "flex",
              m.role === "user" ? "justify-end" : "justify-start",
            )}
          >
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap",
                m.role === "user"
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800",
              )}
            >
              {m.content || (loading ? "…" : "")}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={send}
        className="flex gap-2 border-t border-gray-200 p-3 dark:border-gray-800"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Bir soru yaz…"
          disabled={loading}
        />
        <Button type="submit" disabled={loading || !input.trim()}>
          Gönder
        </Button>
      </form>
    </div>
  );
}
