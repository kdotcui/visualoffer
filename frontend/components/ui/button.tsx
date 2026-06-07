import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "secondary" | "outline" | "ghost";

const variants: Record<ButtonVariant, string> = {
  default: "bg-[#00c805] text-black hover:bg-[#00b305]",
  secondary: "bg-black text-white hover:bg-zinc-800",
  outline:
    "border border-zinc-200 bg-white text-black hover:border-[#00c805] hover:bg-[#00c805]/5",
  ghost: "text-zinc-600 hover:bg-zinc-100 hover:text-black",
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  variant?: ButtonVariant;
};

export function Button({ asChild, className, variant = "default", ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(
        "inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
