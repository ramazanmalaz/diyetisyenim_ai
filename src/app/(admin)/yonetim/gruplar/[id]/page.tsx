import {
  AlertTriangle,
  Bot,
  Camera,
  Droplets,
  MessageCircle,
  ShieldAlert,
  UserMinus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  deleteGroup,
  openGroupChat,
  removeGroupMember,
} from "@/app/(admin)/yonetim/gruplar/actions";
import {
  deleteProgram,
  resolveAlert,
} from "@/app/(admin)/yonetim/gruplar/assistant-actions";
import { AddGroupMemberForm } from "@/components/admin/add-group-member-form";
import { GroupAssistantSettings } from "@/components/admin/group-assistant-settings";
import {
  GroupProgramEditor,
  GroupProgramUpload,
} from "@/components/admin/group-program-forms";
import { requireStaff } from "@/lib/auth";
import { istanbulNow } from "@/lib/group-assistant/schedule";
import { createAdminClient } from "@/lib/supabase/admin";
import { cn } from "@/lib/utils";

const FLAG_LABEL: Record<string, string> = {
  regl: "Regl",
  kabizlik: "Kabızlık",
  kacamak: "Kaçamak",
  misafirlik: "Misafirlik",
  hastalik: "Hasta",
  disarida: "Dışarıda",
};

export default async function GrupDetayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const staff = await requireStaff();
  const { id } = await params;
  const admin = createAdminClient();

  const { data: group } = await admin
    .from("client_groups")
    .select(
      "id, name, note, dietitian_id, conversation_id, assistant_enabled, weigh_in_dow, program_started_on",
    )
    .eq("id", id)
    .single();

  if (!group) notFound();
  if (staff.role !== "admin" && group.dietitian_id !== staff.id) notFound();

  const today = istanbulNow().date;
  // Admin herhangi bir danışanı ekleyebilir; diyetisyen yalnızca kendine bağlı olanları.
  const clientQuery = admin
    .from("profiles")
    .select("id, full_name")
    .eq("role", "client")
    .order("full_name");
  const [
    { data: memberRows },
    { data: myClients },
    { data: programs },
    { data: days },
    { data: alerts },
  ] = await Promise.all([
    admin.from("client_group_members").select("client_id").eq("group_id", id),
    staff.role === "admin"
      ? clientQuery
      : clientQuery.eq("dietitian_id", group.dietitian_id),
    admin
      .from("group_programs")
      .select("id, title, content, status, published_at, created_at")
      .eq("group_id", id)
      .in("status", ["draft", "active"])
      .order("created_at", { ascending: false }),
    admin
      .from("group_member_days")
      .select("client_id, water_ml, meals_shared, flags")
      .eq("group_id", id)
      .eq("day", today),
    admin
      .from("group_alerts")
      .select("id, client_id, severity, reason, created_at")
      .eq("group_id", id)
      .is("resolved_at", null)
      .order("created_at", { ascending: false }),
  ]);

  const memberIds = new Set((memberRows ?? []).map((m) => m.client_id));
  const clients = myClients ?? [];
  const members = clients.filter((c) => memberIds.has(c.id));
  const candidates = clients.filter((c) => !memberIds.has(c.id));

  // Kilo: programın başından bugüne (kişisel takip + grupta yazılan tartılar).
  const { data: weights } = members.length
    ? await admin
        .from("progress_entries")
        .select("client_id, entry_date, weight_kg")
        .in(
          "client_id",
          members.map((m) => m.id),
        )
        .not("weight_kg", "is", null)
        .gte("entry_date", group.program_started_on ?? "1900-01-01")
        .order("entry_date", { ascending: true })
    : { data: [] };

  const dayByClient = new Map((days ?? []).map((d) => [d.client_id, d]));
  const deltaByClient = new Map<string, number>();
  for (const m of members) {
    const mine = (weights ?? []).filter((w) => w.client_id === m.id);
    if (mine.length >= 2) {
      const first = Number(mine[0].weight_kg);
      const last = Number(mine[mine.length - 1].weight_kg);
      deltaByClient.set(m.id, Math.round((last - first) * 10) / 10);
    }
  }
  const nameById = new Map(clients.map((c) => [c.id, c.full_name ?? "Danışan"]));
  const silentCount = members.filter((m) => !dayByClient.has(m.id)).length;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8">
      <div>
        <Link
          href="/yonetim/gruplar"
          className="text-sm text-emerald-600 hover:underline"
        >
          ← Gruplar
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
          <Users className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">{group.name}</h1>
          <p className="text-sm text-gray-500">
            {members.length} danışan
            {group.note ? ` · ${group.note}` : ""}
          </p>
        </div>
      </div>

      {/* Boş grup uyarısı — mesaj kimseye ulaşmaz. */}
      {members.length === 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Bu grupta hiç danışan yok. Şimdi mesaj atarsan{" "}
            <strong>kimse görmez</strong> — önce aşağıdan danışan ekle.
          </p>
        </div>
      )}

      {/* Gruba yaz */}
      <form action={openGroupChat}>
        <input type="hidden" name="group_id" value={group.id} />
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgba(5,150,105,0.8)] transition hover:bg-emerald-700"
        >
          <MessageCircle className="h-4 w-4" /> Grup sohbetini aç
        </button>
      </form>

      {/* AI Diyet Asistanı */}
      <section className="space-y-5 rounded-3xl border border-emerald-200/70 bg-gradient-to-b from-emerald-50/70 to-white p-5 dark:border-emerald-900/50 dark:from-emerald-950/30 dark:to-gray-950">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-emerald-600 text-white">
            <Bot className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="font-semibold">Diyet Asistanı</h2>
            <p className="text-sm text-gray-500">
              {group.assistant_enabled
                ? "Grubu yönetiyor: sorular, tabaklar, yoklamalar, tartı günü."
                : "Kapalı. Açtığında grubu her gün senin yerine takip eder."}
            </p>
          </div>
        </div>

        <GroupAssistantSettings
          groupId={group.id}
          enabled={group.assistant_enabled}
          weighInDow={group.weigh_in_dow}
          programStartedOn={group.program_started_on}
        />

        {/* Uyarılar — asistanın personele yönlendirdiği riskli mesajlar */}
        {(alerts ?? []).length > 0 && (
          <div className="space-y-2">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-red-700 dark:text-red-400">
              <ShieldAlert className="h-4 w-4" /> Açık uyarılar
            </h3>
            <ul className="space-y-2">
              {(alerts ?? []).map((a) => (
                <li
                  key={a.id}
                  className={cn(
                    "flex items-start gap-3 rounded-2xl border p-3 text-sm",
                    a.severity === "high"
                      ? "border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/30"
                      : "border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/20",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {(a.client_id && nameById.get(a.client_id)) ?? "Danışan"}
                      <span className="ml-2 text-xs font-normal text-gray-500">
                        {new Date(a.created_at).toLocaleString("tr-TR", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "Europe/Istanbul",
                        })}
                      </span>
                    </p>
                    <p className="text-gray-700 dark:text-gray-300">{a.reason}</p>
                  </div>
                  <form action={resolveAlert}>
                    <input type="hidden" name="group_id" value={group.id} />
                    <input type="hidden" name="alert_id" value={a.id} />
                    <button
                      type="submit"
                      className="rounded-lg px-2 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-emerald-600 active:scale-95 dark:text-gray-300 dark:hover:bg-gray-900"
                    >
                      İlgilendim
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Bugünün yoklaması */}
        {members.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">
              Bugün{" "}
              <span className="font-normal text-gray-500">
                · {members.length - silentCount}/{members.length} kişi haber verdi
              </span>
            </h3>
            <ul className="divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-950">
              {members.map((m) => {
                const day = dayByClient.get(m.id);
                const liters = day?.water_ml ? day.water_ml / 1000 : 0;
                const delta = deltaByClient.get(m.id);
                return (
                  <li
                    key={m.id}
                    className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-4 gap-y-1 px-4 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_7.5rem_3rem_4.5rem]"
                  >
                    <span
                      className={cn(
                        "col-span-3 min-w-0 truncate font-medium sm:col-span-1",
                        !day && "text-gray-400",
                      )}
                    >
                      {m.full_name ?? "İsimsiz"}
                      {day?.flags.map((f) => (
                        <span
                          key={f}
                          className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-px text-[10px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                        >
                          {FLAG_LABEL[f] ?? f}
                        </span>
                      ))}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-gray-500" title="Bugün içilen su">
                      <Droplets className="h-3.5 w-3.5 shrink-0 text-sky-500" />
                      <span className="h-1.5 w-12 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                        <span
                          className="block h-full rounded-full bg-sky-500"
                          style={{ width: `${Math.min(100, (liters / 2.5) * 100)}%` }}
                        />
                      </span>
                      {liters ? `${liters.toLocaleString("tr-TR")} L` : "–"}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-500" title="Bugün paylaşılan öğün">
                      <Camera className="h-3.5 w-3.5 shrink-0" />
                      {day?.meals_shared ?? 0}
                    </span>
                    <span
                      className={cn(
                        "text-right text-xs font-semibold tabular-nums",
                        delta == null
                          ? "text-gray-400"
                          : delta <= 0
                            ? "text-emerald-700 dark:text-emerald-400"
                            : "text-amber-700 dark:text-amber-400",
                      )}
                      title="Program başından değişim"
                    >
                      {delta == null ? "–" : `${delta > 0 ? "+" : ""}${delta} kg`}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Haftalık liste */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Haftalık liste</h3>
          {(programs ?? []).map((p) => (
            <details
              key={p.id}
              open={p.status === "draft"}
              className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950"
            >
              <summary className="flex cursor-pointer list-none items-center gap-2 text-sm">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                    p.status === "active"
                      ? "bg-emerald-600 text-white"
                      : "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
                  )}
                >
                  {p.status === "active" ? "Yayında" : "Taslak"}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium">{p.title}</span>
              </summary>
              <div className="mt-3 space-y-2">
                <GroupProgramEditor
                  groupId={group.id}
                  programId={p.id}
                  title={p.title}
                  content={p.content}
                  isActive={p.status === "active"}
                />
                {p.status === "draft" && (
                  <form action={deleteProgram}>
                    <input type="hidden" name="group_id" value={group.id} />
                    <input type="hidden" name="program_id" value={p.id} />
                    <button type="submit" className="text-xs text-red-500 hover:underline">
                      Taslağı sil
                    </button>
                  </form>
                )}
              </div>
            </details>
          ))}
          <GroupProgramUpload groupId={group.id} />
        </div>
      </section>

      {/* Üye ekle */}
      <div className="space-y-3">
        <h2 className="font-semibold">Danışan ekle</h2>
        <AddGroupMemberForm groupId={group.id} clients={candidates} />
      </div>

      {/* Üyeler */}
      <div className="space-y-3">
        <h2 className="font-semibold">Grup üyeleri</h2>
        {members.length > 0 ? (
          <ul className="divide-y divide-gray-100 rounded-2xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
            {members.map((m) => (
              <li
                key={m.id}
                className="flex items-center gap-3 px-4 py-3 text-sm"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-sm font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                  {(m.full_name ?? "?").charAt(0).toUpperCase()}
                </span>
                <Link
                  href={`/yonetim/danisanlar/${m.id}`}
                  className="min-w-0 flex-1 truncate font-medium hover:underline"
                >
                  {m.full_name ?? "İsimsiz"}
                </Link>
                <form action={removeGroupMember}>
                  <input type="hidden" name="group_id" value={group.id} />
                  <input type="hidden" name="client_id" value={m.id} />
                  <button
                    type="submit"
                    aria-label={`${m.full_name ?? "Danışan"} gruptan çıkar`}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-gray-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                  >
                    <UserMinus className="h-4 w-4" />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">
            Grupta henüz danışan yok. Yukarıdan ekle.
          </p>
        )}
      </div>

      {/* Grubu sil */}
      <div className="border-t border-gray-200 pt-5 dark:border-gray-800">
        <form action={deleteGroup}>
          <input type="hidden" name="group_id" value={group.id} />
          <button type="submit" className="text-sm text-red-500 hover:underline">
            Grubu sil
          </button>
        </form>
        <p className="mt-1 text-xs text-gray-400">
          Danışan hesapları silinmez; yalnızca grup ve grup sohbeti silinir.
        </p>
      </div>
    </div>
  );
}
