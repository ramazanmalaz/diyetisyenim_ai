import Link from "next/link";

import { Button } from "@/components/ui/button";
import { requireProfile } from "@/lib/auth";

export default async function PanelPage() {
  const profile = await requireProfile();

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-8 px-4 py-16 text-center">
      <div className="space-y-3">
        <h1 className="text-3xl font-bold">
          Merhaba {profile.full_name ?? ""} 👋
        </h1>
        <p className="text-gray-500">
          Yapay zekâ diyetisyenin seni karşılayacak; birkaç soru sorup sana özel
          bir diyet programı hazırlayacak. Her şeyi tek bir sohbet penceresinden
          yürüteceksin.
        </p>
      </div>

      <Button asChild className="h-12 px-8 text-base">
        <Link href="/baslangic">Diyete Başla →</Link>
      </Button>

      <p className="text-xs text-gray-400">
        İstediğin zaman öğünlerini değiştirebilir, sağlık sorularını sorabilir ve
        tabağının fotoğrafını paylaşabilirsin.
      </p>
    </div>
  );
}
