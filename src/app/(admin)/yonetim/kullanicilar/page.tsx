import { PremiumUserList } from "@/components/admin/premium-user-list";
import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Kullanıcılar & Premium — Yönetim" };

export default async function KullanicilarPage() {
  const me = await requireStaff();
  const admin = createAdminClient();

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, role, premium_until")
    .order("created_at", { ascending: false });

  // E-postaları auth tarafından çek (service-role).
  const emailById = new Map<string, string>();
  try {
    const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    data?.users.forEach((u) => {
      if (u.email) emailById.set(u.id, u.email);
    });
  } catch {
    // E-posta alınamazsa yalnızca isimle gösterilir.
  }

  const users = (profiles ?? []).map((p) => ({
    id: p.id,
    name: p.full_name,
    role: p.role,
    premiumUntil: p.premium_until,
    email: emailById.get(p.id) ?? null,
  }));

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold">Kullanıcılar & Premium</h1>
        <p className="text-gray-500">
          Kullanıcılara premium erişim ver, uzat veya kaldır.
        </p>
      </div>
      <PremiumUserList users={users} currentUserId={me.id} />
    </div>
  );
}
