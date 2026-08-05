import { AlertTriangle, MessageCircle, UserMinus, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  deleteGroup,
  openGroupChat,
  removeGroupMember,
} from "@/app/(admin)/yonetim/gruplar/actions";
import { AddGroupMemberForm } from "@/components/admin/add-group-member-form";
import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

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
    .select("id, name, note, dietitian_id, conversation_id")
    .eq("id", id)
    .single();

  if (!group) notFound();
  if (staff.role !== "admin" && group.dietitian_id !== staff.id) notFound();

  const [{ data: memberRows }, { data: myClients }] = await Promise.all([
    admin.from("client_group_members").select("client_id").eq("group_id", id),
    admin
      .from("profiles")
      .select("id, full_name")
      .eq("dietitian_id", group.dietitian_id)
      .order("full_name"),
  ]);

  const memberIds = new Set((memberRows ?? []).map((m) => m.client_id));
  const clients = myClients ?? [];
  const members = clients.filter((c) => memberIds.has(c.id));
  const candidates = clients.filter((c) => !memberIds.has(c.id));

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
