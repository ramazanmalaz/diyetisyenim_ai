import Link from "next/link";

import { deleteDietitian } from "@/app/(admin)/yonetim/diyetisyenler/actions";
import { DietitianForm } from "@/components/admin/dietitian-form";
import { DietitianAvatar } from "@/components/dietitians/dietitian-avatar";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type DietitianRow = Database["public"]["Tables"]["dietitians"]["Row"];

export default async function AdminDietitiansPage() {
  await requireStaff();
  const supabase = await createClient();

  const { data } = await supabase
    .from("dietitians")
    .select("*")
    .order("sort_order");

  const rows = (data ?? []) as DietitianRow[];

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-8">
      <div>
        <Link href="/yonetim" className="text-sm text-gray-400 hover:underline">
          ← Yönetim
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Diyetisyenler</h1>
        <p className="text-sm text-gray-500">
          Diyetisyen profillerini ekle/düzenle ve müsait randevu saatlerini
          yönet.
        </p>
      </div>

      <div className="space-y-2">
        {rows.length === 0 ? (
          <p className="text-sm text-gray-500">Henüz diyetisyen eklenmemiş.</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((d) => (
              <li
                key={d.id}
                className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-800"
              >
                <DietitianAvatar
                  name={d.full_name}
                  photoUrl={d.photo_url}
                  className="h-11 w-11"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {d.full_name}
                    {!d.is_active && (
                      <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500 dark:bg-gray-800">
                        pasif
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">
                    {d.title}
                    {d.city ? ` · ${d.city}` : ""}
                  </p>
                </div>
                <Link
                  href={`/yonetim/diyetisyenler/${d.id}`}
                  className="text-xs text-emerald-600 hover:underline"
                >
                  Düzenle & saatler
                </Link>
                <form action={deleteDietitian}>
                  <input type="hidden" name="id" value={d.id} />
                  <button
                    type="submit"
                    className="text-xs text-red-600 hover:underline"
                  >
                    Sil
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-3 rounded-2xl border border-gray-200 p-5 dark:border-gray-800">
        <h2 className="font-semibold">Yeni diyetisyen ekle</h2>
        <DietitianForm mode="create" />
      </div>
    </div>
  );
}
