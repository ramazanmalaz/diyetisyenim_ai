import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      <div className="space-y-4">
        <p className="text-sm font-medium tracking-wide text-emerald-600 uppercase">
          DiyetChat
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
          Diyetisyeninle her an iletişimde,
          <br className="hidden sm:block" /> sorularına anında yanıt.
        </h1>
        <p className="mx-auto max-w-xl text-lg text-gray-600 dark:text-gray-400">
          WhatsApp grubu rahatlığında sohbet et, yapay zekâ destekli beslenme
          yanıtları al, kişiye özel diyet planını ve ilerlemeni tek yerden takip
          et.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/kayit"
          className="rounded-full bg-emerald-600 px-6 py-3 font-medium text-white transition hover:bg-emerald-700"
        >
          Hemen başla
        </Link>
        <Link
          href="/giris"
          className="rounded-full border border-gray-300 px-6 py-3 font-medium transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-900"
        >
          Giriş yap
        </Link>
      </div>
    </main>
  );
}
