/**
 * UzmanDiyet marka işareti — kâse gövdesi + yükselen yaprak.
 * Gövde `currentColor` alır; yaprak aynı rengin açık tonu olarak çizilir,
 * böylece koyu/açık zeminde ve tek renkli bağlamlarda (favicon, maskable)
 * ayrı bir palet gerektirmez.
 */
export function BrandMark({
  className = "h-4 w-4",
  title,
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M10 32h44c0 11.05-8.95 20-20 20h-4c-11.05 0-20-8.95-20-20z"
        fill="currentColor"
      />
      <path
        d="M32 28c0-9 5-15 13-17 1 9-3.5 16-13 17z"
        fill="currentColor"
        opacity="0.55"
      />
      <path
        d="M32 28c0-6-3-10-8-11.5"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
