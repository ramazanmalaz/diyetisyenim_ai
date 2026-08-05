import {
  Crown,
  Droplets,
  ImageIcon,
  LineChart,
  MessageCircle,
  UtensilsCrossed,
  Users,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  openClientChat,
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

const DAY_LABELS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const DAY_MS = 86_400_000;

/** UTC gün anahtarı (YYYY-MM-DD) — uygulama genelinde aynı biçim kullanılıyor. */
function dayKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export default async function DanisanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const dietitian = await requireStaff();
  const { id } = await params;
  const admin = createAdminClient();

  // Son 7 gün (bugün dahil) — uyum özeti bu pencerede hesaplanır.
  const todayMs = Date.parse(
    new Date().toISOString().slice(0, 10) + "T00:00:00Z",
  );
  const weekDays = Array.from({ length: 7 }, (_, i) =>
    dayKey(todayMs - (6 - i) * DAY_MS),
  );
  const weekStartKey = weekDays[0];

  const [
    { data: profile },
    { data: activePlan },
    { data: allPlans },
    { data: recentProgress },
    { data: photoEntries },
    { data: mealLogs },
    { data: waterRows },
  ] = await Promise.all([
    admin
      .from("profiles")
      .select(
        "id, full_name, premium_until, dietitian_id, created_at, water_goal_ml",
      )
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
    // Atanabilecekler: kendi şablonlarım + kendi oluşturduğum arşivsiz planlar.
    admin
      .from("diet_plans")
      .select("id, title, status, is_template, daily_calorie_target")
      .eq("created_by", dietitian.id)
      .neq("status", "archived")
      .order("is_template", { ascending: false })
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
    admin
      .from("meal_logs")
      .select("meal_id, log_date, status")
      .eq("client_id", id)
      .gte("log_date", weekStartKey),
    admin
      .from("water_intake")
      .select("day, total_ml")
      .eq("client_id", id)
      .gte("day", weekStartKey),
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

  if (!profile) notFound();
  if (dietitian.role !== "admin" && profile.dietitian_id !== dietitian.id)
    notFound();

  // Danışanın üyesi olduğu gruplar
  const { data: groupRows } = await admin
    .from("client_group_members")
    .select("client_groups (id, name)")
    .eq("client_id", id);

  const memberGroups = (groupRows ?? [])
    .map((r) => r.client_groups as unknown as { id: string; name: string } | null)
    .filter((g): g is { id: string; name: string } => g != null);

  const premium = isPremiumActive(profile.premium_until);

  // --- Son 7 gün: diyete uyum + su özeti ---
  // Plan öğünleri (hafta/gün) beklenen öğün sayısını verir; meal_logs gerçekleşeni.
  const { data: planMeals } = activePlan
    ? await admin
        .from("meals")
        .select("id, week_index, day_of_week, calories")
        .eq("plan_id", activePlan.id)
    : { data: null };

  const weekCount = Math.max(
    1,
    (planMeals ?? []).reduce((mx, m) => Math.max(mx, (m.week_index ?? 0) + 1), 1),
  );

  // (hafta, gün) → o gün planlanan öğün sayısı ve toplam kalori
  const plannedByDay = new Map<string, { count: number; kcal: number }>();
  for (const m of planMeals ?? []) {
    const k = `${m.week_index ?? 0}-${m.day_of_week}`;
    const cur = plannedByDay.get(k) ?? { count: 0, kcal: 0 };
    cur.count += 1;
    cur.kcal += m.calories ?? 0;
    plannedByDay.set(k, cur);
  }

  const mealKcal = new Map<string, number>(
    (planMeals ?? []).map((m) => [m.id, m.calories ?? 0]),
  );

  const eatenByDay = new Map<string, { count: number; kcal: number }>();
  for (const l of mealLogs ?? []) {
    if (l.status !== "eaten") continue;
    const cur = eatenByDay.get(l.log_date) ?? { count: 0, kcal: 0 };
    cur.count += 1;
    cur.kcal += mealKcal.get(l.meal_id) ?? 0;
    eatenByDay.set(l.log_date, cur);
  }

  const waterByDay = new Map<string, number>(
    (waterRows ?? []).map((w) => [w.day, w.total_ml ?? 0]),
  );
  const waterGoal = profile.water_goal_ml ?? 2500;

  // Plan başlangıcından önceki / bitişinden sonraki günlerde beklenen öğün yok.
  const planStartKey = activePlan?.valid_from
    ? dayKey(Date.parse(activePlan.valid_from))
    : null;
  const planEndKey = activePlan?.valid_to
    ? dayKey(Date.parse(activePlan.valid_to))
    : null;

  const weekStats = weekDays.map((d) => {
    const inPlan =
      !!activePlan &&
      (!planStartKey || d >= planStartKey) &&
      (!planEndKey || d <= planEndKey);
    let planned = { count: 0, kcal: 0 };
    if (inPlan) {
      const startMs = planStartKey
        ? Date.parse(planStartKey + "T00:00:00Z")
        : Date.parse(d + "T00:00:00Z");
      const weeksIn = Math.max(
        0,
        Math.floor((Date.parse(d + "T00:00:00Z") - startMs) / (7 * DAY_MS)),
      );
      const dow = (new Date(d + "T00:00:00Z").getUTCDay() + 6) % 7;
      planned =
        plannedByDay.get(`${weeksIn % weekCount}-${dow}`) ?? { count: 0, kcal: 0 };
    }
    const eaten = eatenByDay.get(d) ?? { count: 0, kcal: 0 };
    const water = waterByDay.get(d) ?? 0;
    return {
      date: d,
      label: DAY_LABELS[(new Date(d + "T00:00:00Z").getUTCDay() + 6) % 7],
      planned: planned.count,
      eaten: eaten.count,
      eatenKcal: eaten.kcal,
      water,
    };
  });

  const totalPlanned = weekStats.reduce((s, d) => s + d.planned, 0);
  const totalEaten = weekStats.reduce(
    (s, d) => s + (d.planned > 0 ? Math.min(d.eaten, d.planned) : 0),
    0,
  );
  const adherencePct =
    totalPlanned > 0 ? Math.round((totalEaten / totalPlanned) * 100) : null;
  const loggedDays = weekStats.filter((d) => d.eaten > 0).length;
  const avgKcal =
    loggedDays > 0
      ? Math.round(
          weekStats.reduce((s, d) => s + d.eatenKcal, 0) / loggedDays,
        )
      : null;
  const waterDays = weekStats.filter((d) => d.water > 0).length;
  const avgWaterMl =
    waterDays > 0
      ? Math.round(weekStats.reduce((s, d) => s + d.water, 0) / 7)
      : 0;
  const waterGoalDays = weekStats.filter((d) => d.water >= waterGoal).length;
  const hasWeekData = totalPlanned > 0 || loggedDays > 0 || waterDays > 0;

  const weights = (recentProgress ?? [])
    .filter((p) => p.weight_kg != null)
    .map((p) => Number(p.weight_kg));
  const latestWeight = weights[0] ?? null;
  const prevWeight = weights[1] ?? null;
  const weightDelta =
    latestWeight != null && prevWeight != null
      ? +(latestWeight - prevWeight).toFixed(1)
      : null;

  // Atama şablonu KOPYALAR — bu yüzden danışanın kendi planları listede olmaz.
  const assignablePlans = (allPlans ?? []).filter(
    (p) => p.id !== activePlan?.id,
  );

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
        <Link
          href="/yonetim/gruplar"
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium shadow-[var(--shadow-soft)] transition hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800"
        >
          <Users className="h-4 w-4 text-emerald-600" /> Gruplar
        </Link>
      </div>

      {/* Üye olduğu gruplar */}
      {memberGroups.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {memberGroups.map((g) => (
            <Link
              key={g.id}
              href={`/yonetim/gruplar/${g.id}`}
              className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300"
            >
              {g.name}
            </Link>
          ))}
        </div>
      )}

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

      {/* Son 7 gün: diyete uyum + su */}
      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="flex items-center gap-2 font-semibold">
            <UtensilsCrossed className="h-4 w-4 text-emerald-600" /> Uyum Özeti
          </h2>
          <span className="text-[11px] font-medium tracking-[0.14em] text-gray-400 uppercase">
            Son 7 gün
          </span>
        </div>

        {hasWeekData ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-[var(--shadow-soft)] dark:border-gray-800 dark:bg-gray-900">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p
                  className={`text-xl font-bold tabular-nums ${
                    adherencePct == null
                      ? ""
                      : adherencePct >= 80
                        ? "text-emerald-600"
                        : adherencePct >= 50
                          ? "text-amber-500"
                          : "text-rose-500"
                  }`}
                >
                  {adherencePct != null ? `%${adherencePct}` : "—"}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  Diyete uyum
                  {totalPlanned > 0 && (
                    <span className="block text-[11px] text-gray-400">
                      {totalEaten}/{totalPlanned} öğün
                    </span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-xl font-bold tabular-nums">
                  {avgKcal != null ? avgKcal : "—"}
                  {avgKcal != null && (
                    <span className="text-sm font-normal text-gray-500">
                      {" "}
                      kcal
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  Günlük ortalama
                  {activePlan?.daily_calorie_target != null && (
                    <span className="block text-[11px] text-gray-400">
                      hedef {activePlan.daily_calorie_target} kcal
                    </span>
                  )}
                </p>
              </div>
              <div>
                <p className="flex items-baseline gap-1 text-xl font-bold tabular-nums text-sky-600">
                  <Droplets className="h-4 w-4 shrink-0 self-center" />
                  {avgWaterMl > 0
                    ? (avgWaterMl / 1000).toFixed(1).replace(".", ",")
                    : "—"}
                  {avgWaterMl > 0 && (
                    <span className="text-sm font-normal text-gray-500">L</span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  Günlük su
                  <span className="block text-[11px] text-gray-400">
                    {waterGoalDays}/7 gün hedefte
                  </span>
                </p>
              </div>
            </div>

            {/* Gün gün: üst çubuk öğün uyumu, alt çubuk su */}
            <div className="mt-4 grid grid-cols-7 gap-1.5">
              {weekStats.map((d) => {
                const mealPct =
                  d.planned > 0
                    ? Math.min(100, Math.round((d.eaten / d.planned) * 100))
                    : 0;
                const waterPct = Math.min(
                  100,
                  Math.round((d.water / waterGoal) * 100),
                );
                return (
                  <div
                    key={d.date}
                    className="flex flex-col items-center gap-1"
                    title={`${fmtDate(d.date + "T00:00:00")} — ${
                      d.planned > 0
                        ? `${d.eaten}/${d.planned} öğün`
                        : "plan yok"
                    } · ${d.water} ml su`}
                  >
                    <div className="flex h-12 items-end justify-center gap-1">
                      <div className="flex h-full w-2 items-end rounded-full bg-gray-100 dark:bg-gray-800">
                        <div
                          className={`w-full rounded-full ${
                            mealPct >= 80
                              ? "bg-emerald-500"
                              : mealPct > 0
                                ? "bg-amber-400"
                                : "bg-transparent"
                          }`}
                          style={{ height: `${mealPct}%` }}
                        />
                      </div>
                      <div className="flex h-full w-2 items-end rounded-full bg-gray-100 dark:bg-gray-800">
                        <div
                          className="w-full rounded-full bg-sky-400"
                          style={{ height: `${waterPct}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-[10px] text-gray-500">{d.label}</span>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 flex items-center justify-center gap-4 text-[11px] text-gray-400">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Öğün
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-sky-400" /> Su (hedef{" "}
                {(waterGoal / 1000).toFixed(1).replace(".", ",")} L)
              </span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            Son 7 günde öğün veya su kaydı yok.
          </p>
        )}
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
      <ClientAssignPlan clientId={profile.id} plans={assignablePlans} />

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
