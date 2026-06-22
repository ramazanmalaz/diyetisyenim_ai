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

/**
 * Implicit (fragment) akışlı istemci — yalnızca şifre sıfırlama / magic-link
 * isteği için. PKCE `code_verifier` çerezine bağımlı olmadığından, e-posta
 * linki farklı tarayıcıda/cihazda (örn. mobil e-posta uygulamasının in-app
 * tarayıcısı) açılsa bile çalışır. Link `#access_token=...` ile döner; bunu
 * `/auth/confirm` handler'ı `setSession` ile işler.
 */
export function createImplicitClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { flowType: "implicit" } },
  );
}
