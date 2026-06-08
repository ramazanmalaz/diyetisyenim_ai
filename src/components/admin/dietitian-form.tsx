"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  createDietitian,
  updateDietitian,
} from "@/app/(admin)/yonetim/diyetisyenler/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type DietitianFormValues = {
  id?: string;
  full_name?: string;
  title?: string;
  bio?: string | null;
  specialties?: string[];
  city?: string | null;
  photo_url?: string | null;
  years_experience?: number | null;
  is_active?: boolean;
  sort_order?: number;
  contact_phone?: string | null;
  contact_email?: string | null;
};

export function DietitianForm({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial?: DietitianFormValues;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    const fd = new FormData(e.currentTarget);
    const res =
      mode === "create"
        ? await createDietitian(fd)
        : await updateDietitian(fd);
    setBusy(false);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    if (mode === "create") {
      router.push("/yonetim/diyetisyenler");
    } else {
      setSaved(true);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="full_name">Ad soyad *</Label>
          <Input id="full_name" name="full_name" defaultValue={initial?.full_name} required />
        </div>
        <div>
          <Label htmlFor="title">Ünvan</Label>
          <Input id="title" name="title" defaultValue={initial?.title ?? "Diyetisyen"} />
        </div>
        <div>
          <Label htmlFor="city">Şehir</Label>
          <Input id="city" name="city" defaultValue={initial?.city ?? ""} />
        </div>
        <div>
          <Label htmlFor="years_experience">Deneyim (yıl)</Label>
          <Input
            id="years_experience"
            name="years_experience"
            type="number"
            min="0"
            defaultValue={initial?.years_experience ?? ""}
          />
        </div>
        <div>
          <Label htmlFor="sort_order">Sıra (küçük üstte)</Label>
          <Input
            id="sort_order"
            name="sort_order"
            type="number"
            defaultValue={initial?.sort_order ?? 0}
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="photo_url">Fotoğraf URL</Label>
          <Input id="photo_url" name="photo_url" defaultValue={initial?.photo_url ?? ""} placeholder="https://…" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="specialties">Uzmanlık alanları (virgülle ayır)</Label>
          <Input
            id="specialties"
            name="specialties"
            defaultValue={(initial?.specialties ?? []).join(", ")}
            placeholder="Kilo yönetimi, Diyabet, Sporcu beslenmesi"
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="bio">Hakkında</Label>
          <textarea
            id="bio"
            name="bio"
            rows={3}
            defaultValue={initial?.bio ?? ""}
            className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm dark:border-gray-700 dark:bg-gray-950"
          />
        </div>
      </div>

      <fieldset className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/40 dark:bg-amber-950/20">
        <legend className="px-1 text-xs font-medium text-amber-700 dark:text-amber-400">
          İletişim (yalnızca yönetimde görünür, danışana gösterilmez)
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="contact_phone">Telefon</Label>
            <Input id="contact_phone" name="contact_phone" defaultValue={initial?.contact_phone ?? ""} />
          </div>
          <div>
            <Label htmlFor="contact_email">E-posta</Label>
            <Input id="contact_email" name="contact_email" defaultValue={initial?.contact_email ?? ""} />
          </div>
        </div>
      </fieldset>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="is_active"
          defaultChecked={initial?.is_active ?? true}
          className="h-4 w-4 rounded border-gray-300"
        />
        Aktif (danışanlara görünür)
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-emerald-600">Kaydedildi ✓</p>}

      <Button type="submit" disabled={busy}>
        {busy ? "Kaydediliyor…" : mode === "create" ? "Diyetisyen ekle" : "Kaydet"}
      </Button>
    </form>
  );
}
