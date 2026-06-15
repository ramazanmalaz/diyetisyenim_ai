import { NextResponse, type NextRequest } from "next/server";

import { buildSchedule } from "@/lib/pomodoro";
import { sendPushToUser } from "@/lib/push";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Vercel cron her dakika çağırır. Türkiye saatine (UTC+3) göre:
// - belirli saatlerde su hatırlatıcısı,
// - pomodoro seans sınırlarında bildirim gönderir.
const WATER_HOURS = [10, 12, 14, 16, 18, 20];

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    if (request.headers.get("authorization") !== `Bearer ${secret}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  const ist = new Date(Date.now() + 3 * 3600 * 1000); // UTC+3
  const hour = ist.getUTCHours();
  const minute = ist.getUTCMinutes();
  const minuteOfDay = hour * 60 + minute;
  const dateStr = ist.toISOString().slice(0, 10);

  const admin = createAdminClient();
  let sent = 0;

  // --- Su hatırlatıcısı (saat başı, belirli saatlerde) ---
  if (minute === 0 && WATER_HOURS.includes(hour)) {
    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("client_id");
    const ids = [...new Set((subs ?? []).map((s) => s.client_id))];
    if (ids.length) {
      const { data: profs } = await admin
        .from("profiles")
        .select("id")
        .in("id", ids)
        .eq("water_reminder_enabled", true);
      for (const p of profs ?? []) {
        sent += await sendPushToUser(p.id, {
          title: "Su molası 💧",
          body: "Bir bardak su içmeyi unutma!",
          tag: "water",
          url: "/plan",
        });
      }
    }
  }

  // --- Pomodoro seans sınırları ---
  const { data: plans } = await admin
    .from("pomodoro_plans")
    .select("client_id, start_min, end_min, work_min, break_min")
    .eq("plan_date", dateStr)
    .eq("muted", false);

  for (const plan of plans ?? []) {
    const schedule = buildSchedule({
      startMin: plan.start_min,
      endMin: plan.end_min,
      workMin: plan.work_min,
      breakMin: plan.break_min,
    });
    if (schedule.segments.length === 0) continue;

    if (minuteOfDay === plan.start_min) {
      sent += await sendPushToUser(plan.client_id, {
        title: "Pomodoro ⏱️",
        body: "Odak zamanı başladı — ilk seans!",
        tag: "pomodoro",
        url: "/pomodoro",
      });
      continue;
    }

    for (let i = 0; i < schedule.segments.length; i += 1) {
      const seg = schedule.segments[i];
      if (seg.endMin !== minuteOfDay) continue;
      const next = schedule.segments[i + 1];
      const body = next
        ? next.kind === "work"
          ? `${next.session}. seans başlasın, odaklan!`
          : `Mola zamanı — ${next.endMin - next.startMin} dk dinlen.`
        : "Tüm seanslar tamamlandı, harika iş! 🎉";
      sent += await sendPushToUser(plan.client_id, {
        title: "Pomodoro ⏱️",
        body,
        tag: "pomodoro",
        url: "/pomodoro",
      });
    }
  }

  return NextResponse.json({ ok: true, sent, minuteOfDay, dateStr });
}
