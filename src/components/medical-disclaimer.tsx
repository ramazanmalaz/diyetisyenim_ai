import { Info } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Tıbbi olmayan kullanım uyarısı. Uygulama yalnızca kalori hesabı/asistanlık
 * sunar; tıbbi destek için diyetisyene/doktora yönlendirir.
 */
export function MedicalDisclaimer({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200 dark:bg-amber-950/20 dark:text-amber-200 dark:ring-amber-900/40",
        className,
      )}
    >
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} />
      <span>
        Bu uygulama <b>tıbbi destek veya teşhis sağlamaz</b>; yalnızca beslenme
        asistanlığı ve kalori hesabı sunar. Sağlık sorunların ve kişiye özel tıbbi
        beslenme için bir <b>diyetisyene/doktora</b> başvur.
      </span>
    </p>
  );
}
