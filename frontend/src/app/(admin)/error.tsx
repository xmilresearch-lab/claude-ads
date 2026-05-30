"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg border border-red-500/30 bg-bg-surface p-8">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="h-5 w-5 text-amber shrink-0" />
          <h2 className="font-display text-lg font-semibold text-text-primary">
            Page failed to load
          </h2>
        </div>
        <p className="text-sm text-text-secondary font-mono">
          {error.digest ?? error.message ?? "An unexpected error occurred."}
        </p>
        <div className="mt-6 flex gap-3">
          <button
            onClick={reset}
            className="flex-1 rounded bg-amber px-4 py-2 font-display text-sm font-semibold
                       text-bg-base hover:bg-amber-dark transition-colors duration-150"
          >
            Try again
          </button>
          <Link
            href="/automations"
            className="flex-1 rounded border border-border bg-bg-elevated px-4 py-2
                       font-display text-sm font-semibold text-text-secondary text-center
                       hover:bg-bg-overlay transition-colors duration-150"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
