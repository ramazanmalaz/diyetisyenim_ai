"use client";

import { useState } from "react";

import { requestAppointment } from "@/app/(app)/randevu/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AppointmentForm() {
  const [scheduledAt, setScheduledAt] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const result = await requestAppointment({ scheduledAt, notes });
    setSaving(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setScheduledAt("");
    setNotes("");
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-3 rounded-xl border border-gray-200 p-4 dark:border-gray-800"
    >
      <p className="font-medium">Randevu talep et</p>
      <div>
        <Label htmlFor="scheduledAt">Tarih ve saat</Label>
        <Input
          id="scheduledAt"
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="notes">Not (ops.)</Label>
        <Input
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Görüşmek istediğin konu"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={saving || !scheduledAt}>
        {saving ? "Gönderiliyor…" : "Talep gönder"}
      </Button>
    </form>
  );
}
