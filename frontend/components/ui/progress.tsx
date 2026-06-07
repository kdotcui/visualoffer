import * as React from "react";
import { cn } from "@/lib/utils";

export function Progress({ className, value = 0, ...props }: React.HTMLAttributes<HTMLDivElement> & { value?: number }) {
  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-full bg-zinc-100", className)}
      {...props}
    >
      <div
        className="h-full rounded-full bg-[#00c805] transition-all"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
