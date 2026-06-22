import { ConfirmClient } from "./confirm-client";

/**
 * E-posta bağlantısı bu sayfaya iner. Asıl doğrulama client'ta yapılır
 * (URL fragment'ındaki token'ları okuyabilmek için).
 */
export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{
    code?: string;
    token_hash?: string;
    type?: string;
    next?: string;
  }>;
}) {
  const sp = await searchParams;
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <ConfirmClient
          code={sp.code ?? null}
          tokenHash={sp.token_hash ?? null}
          type={sp.type ?? null}
          next={sp.next ?? "/panel"}
        />
      </div>
    </div>
  );
}
