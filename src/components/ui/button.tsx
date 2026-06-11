import { Slot } from "@radix-ui/react-slot";
import * as React from "react";

import { cn } from "@/lib/utils";

type ButtonProps = React.ComponentProps<"button"> & {
  variant?: "primary" | "outline" | "ghost";
  asChild?: boolean;
};

const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-emerald-600 text-white shadow-[0_1px_2px_rgb(7_40_29/0.2),0_6px_16px_-6px_rgb(11_109_72/0.5)] hover:bg-emerald-700 hover:shadow-[0_2px_4px_rgb(7_40_29/0.2),0_10px_22px_-8px_rgb(11_109_72/0.55)]",
  outline:
    "border border-gray-300 hover:border-emerald-400 hover:bg-emerald-50/50 dark:border-gray-700 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/30",
  ghost: "hover:bg-emerald-50 dark:hover:bg-emerald-950/30",
};

export function Button({
  className,
  variant = "primary",
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(
        // Yalnızca color/box-shadow/transform animasyonu; güçlü ease-out.
        "inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-medium transition-[background-color,box-shadow,transform,border-color] duration-200 ease-[var(--ease-out)] outline-none select-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
