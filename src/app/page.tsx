import { Bot, Camera, Flame, LineChart, Salad } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

const BOWL =
  "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=640&q=80";

export default function Home() {
  return (
    <main className="relative flex flex-1 flex-col items-center px-6 pt-14 pb-20 text-center">
      <span className="reveal inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/70 px-3.5 py-1.5 text-sm font-bold text-emerald-700 backdrop-blur dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
        <Salad className="h-4 w-4" /> DiyetChat
      </span>

      <h1 className="reveal mt-6 max-w-2xl text-4xl font-extrabold text-balance sm:text-6xl">
        Daha akıllı beslen,{" "}
        <span className="font-serif text-emerald-600 italic">daha iyi yaşa.</span>
      </h1>

      <p className="reveal mx-auto mt-5 max-w-md text-base text-gray-600 dark:text-gray-300">
        Yapay zekâ diyetisyenin sana özel programını, günlük kalori hedefini ve
        takibini saniyeler içinde hazırlar.
      </p>

      {/* Yemek görseli + yüzen rozetler */}
      <div className="relative mt-10 mb-2 h-64 w-64 sm:h-72 sm:w-72">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-200 to-emerald-400/40 blur-2xl" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={BOWL}
          alt="Sağlıklı kase"
          className="relative h-full w-full rounded-full object-cover shadow-[var(--shadow-float)] ring-8 ring-white/70"
        />
        <Badge className="-top-2 left-2">
          <Flame className="h-3.5 w-3.5 text-orange-500" /> Günlük kalori
        </Badge>
        <Badge className="top-10 -right-4">
          <Bot className="h-3.5 w-3.5 text-emerald-600" /> AI diyetisyen
        </Badge>
        <Badge className="-bottom-1 left-0">
          <Camera className="h-3.5 w-3.5 text-sky-600" /> Tabak analizi
        </Badge>
        <Badge className="right-2 bottom-12">
          <LineChart className="h-3.5 w-3.5 text-emerald-600" /> İlerleme
        </Badge>
      </div>

      <div className="reveal mt-8 flex flex-col gap-3 sm:flex-row">
        <Button asChild className="h-12 px-8 text-base">
          <Link href="/kayit">Hemen başla →</Link>
        </Button>
        <Button asChild variant="outline" className="h-12 px-8 text-base">
          <Link href="/giris">Giriş yap</Link>
        </Button>
      </div>
    </main>
  );
}

function Badge({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`glass absolute inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap shadow-[var(--shadow-soft)] ${className}`}
    >
      {children}
    </span>
  );
}
