import { Crown, ImageIcon, LineChart, MessageCircle, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  openClientChat,
  openGroupChat,
  unlinkClient,
} from "@/app/(admin)/yonetim/danisanlar/actions";
import { ClientAssignPlan } from "@/components/admin/client-assign-plan";
import { ClientGrantPremium } from "@/components/admin/client-grant-premium";
import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function isPremiumActive(until: string | null): boolean {
  return !!until && new Date(until) > new Date();
}

export default async function DanisanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const dietitian = await requireStaff();
  const { id } = await params;
  const admin = createAdminClient();

  const [
    { data: profile },
    { data: activePlan },
    { data: allPlans },
    { data: recentProgress },
    { data: photoEntries },
  ] = await Promise.all([
    admin
      .from("profiles")
      .select("id, full_name, premium_until, dietitian_id, created_at")
      .eq("id", id)
      .single(),
    admin
      .from("diet_plans")
      .select(
        "id, title, status, daily_calorie_target, valid_from, valid_to",
      )
      .eq("client_id", id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle(),
    admin
      .from("diet_plans")
      .select("id, title, status")
      .eq("created_by", dietitian.id)
      .neq("status", "archived")
      .order("created_at", { ascending: false }),
    admin
      .from("progress_entries")
      .select("entry_date, weight_kg")
      .eq("client_id", id)
      .order("entry_date", { ascending: false })
      .limit(7),
    admin
      .from("progress_entries")
      .select("id, entry_date, weight_kg, photo_path, note")
      .eq("client_id", id)
      .not("photo_path", "is", null)
      .order("entry_date", { ascending: false })
      .limit(12),
  ]);

  // İlerleme fotoğrafları için imzalı URL'ler
  const photoPaths = (photoEntries ?? [])
    .map((e) => e.photo_path)
    .filter((p): p is string => Boolean(p));
  const photoUrlMap = new Map<string, string>();
  if (photoPaths.length > 0) {
    const { data: signed } = await admin.storage
      .from("progress-photos")
      .createSignedUrls(photoPaths, 3600);
    signed?.forEach((s) => {
      if (s.path && s.signedUrl) photoUrlMap.set(s.path, s.signedUrl);
    });
  }

  if (!profile || profile.dietitian_id !== dietitian.id) notFound();

  const premium = isPremiumActive(profile.premium_until);

  const weights = (recentProgress ?? [])
    .filter((p) => p.weight_kg != null)
    .map((p) => Number(p.weight_kg));
  const latestWeight = weights[0] ?? null;
  const prevWeight = weights[1] ?? null;
  const weightDelta =
    latestWeight != null && prevWeight != null
      ? +(latestWeight - prevWeight).toFixed(1)
      : null;

  // Plans created by this dietitian, excluding archived ones
  // Include active plan even if from another dietitian
  const assignablePlans = allPlans ?? [];

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8">
      <div>
        <Link
          href="/yonetim/danisanlar"
          className="text-sm text-emerald-600 hover:underline"
        >
          ← Danışanlar
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-center gap-4">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-emerald-100 text-2xl font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
          {(profile.full_name ?? "?").charAt(0).toUpperCase()}
        </span>
        <div>
          <h1 className="text-2xl font-bold">
            {profile.full_name ?? "İsimsiz"}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
            <span>{fmtDate(profile.created_at)}</span>
            {premium && (
              <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                <Crown className="h-3 w-3" /> Premium
                {profile.premium_until &&
                  ` · ${fmtDate(profile.premium_until)}'e kadar`}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Hızlı aksiyonlar */}
      <div className="grid grid-cols-2 gap-3">
        <form action={openClientChat}>
          <input type="hidden" name="client_id" value={profile.id} />
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium shadow-[var(--shadow-soft)] transition hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800"
          >
            <MessageCircle className="h-4 w-4 text-emerald-600" /> Mesaj gönder
          </button>
        </form>
        <form action={openGroupChat}>
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium shadow-[var(--shadow-soft)] transition hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800"
          >
            <Users className="h-4 w-4 text-emerald-600" /> Gruba yaz
          </button>
        </form>
      </div>

      {/* İstatistikler */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-[var(--shadow-soft)] dark:border-gray-800 dark:bg-gray-900">
          <p className="text-2xl font-bold tabular-nums">
            {latestWeight != null ? latestWeight : "—"}
            {latestWeight != null && (
              <span className="text-sm font-normal text-gray-500"> kg</span>
            )}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">Son kilo</p>
          {weightDelta != null && (
            <p
              className={`text-xs font-medium ${weightDelta < 0 ? "text-emerald-600" : weightDelta > 0 ? "text-rose-500" : "text-gray-400"}`}
            >
              {weightDelta > 0 ? "+" : ""}
              {weightDelta} kg
            </p>
          )}
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-[var(--shadow-soft)] dark:border-gray-800 dark:bg-gray-900">
          <p className="text-2xl font-bold tabular-nums">
            {(recentProgress ?? []).filter((p) => p.weight_kg != null).length}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">Ölçüm kaydı</p>
        </div>
      </div>

      {/* Aktif plan */}
      <div className="space-y-3">
        <h2 className="font-semibold">Aktif Plan</h2>
        {activePlan ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
            <p className="font-medium text-emerald-900 dark:text-emerald-100">
              {activePlan.title}
            </p>
            {activePlan.daily_calorie_target != null && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {activePlan.daily_calorie_target} kcal / gün
              </p>
            )}
            {activePlan.valid_to && (
              <p className="text-xs text-gray-500">
                Bitiş: {fmtDate(activePlan.valid_to)}
              </p>
            )}
            <Link
              href={`/yonetim/planlar/${activePlan.id}`}
              className="mt-2 inline-block text-xs text-emerald-600 hover:underline"
            >
              Planı düzenle →
            </Link>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Aktif plan yok.</p>
        )}
      </div>

      {/* Plan ata */}
      <ClientAssignPlan
        clientId={profile.id}
        plans={assignablePlans}
        activePlanId={activePlan?.id ?? null}
      />

      {/* Premium yönetimi */}
      <div className="space-y-3">
        <h2 className="font-semibold">Premium</h2>
        {premium ? (
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Aktif
            {profile.premium_until
              ? ` · ${fmtDate(profile.premium_until)}'e kadar`
              : ""}
            . Aşağıdan süresini uzat:
          </p>
        ) : (
          <p className="text-sm text-gray-500">
            Premium aktif değil. Aşağıdan ver:
          </p>
        )}
        <ClientGrantPremium clientId={profile.id} />
      </div>

      {/* Kilo geçmişi */}
      {(recentProgress ?? []).length > 0 && (
        <div className="space-y-3">
          <h2 className="flex items-center gap-2 font-semibold">
            <LineChart className="h-4 w-4 text-emerald-600" /> Kilo Geçmişi
          </h2>
          <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
            {(recentProgress ?? []).map((p) => (
              <li
                key={p.entry_date}
                className="flex items-center justify-between px-4 py-2.5 text-sm"
              >
                <span className="text-gray-600 dark:text-gray-300">
                  {fmtDate(p.entry_date + "T00:00:00")}
                </span>
                <span className="font-medium">
                  {p.weight_kg != null ? `${p.weight_kg} kg` : "—"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* İlerleme fotoğrafları */}
      {(photoEntries ?? []).length > 0 && (
        <div className="space-y-3">
          <h2 className="flex items-center gap-2 font-semibold">
            <ImageIcon className="h-4 w-4 text-emerald-600" /> İlerleme
            Fotoğrafları
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {(photoEntries ?? []).map((e) => {
              const url = e.photo_path
                ? photoUrlMap.get(e.photo_path)
                : undefined;
              if (!url) return null;
              return (
                <div key={e.id} className="group relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`İlerleme fotoğrafı — ${fmtDate(e.entry_date + "T00:00:00")}`}
                    className="aspect-square w-full rounded-xl object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 rounded-b-xl bg-gradient-to-t from-black/60 px-2 py-1.5">
                    <p className="text-[10px] font-medium text-white/90">
                      {fmtDate(e.entry_date + "T00:00:00")}
                    </p>
                    {e.weight_kg != null && (
                      <p className="text-[10px] text-white/70">
                        {e.weight_kg} kg
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Danışanı kopar */}
      <div className="border-t border-gray-200 pt-5 dark:border-gray-800">
        <form action={unlinkClient}>
          <input type="hidden" name="client_id" value={profile.id} />
          <button
            type="submit"
            className="text-sm text-red-500 hover:underline"
          >
            Danışanı listeden çıkar
          </button>
        </form>
        <p className="mt-1 text-xs text-gray-400">
          Hesabı silinmez; sadece bağlantı kopar.
        </p>
      </div>
    </div>
  );
}
