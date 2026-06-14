import { LAST_UPDATED } from "@/lib/legal";

/**
 * Yasal metin sayfaları için ortak sarmalayıcı: başlık + son güncelleme +
 * iç içe h2/p/ul/li/a öğelerini tutarlı biçimde stiller.
 */
export function LegalDoc({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <article>
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
      <p className="mt-1 text-xs text-gray-400">
        Son güncelleme: {LAST_UPDATED}
      </p>
      <div className="mt-6 space-y-4 text-sm leading-7 text-gray-700 dark:text-gray-300 [&_a]:text-emerald-600 [&_a]:underline [&_h2]:mt-8 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-gray-900 [&_li]:mt-1 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 dark:[&_h2]:text-gray-100">
        {children}
      </div>
    </article>
  );
}
