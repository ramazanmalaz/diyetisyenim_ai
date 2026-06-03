"use client";

import { useState } from "react";

import { saveAiRule } from "@/app/(admin)/yonetim/ai-kurallari/actions";
import { Button } from "@/components/ui/button";

export function AiRulesEditor({
  ruleKey,
  initialContent,
}: {
  ruleKey: string;
  initialContent: string;
}) {
  const [content, setContent] = useState(initialContent);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  async function onSave() {
    setStatus("saving");
    setError(null);
    const result = await saveAiRule({ key: ruleKey, content });
    if ("error" in result) {
      setError(result.error);
      setStatus("error");
      return;
    }
    setStatus("saved");
  }

  return (
    <div className="space-y-3">
      <textarea
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          setStatus("idle");
        }}
        rows={10}
        className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-gray-700 dark:bg-gray-950"
        placeholder="Asistanın danışanlara nasıl davranacağını buraya yaz…"
      />
      <div className="flex items-center gap-3">
        <Button onClick={onSave} disabled={status === "saving"}>
          {status === "saving" ? "Kaydediliyor…" : "Kaydet"}
        </Button>
        {status === "saved" && (
          <span className="text-sm text-emerald-600">Kaydedildi ✓</span>
        )}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
      <p className="text-xs text-gray-500">
        Not: Güvenlik kuralları (tıbbi teşhis vermeme, riskli diyet reddi vb.)
        sistemde sabittir ve bu metinle geçersiz kılınamaz.
      </p>
    </div>
  );
}
