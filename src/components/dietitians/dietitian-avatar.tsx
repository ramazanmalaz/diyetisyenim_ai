import { initials } from "@/lib/dietitians";
import { cn } from "@/lib/utils";

export function DietitianAvatar({
  name,
  photoUrl,
  className,
}: {
  name: string;
  photoUrl: string | null;
  className?: string;
}) {
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={name}
        className={cn(
          "shrink-0 rounded-2xl bg-emerald-50 object-cover ring-1 ring-black/5 dark:bg-emerald-950/40",
          className,
        )}
      />
    );
  }
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-2xl bg-emerald-100 font-bold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
        className,
      )}
    >
      {initials(name)}
    </div>
  );
}
