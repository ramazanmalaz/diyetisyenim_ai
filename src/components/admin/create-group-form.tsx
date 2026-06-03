"use client";

import { useState } from "react";

import { createGroup } from "@/app/(admin)/yonetim/sohbetler/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateGroupForm() {
  const [title, setTitle] = useState("");
  const [aiEnabled, setAiEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const result = await createGroup({ title, aiEnabled });
    setSaving(false);
    if ("error" in result) setError(result.error);
    // Başarılıysa server action grup detayına yönlendirir.
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-3 rounded-xl border border-gray-200 p-4 dark:border-gray-800"
    >
      <p className="font-medium">Yeni grup</p>
      <div>
        <Label htmlFor="title">Grup adı</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Örn. Haziran Grubu"
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={aiEnabled}
          onChange={(e) => setAiEnabled(e.target.checked)}
        />
        AI asistanı bu grupta yanıt versin
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={saving || title.trim().length < 2}>
        {saving ? "Oluşturuluyor…" : "Grup oluştur"}
      </Button>
    </form>
  );
}
