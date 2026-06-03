import { type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

/**
 * Next.js 16 Proxy (eski adıyla middleware). Her istekte Supabase oturumunu tazeler.
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Aşağıdakiler hariç tüm yollarda çalış:
     * - _next/static, _next/image (Next.js iç dosyaları)
     * - favicon.ico ve statik görsel uzantıları
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
