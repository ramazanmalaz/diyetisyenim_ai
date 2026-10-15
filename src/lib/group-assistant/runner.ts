import { createAdminClient } from "@/lib/supabase/admin";

import {
  firstName,
  getActiveProgram,
  notifyStaff,
  postAssistantMessage,
  pushAssistantMessage,
  type AssistantGroup,
} from "./respond";
import {
  computeWeighResults,
  DINNER_FROM,
  dueKinds,
  followupMessage,
  isFollowup,
  istanbulNow,
  missingFor,
  templateFor,
  weighResultsMessage,
  type FollowupKind,
  type IstanbulNow,
  type ScheduledKind,
  type WeighMember,
} from "./schedule";

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * Dakikalık cron'dan çağrılır. Asistanı açık her grup için o dakikaya düşen
 * zamanlanmış mesajları atar. Her (grup, tür, gün) için tek sefer — çift cron
 * tetiklenmesi ya da yeniden deneme aynı mesajı iki kez göndermez.
 */
export async function runGroupSchedules(
  at: Date = new Date(),
): Promise<number> {
  const now = istanbulNow(at);
  const admin = createAdminClient();

  const { data: groups } = await admin
    .from("client_groups")
    .select(
      "id, name, dietitian_id, conversation_id, weigh_in_dow, program_started_on",
    )
    .eq("assistant_enabled", true)
    .not("conversation_id", "is", null);

  let posted = 0;
  for (const g of groups ?? []) {
    if (!g.conversation_id) continue;
    const group: AssistantGroup = { ...g, conversation_id: g.conversation_id };
    for (const kind of dueKinds(now, group.weigh_in_dow)) {
      try {
        if (await runOnce(admin, group, kind, now)) posted++;
      } catch (err) {
        console.error(
          `[group-assistant] ${kind} atılamadı`,
          err instanceof Error ? err.message : err,
        );
      }
    }
  }
  return posted;
}

async function runOnce(
  admin: AdminClient,
  group: AssistantGroup,
  kind: ScheduledKind,
  now: IstanbulNow,
): Promise<boolean> {
  // Önce kilidi al: birincil anahtar çakışırsa bu tür bugün zaten atıldı.
  const { error: lockError } = await admin
    .from("group_assistant_runs")
    .insert({ group_id: group.id, kind, run_date: now.date });
  if (lockError) return false;

  const composed = await composeMessage(admin, group, kind, now);
  if (!composed) return false;
  const id = await postAssistantMessage(
    admin,
    group.conversation_id,
    composed.text,
  );
  if (!id) return false;
  // Takipte yalnızca adı geçenler, genel çağrılarda bütün danışanlar.
  await pushAssistantMessage(admin, group, composed.text, composed.recipients);
  return true;
}

type Composed = { text: string; recipients: string[] };

async function clientMembers(admin: AdminClient, groupId: string) {
  const { data } = await admin
    .from("client_group_members")
    .select("client_id, profiles (full_name)")
    .eq("group_id", groupId);
  return (data ?? []).map((m) => ({
    id: m.client_id,
    name: firstName(
      (m.profiles as unknown as { full_name: string | null } | null)?.full_name,
    ),
  }));
}

async function weighResults(
  admin: AdminClient,
  group: AssistantGroup,
  members: WeighMember[],
  now: IstanbulNow,
) {
  const { data: entries } = await admin
    .from("progress_entries")
    .select("client_id, entry_date, weight_kg")
    .in(
      "client_id",
      members.map((m) => m.id),
    )
    .not("weight_kg", "is", null)
    .gte("entry_date", group.program_started_on ?? "1900-01-01")
    .lte("entry_date", now.date);

  return computeWeighResults(
    members,
    (entries ?? []).map((e) => ({
      client_id: e.client_id,
      date: e.entry_date,
      weight_kg: Number(e.weight_kg),
    })),
    now.date,
  );
}

/** Takip türüne göre bugün eksik kalan danışanlar. */
async function missingMembers(
  admin: AdminClient,
  group: AssistantGroup,
  kind: FollowupKind,
  now: IstanbulNow,
): Promise<WeighMember[]> {
  const members = await clientMembers(admin, group.id);
  if (members.length === 0) return [];
  if (kind === "weigh_followup") {
    return (await weighResults(admin, group, members, now)).missing;
  }
  const { data: days } = await admin
    .from("group_member_days")
    .select("client_id, water_ml, meals_shared, last_meal_at")
    .eq("group_id", group.id)
    .eq("day", now.date);
  return missingFor(
    kind,
    members,
    days ?? [],
    `${now.date}T${DINNER_FROM}:00+03:00`,
  );
}

async function composeMessage(
  admin: AdminClient,
  group: AssistantGroup,
  kind: ScheduledKind,
  now: IstanbulNow,
): Promise<Composed | null> {
  if (isFollowup(kind)) {
    const missing = await missingMembers(admin, group, kind, now);
    const text = followupMessage(
      kind,
      missing.map((m) => m.name),
      now.date,
    );
    return text ? { text, recipients: missing.map((m) => m.id) } : null;
  }

  const members = await clientMembers(admin, group.id);
  const everyone = members.map((m) => m.id);

  if (kind === "weigh_results") {
    if (members.length === 0) return null;
    const result = await weighResults(admin, group, members, now);

    // Personele haftalık özet + liste hatırlatması.
    const program = await getActiveProgram(admin, group.id);
    const { count: openAlerts } = await admin
      .from("group_alerts")
      .select("id", { count: "exact", head: true })
      .eq("group_id", group.id)
      .is("resolved_at", null);
    const avg =
      result.ranked.length > 0
        ? (
            result.ranked.reduce((s, r) => s + r.delta, 0) /
            result.ranked.length
          ).toFixed(1)
        : "–";
    const stale =
      !program?.published_at ||
      Date.now() - new Date(program.published_at).getTime() > 5 * 86_400_000;
    await notifyStaff(admin, group, {
      title: `📊 ${group.name} tartı sonuçları`,
      body: `Ortalama ${avg} kg · ${result.missing.length} kişi tartı paylaşmadı · ${openAlerts ?? 0} açık uyarı${stale ? " · Yeni haftanın listesini yüklemeyi unutma" : ""}`,
    });

    const text = weighResultsMessage(result);
    return text ? { text, recipients: everyone } : null;
  }

  return { text: templateFor(kind, now.date), recipients: everyone };
}
