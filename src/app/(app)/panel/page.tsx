import { HomeChoices } from "@/components/app/home-choices";
import { requireProfile } from "@/lib/auth";

export default async function PanelPage() {
  const profile = await requireProfile();
  const firstName = (profile.full_name ?? "").trim().split(" ")[0];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-9 px-4 py-12">
      <div className="space-y-3 text-center">
        <span className="reveal inline-flex items-center rounded-full bg-white/70 px-3 py-1 text-[10px] font-semibold tracking-[0.18em] text-emerald-700 uppercase ring-1 ring-black/5 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-white/10">
          Hoş geldin
        </span>
        <h1 className="reveal text-4xl font-extrabold tracking-tight text-balance">
          Merhaba{firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="reveal mx-auto max-w-md text-gray-500 dark:text-gray-400">
          Nasıl ilerlemek istersin? İki yol da bir mesaj penceresi kadar yakın.
        </p>
      </div>

      <HomeChoices />

      <p className="reveal text-center text-xs text-gray-400">
        İstediğin zaman öğünlerini değiştirebilir, sağlık sorularını sorabilir
        ve tabağının fotoğrafını paylaşabilirsin.
      </p>
    </div>
  );
}
