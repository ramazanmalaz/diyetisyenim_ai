import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/types/database";

/**
 * Her istekte Supabase oturum token'ını tazeler ve cookie'leri senkronlar.
 * Next.js 16 `proxy.ts` (eski adıyla middleware) içinden çağrılır.
 *
 * NOT: `getUser()` ile getClaims/refresh tetiklenir. Yetkilendirme kararları
 * yine de her Server Action / Route Handler içinde ayrıca doğrulanmalıdır —
 * proxy tek başına güvenlik sınırı değildir.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Oturumu tazele (token süresi dolmuşsa yeniler).
  await supabase.auth.getUser();

  return response;
}
