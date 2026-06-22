import { createBrowserClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

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

/**
 * Implicit (fragment) akışlı istemci — yalnızca şifre sıfırlama / magic-link
 * İSTEĞİ için. `@supabase/ssr` PKCE'ye zorladığından burada DÜZ supabase-js
 * kullanılır; böylece e-posta linki `#access_token=...` (fragment) ile döner ve
 * `code_verifier` çerezine bağımlı OLMAZ → link farklı tarayıcıda/cihazda
 * (mobil e-posta uygulamasının in-app tarayıcısı) açılsa bile çalışır.
 * Oturum açma `/auth/confirm` handler'ında setSession ile yapılır; bu istemci
 * oturumu kalıcılaştırmaz (yalnızca e-posta tetiklemek için).
 */
export function createImplicitClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { flowType: "implicit", persistSession: false } },
  );
}
