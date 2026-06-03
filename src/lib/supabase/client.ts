import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/database";

/**
 * Tarayıcı (Client Component) tarafı Supabase istemcisi.
 * Yalnızca public anon key kullanır — RLS koruması zorunludur.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
