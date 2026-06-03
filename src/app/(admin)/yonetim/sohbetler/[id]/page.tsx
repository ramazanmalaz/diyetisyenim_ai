import Link from "next/link";
import { notFound } from "next/navigation";

import { removeMember } from "@/app/(admin)/yonetim/sohbetler/actions";
import { AddMemberForm } from "@/components/admin/add-member-form";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaff();
  const { id } = await params;
  const supabase = await createClient();

  const { data: group } = await supabase
    .from("conversations")
    .select("id, title, type")
    .eq("id", id)
    .single();

  if (!group) notFound();

  const { data: memberRows } = await supabase
    .from("conversation_members")
    .select("user_id")
    .eq("conversation_id", id);
  const memberIds = (memberRows ?? []).map((m) => m.user_id);

  const { data: allClients } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "client")
    .order("full_name");

  const members = (allClients ?? []).filter((c) => memberIds.includes(c.id));
  const addable = (allClients ?? []).filter((c) => !memberIds.includes(c.id));

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/yonetim/sohbetler" className="text-sm text-emerald-600">
            ← Gruplar
          </Link>
          <h1 className="mt-2 text-2xl font-bold">{group.title ?? "Grup"}</h1>
        </div>
        <Link
          href={`/sohbet/${group.id}`}
          className="text-sm text-emerald-600 hover:underline"
        >
          Sohbeti aç →
        </Link>
      </div>

      <div className="space-y-3 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
        <p className="font-medium">Üye ekle</p>
        <AddMemberForm conversationId={group.id} clients={addable} />
      </div>

      <div>
        <h2 className="mb-2 font-semibold">Üyeler ({members.length})</h2>
        {members.length === 0 ? (
          <p className="text-sm text-gray-500">Henüz danışan üye yok.</p>
        ) : (
          <ul className="divide-y divide-gray-200 rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
            {members.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between px-4 py-2.5"
              >
                <span className="text-sm">{m.full_name ?? m.id}</span>
                <form action={removeMember}>
                  <input type="hidden" name="conversationId" value={group.id} />
                  <input type="hidden" name="userId" value={m.id} />
                  <button
                    type="submit"
                    className="text-xs text-red-600 hover:underline"
                  >
                    Çıkar
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
