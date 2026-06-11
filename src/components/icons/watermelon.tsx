import type { LucideProps } from "lucide-react";

/**
 * Karpuz dilimi ikonu (lucide stilinde — stroke tabanlı, currentColor).
 * Lucide'de karpuz ikonu bulunmadığı için özel çizildi.
 */
export function Watermelon({
  className,
  strokeWidth = 2,
  ...rest
}: LucideProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...rest}
    >
      {/* Kabuk üst kenarı + yarım dilim */}
      <path d="M4 7h16" />
      <path d="M4 7a8 8 0 0 0 16 0" />
      {/* İç kabuk/etli sınır */}
      <path d="M6.5 7a5.5 5.5 0 0 0 11 0" />
      {/* Çekirdekler */}
      <path d="M10 10.5v.01" />
      <path d="M14 10.5v.01" />
      <path d="M12 13v.01" />
    </svg>
  );
}
