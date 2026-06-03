import { Slot } from "@radix-ui/react-slot";
import * as React from "react";

import { cn } from "@/lib/utils";

type ButtonProps = React.ComponentProps<"button"> & {
  variant?: "primary" | "outline" | "ghost";
  asChild?: boolean;
};

const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-emerald-600 text-white hover:bg-emerald-700",
  outline:
    "border border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-900",
  ghost: "hover:bg-gray-100 dark:hover:bg-gray-800",
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
        "inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium transition disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
