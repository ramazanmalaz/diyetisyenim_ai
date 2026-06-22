"use client";

import { Camera } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { analyzeAssistantPhoto } from "@/app/(app)/asistan/actions";
import { PlateCamera } from "@/components/plan/plate-camera";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Markdown } from "@/components/ui/markdown";
import { triggerPremiumWall } from "@/lib/premium-wall";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string; image?: string };

export function AssistantChat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
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
        body: JSON.stringify({
          messages: history.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      // Günlük ücretsiz hak doldu → premium popup'ı aç, boş baloncuğu kaldır.
      if (res.status === 402) {
        setMessages((prev) => prev.slice(0, -1));
        setInput(text);
        triggerPremiumWall("chat");
        return;
      }
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

  async function handlePhoto(file: File) {
    if (loading) return;
    const preview = URL.createObjectURL(file);
    const transcript = messages
      .map((m) => `${m.role === "user" ? "Danışan" : "Asistan"}: ${m.content}`)
      .join("\n");

    setMessages((prev) => [
      ...prev,
      { role: "user", content: "📷 Fotoğraf paylaştım", image: preview },
      { role: "assistant", content: "" },
    ]);
    setLoading(true);

    try {
      const fd = new FormData();
      fd.set("photo", file);
      fd.set("transcript", transcript);
      const res = await analyzeAssistantPhoto(fd);
      if ("quota" in res) {
        // Vision kotası doldu → fotoğraf + boş baloncuğu kaldır, popup aç.
        setMessages((prev) => prev.slice(0, -2));
        triggerPremiumWall("vision");
        return;
      }
      const answer =
        "answer" in res
          ? res.answer
          : (res.error ?? "Fotoğraf analiz edilemedi.");
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = { role: "assistant", content: answer };
        return copy;
      });
    } catch {
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = {
          role: "assistant",
          content: "Fotoğraf analiz edilemedi, lütfen tekrar dene.",
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
            Sorularını yazabilir ya da tabağının fotoğrafını paylaşabilirsin.
            Örneğin: “Akşam yemeğinde tok tutan hafif bir öneri var mı?”
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
                "max-w-[80%] rounded-2xl px-4 py-2 text-sm",
                m.role === "user"
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800",
              )}
            >
              {m.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.image}
                  alt="Paylaşılan fotoğraf"
                  className="mb-1.5 max-h-44 rounded-lg object-cover"
                />
              )}
              {m.role === "assistant" ? (
                m.content ? (
                  <Markdown>{m.content}</Markdown>
                ) : (
                  loading && "…"
                )
              ) : (
                <span className="whitespace-pre-wrap">{m.content}</span>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={send}
        className="flex items-center gap-2 border-t border-gray-200 p-3 dark:border-gray-800"
      >
        <button
          type="button"
          onClick={() => setCameraOpen(true)}
          disabled={loading}
          aria-label="Fotoğraf çek veya yükle"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-300 text-gray-500 transition hover:border-emerald-400 hover:text-emerald-600 disabled:opacity-50 dark:border-gray-700"
        >
          <Camera className="h-5 w-5" strokeWidth={1.75} />
        </button>
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

      <PlateCamera
        open={cameraOpen}
        title="Fotoğrafını paylaş"
        onClose={() => setCameraOpen(false)}
        onCapture={handlePhoto}
      />
    </div>
  );
}
