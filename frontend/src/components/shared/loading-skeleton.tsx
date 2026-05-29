import { cn } from "@/lib/utils/cn";

function Bone({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-bg-elevated", className)} />;
}

export function LineSkeleton({ className }: { className?: string }) {
  return <Bone className={cn("h-4 w-full", className)} />;
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("card-command p-4 space-y-3", className)}>
      <div className="flex items-center gap-2">
        <Bone className="h-3.5 w-3.5 shrink-0" />
        <Bone className="h-3 w-24" />
      </div>
      <Bone className="h-7 w-1/2" />
      <Bone className="h-3 w-16" />
    </div>
  );
}

export function TableRowSkeleton({ cols = 4, className }: { cols?: number; className?: string }) {
  return (
    <div className={cn("flex items-center gap-4 py-3 border-b border-border", className)}>
      {Array.from({ length: cols }).map((_, i) => (
        <Bone key={i} className={cn("h-4", i === 0 ? "w-48" : i === cols - 1 ? "w-16" : "flex-1")} />
      ))}
    </div>
  );
}

export function LoadingSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-0", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRowSkeleton key={i} />
      ))}
    </div>
  );
}
