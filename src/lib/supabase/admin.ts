import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

/**
 * Service-role Supabase istemcisi — RLS'i ATLAR. YALNIZCA sunucuda kullan
 * (Route Handler / Server Action). Asla client'a aktarma.
 *
 * Kullanım: AI kurallarını okuma gibi, kullanıcının doğrudan erişemeyeceği
 * ama sunucunun ihtiyaç duyduğu işlemler için.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
