import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        default:
          "bg-amber text-text-inverse hover:bg-amber-dark font-display tracking-wide",
        secondary:
          "bg-bg-elevated border border-border text-text-primary hover:border-border-strong hover:bg-bg-overlay",
        ghost:
          "text-text-secondary hover:text-text-primary hover:bg-bg-elevated",
        destructive:
          "bg-danger text-white hover:bg-red-600",
        outline:
          "border border-border bg-transparent text-text-primary hover:border-amber hover:text-amber",
        link: "text-amber underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        default: "h-9 px-4 py-2 rounded",
        sm:      "h-7 px-3 text-xs rounded",
        lg:      "h-11 px-6 text-base rounded-md",
        icon:    "h-9 w-9 rounded",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
