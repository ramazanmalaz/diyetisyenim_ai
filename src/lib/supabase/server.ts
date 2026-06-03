import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/types/database";

/**
 * Sunucu (Server Component / Server Action / Route Handler) tarafı Supabase istemcisi.
 * Next.js 16'da `cookies()` asenkrondur — bu yüzden fonksiyon `async`.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component içinden çağrıldığında cookie yazılamaz; oturum
            // yenileme proxy üzerinden yapıldığı için bu hata güvenle yok sayılır.
          }
        },
      },
    },
  );
}
