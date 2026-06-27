import { RemindersApp } from "@/components/reminders/reminders-app";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Hatırlatıcı — UzmanDiyet" };

export default async function HatirlaticiPage() {
  await requireProfile();
  const supabase = await createClient();

  const [{ data: lists }, { data: reminders }] = await Promise.all([
    supabase
      .from("reminder_lists")
      .select("id, name, color, icon, sort_order")
      .order("sort_order", { ascending: true }),
    supabase
      .from("reminders")
      .select(
        "id, list_id, title, notes, url, due_at, has_time, flagged, priority, completed, completed_at, sort_order, created_at",
      )
      .order("created_at", { ascending: true }),
  ]);

  const todayKey = new Date().toISOString().slice(0, 10);

  return (
    <RemindersApp
      initialLists={lists ?? []}
      initialReminders={reminders ?? []}
      todayKey={todayKey}
    />
  );
}
