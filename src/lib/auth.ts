import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type UserRole = "client" | "dietitian" | "admin";

export type Profile = {
  id: string;
  role: UserRole;
  full_name: string | null;
  avatar_url: string | null;
  dietitian_id: string | null;
};

/** Oturum açmış kullanıcıyı döndürür; yoksa null. */
export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Oturum açmış kullanıcının profilini döndürür; yoksa null. */
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, role, full_name, avatar_url, dietitian_id")
    .eq("id", user.id)
    .single();

  return (data as Profile | null) ?? null;
}

/** Oturum zorunlu; yoksa /giris'e yönlendirir. */
export async function requireProfile(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/giris");
  return profile;
}

/** Personel (diyetisyen/admin) zorunlu; değilse uygun yere yönlendirir. */
export async function requireStaff(): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.role === "client") redirect("/panel");
  return profile;
}

export function isStaff(role: UserRole): boolean {
  return role === "dietitian" || role === "admin";
}
