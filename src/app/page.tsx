import { Bot, Camera, Flame, LineChart } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Footer } from "@/components/footer";
import { StartButton } from "@/components/landing/start-button";
import { createClient } from "@/lib/supabase/server";

const BOWL =
  "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=720&q=80";

export default async function Home() {
  /* Oturum açıksa tanıtım sayfası gösterilmez — uygulama yeniden açıldığında
     "Giriş yap" ekranı çıkıyormuş gibi hissettiriyordu. Rol neyse oraya. */
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    redirect(data?.role === "client" || !data ? "/panel" : "/yonetim");
  }

  return (
    /* Açılış ekranı tek ekrana sığar: kolon yüksekliği 100dvh, main kalan
       alanı kaplar, footer altta kalır — sayfa kaydırılmaz. */
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      <main className="relative flex min-h-0 flex-1 flex-col items-center justify-center px-5 py-4 text-center sm:py-8">
        {/* Eyebrow — mikro pill rozet */}
        <span className="reveal inline-flex items-center gap-2 rounded-full bg-white/70 px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.18em] text-emerald-700 uppercase ring-1 ring-black/5 backdrop-blur dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-white/10">
          <BrandMark className="h-3.5 w-3.5" /> UzmanDiyet
        </span>

        {/* Devasa grotesk başlık */}
        <h1 className="reveal mt-4 max-w-3xl text-[1.9rem] leading-[1.1] font-extrabold text-balance sm:mt-6 sm:text-6xl">
          Daha akıllı beslen,{" "}
          <span className="font-serif text-emerald-600 italic">
            daha iyi yaşa.
          </span>
        </h1>

        <p className="reveal mx-auto mt-3 max-w-md text-[14px] leading-relaxed text-gray-500 sm:text-base dark:text-gray-400">
          Yapay zekâ diyetisyenin sana özel programını, günlük kalori hedefini
          ve takibini saniyeler içinde hazırlar.
        </p>

        {/* Hero görseli — Double-Bezel (dış kabuk + iç çekirdek) + yüzen premium çipler */}
        <div className="reveal relative mt-5 mb-1 h-36 w-36 sm:mt-9 sm:h-64 sm:w-64">
          <div
            aria-hidden
            className="absolute -inset-6 rounded-full bg-gradient-to-br from-emerald-200/35 to-emerald-400/20 blur-3xl"
          />
          {/* Dış kabuk (aluminyum tepsi) */}
          <div className="relative h-full w-full rounded-full bg-white/50 p-2 shadow-[var(--shadow-float)] ring-1 ring-black/5 dark:bg-white/5 dark:ring-white/10">
            {/* İç çekirdek (cam plaka) */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={BOWL}
              alt="Sağlıklı kase"
              className="h-full w-full rounded-full object-cover shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)]"
            />
          </div>

          {/* Her çip farklı gecikmeyle yüzer — senkron olmayan hareket daha canlı. */}
          <Chip className="-top-3 left-0" delay="0s">
            <Flame className="h-3.5 w-3.5 text-orange-500" strokeWidth={1.5} />{" "}
            Günlük kalori
          </Chip>
          <Chip className="top-[20%] -right-7" delay="1.2s">
            <Bot className="h-3.5 w-3.5 text-emerald-600" strokeWidth={1.5} />{" "}
            AI diyetisyen
          </Chip>
          <Chip className="-bottom-3 left-1" delay="2.4s">
            <Camera className="h-3.5 w-3.5 text-sky-600" strokeWidth={1.5} />{" "}
            Tabak analizi
          </Chip>
          <Chip className="-right-5 bottom-[16%]" delay="3.6s">
            <LineChart
              className="h-3.5 w-3.5 text-emerald-600"
              strokeWidth={1.5}
            />{" "}
            İlerleme
          </Chip>
        </div>

        {/* CTA — Button-in-Button (ok kendi yuvasında) + manyetik hover fiziği */}
        <div className="reveal mt-6 flex flex-col items-center gap-2.5 sm:flex-row">
          <StartButton />

          <Link
            href="/giris"
            className="inline-flex h-12 items-center justify-center rounded-full px-7 text-base font-medium text-gray-600 transition-[color,background-color] duration-200 ease-[var(--ease-out)] hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/5"
          >
            Giriş yap
          </Link>
        </div>

        <p className="reveal mt-3 text-[11px] text-gray-400">
          Ücretsiz başla · Kredi kartı gerekmez
        </p>
      </main>
      <Footer />
    </div>
  );
}

/** Yüzen premium çip — Double-Bezel (dış kabuk + iç çekirdek). */
function Chip({
  children,
  className = "",
  delay = "0s",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: string;
}) {
  return (
    <span
      style={{ animationDelay: delay }}
      className={`float absolute rounded-full bg-white/70 p-[3px] shadow-[var(--shadow-soft)] ring-1 ring-black/5 backdrop-blur dark:bg-white/10 dark:ring-white/10 ${className}`}
    >
      <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-[10px] font-semibold whitespace-nowrap text-gray-800 sm:gap-1.5 sm:px-3 sm:py-1 sm:text-xs dark:bg-gray-900 dark:text-gray-100">
        {children}
      </span>
    </span>
  );
}
