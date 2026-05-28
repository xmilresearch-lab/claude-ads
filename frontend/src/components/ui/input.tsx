import * as React from "react";
import { cn } from "@/lib/utils/cn";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded bg-bg-surface border border-border px-3 py-1",
          "text-sm text-text-primary placeholder:text-text-muted font-mono",
          "focus:outline-none focus:border-amber focus:shadow-amber",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "transition-all duration-150",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
