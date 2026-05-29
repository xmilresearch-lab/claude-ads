import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-2xs font-mono font-medium transition-colors",
  {
    variants: {
      variant: {
        default:   "bg-amber/10 text-amber border border-amber/20",
        success:   "bg-success/10 text-success border border-success/20",
        danger:    "bg-danger/10 text-danger border border-danger/20",
        warning:   "bg-warning/10 text-warning border border-warning/20",
        info:      "bg-info/10 text-info border border-info/20",
        secondary: "bg-bg-elevated text-text-secondary border border-border",
        outline:   "border border-border text-text-secondary",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
