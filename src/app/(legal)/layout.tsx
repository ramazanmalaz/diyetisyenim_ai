import { Salad } from "lucide-react";
import Link from "next/link";

import { Footer } from "@/components/footer";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-black/5 bg-white/80 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-gray-950/80">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-bold tracking-tight text-emerald-700 dark:text-emerald-300"
          >
            <Salad className="h-4 w-4" strokeWidth={1.5} /> UzmanDiyet
          </Link>
          <Link
            href="/panel"
            className="text-sm text-gray-500 hover:text-emerald-700 dark:hover:text-emerald-300"
          >
            Uygulamaya dön →
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        {children}
      </main>

      <Footer />
    </div>
  );
}
