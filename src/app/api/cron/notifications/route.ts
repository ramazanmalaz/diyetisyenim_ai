import { NextResponse, type NextRequest } from "next/server";

import { sendPushToUser } from "@/lib/push";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Her dakika çağrılır (cron-job.org). Türkiye saatine (UTC+3) göre kullanıcının
// kişisel ayarına uygun su, öğün ve pomodoro bildirimleri gönderir.

export async function GET(request: NextRequest) {
  // Fail-closed: secret tanımsızsa endpoint herkese açık kalmasın.
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const ist = new Date(Date.now() + 3 * 3600 * 1000); // UTC+3
  const hour = ist.getUTCHours();
  const minute = ist.getUTCMinutes();
  const minuteOfDay = hour * 60 + minute;
  const dateStr = ist.toISOString().slice(0, 10);
  const hhmm = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

  const admin = createAdminClient();
  let sent = 0;

  // --- Su hatırlatıcısı (kullanıcının saat aralığı + sıklığı + miktarı) ---
  if (minute === 0) {
    const { data: profs } = await admin
      .from("profiles")
      .select(
        "id, water_start_hour, water_end_hour, water_interval_hours, water_amount_ml",
      )
      .eq("water_reminder_enabled", true);
    for (const p of profs ?? []) {
      const start = p.water_start_hour ?? 10;
      const end = p.water_end_hour ?? 20;
      const interval = Math.max(1, p.water_interval_hours ?? 2);
      if (hour < start || hour > end) continue;
      if ((hour - start) % interval !== 0) continue;
      const ml = p.water_amount_ml ?? 200;
      sent += await sendPushToUser(p.id, {
        title: "💧 Su molası — UzmanDiyet",
        body: `Bir bardak (${ml} ml) su içme zamanı. Hadi bir yudum! 🥤`,
        tag: "water",
        url: "/plan",
      });
    }
  }

  // --- Öğün hatırlatmaları (kullanıcının seçtiği saatte) ---
  {
    const { data: mealProfs } = await admin
      .from("profiles")
      .select("id, breakfast_time, lunch_time, dinner_time")
      .eq("meal_reminders_enabled", true);
    for (const p of mealProfs ?? []) {
      let title: string | null = null;
      let body = "";
      if (p.breakfast_time === hhmm) {
        title = "🍳 Kahvaltı vakti — UzmanDiyet";
        body = "Güne sağlıklı bir kahvaltıyla başla. Planına göz at!";
      } else if (p.lunch_time === hhmm) {
        title = "🥗 Öğle yemeği vakti — UzmanDiyet";
        body = "Öğle öğününün zamanı geldi. Afiyet olsun!";
      } else if (p.dinner_time === hhmm) {
        title = "🍲 Akşam yemeği vakti — UzmanDiyet";
        body = "Akşam öğününün vakti. Bugünü güzel kapat!";
      }
      if (title) {
        sent += await sendPushToUser(p.id, {
          title,
          body,
          tag: "meal",
          url: "/plan",
        });
      }
    }
  }

  // --- Premium yenileme hatırlatması (günde bir, 11:00) ---
  // Süre 3 gün kala, 1 gün kala ve dolduğunda birer kez bildirir. Her eşik
  // farklı günde tetiklendiği için ekstra "gönderildi" takibi gerekmez.
  if (hhmm === "11:00") {
    const DAY = 86_400_000;
    const now = Date.now();
    const { data: premProfs } = await admin
      .from("profiles")
      .select("id, premium_until")
      .not("premium_until", "is", null);
    for (const p of premProfs ?? []) {
      if (!p.premium_until) continue;
      const msLeft = new Date(p.premium_until).getTime() - now;
      const daysLeft = Math.ceil(msLeft / DAY);
      let title: string | null = null;
      let body = "";
      if (daysLeft === 3) {
        title = "👑 Premium'un 3 gün sonra doluyor";
        body = "Kesintisiz devam için şimdi yenile, ayrıcalıkların sürsün.";
      } else if (daysLeft === 1) {
        title = "👑 Premium'un yarın doluyor";
        body = "Yenileyerek sınırsız erişimini kaybetme.";
      } else if (msLeft <= 0 && msLeft > -DAY) {
        title = "⏳ Premium'un sona erdi";
        body = "Tek dokunuşla yenile, kaldığın yerden devam et.";
      }
      if (title) {
        sent += await sendPushToUser(p.id, {
          title,
          body,
          tag: "premium",
          url: "/abonelik",
        });
      }
    }
  }

  // --- Pomodoro faz geçişleri (canlı timer'ın DB'ye yazdığı sınırlardan) ---
  // Timer çalışırken yaklaşan geçiş anlarını pomodoro_runs.phases'e yazar; burada
  // yalnızca o dakikaya denk gelen geçiş için "sıradaki faz" push'u gönderilir.
  const { data: runs } = await admin
    .from("pomodoro_runs")
    .select("client_id, phases")
    .eq("run_date", dateStr);

  if (runs && runs.length) {
    // pomodoro_reminders_enabled === false olanları atla (null/true = açık).
    const ids = [...new Set(runs.map((r) => r.client_id))];
    const off = new Set<string>();
    const { data: pp } = await admin
      .from("profiles")
      .select("id, pomodoro_reminders_enabled")
      .in("id", ids);
    for (const x of pp ?? []) {
      if (x.pomodoro_reminders_enabled === false) off.add(x.id);
    }

    const bodyFor = (mode: string): string => {
      switch (mode) {
        case "focus":
          return "🎯 Mola bitti — odak zamanı! Telefonu bırak.";
        case "short":
          return "☕ Kısa mola — nefes al, biraz dinlen.";
        case "long":
          return "🌿 Uzun mola — hak ettin, iyi dinlen!";
        case "lunch":
          return "🍽️ Öğle arası — afiyet olsun!";
        default:
          return "Sıradaki faz başladı.";
      }
    };

    for (const run of runs) {
      if (off.has(run.client_id)) continue;
      const phases = Array.isArray(run.phases)
        ? (run.phases as { at?: number; mode?: string }[])
        : [];
      for (const ph of phases) {
        if (ph?.at === minuteOfDay && typeof ph.mode === "string") {
          sent += await sendPushToUser(run.client_id, {
            title: "⏱️ Odak — UzmanDiyet",
            body: bodyFor(ph.mode),
            tag: "pomodoro",
            url: "/pomodoro",
          });
        }
      }
    }
  }

  return NextResponse.json({ ok: true, sent, minuteOfDay, dateStr });
}
