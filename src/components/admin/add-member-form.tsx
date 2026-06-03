"use client";

import { useState } from "react";

import { addMember } from "@/app/(admin)/yonetim/sohbetler/actions";
import { Button } from "@/components/ui/button";

type ClientOption = { id: string; full_name: string | null };

export function AddMemberForm({
  conversationId,
  clients,
}: {
  conversationId: string;
  clients: ClientOption[];
}) {
  const [userId, setUserId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setError(null);
    setSaving(true);
    const result = await addMember({ conversationId, userId });
    setSaving(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setUserId("");
  }

  if (clients.length === 0) {
    return (
      <p className="text-sm text-gray-500">Eklenebilecek danışan kalmadı.</p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2">
      <select
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
        className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-950"
      >
        <option value="">Danışan seç…</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.full_name ?? c.id}
          </option>
        ))}
      </select>
      <Button type="submit" disabled={saving || !userId}>
        {saving ? "Ekleniyor…" : "Ekle"}
      </Button>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </form>
  );
}
