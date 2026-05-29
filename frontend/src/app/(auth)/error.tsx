"use client";

import { useEffect } from "react";

export default function AuthError({
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
    <div className="flex min-h-screen items-center justify-center bg-bg-base px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-bg-surface p-8 text-center">
        <h2 className="font-display text-xl font-semibold text-text-primary">
          Something went wrong
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
        <button
          onClick={reset}
          className="mt-6 w-full rounded bg-amber px-4 py-2.5 font-display text-sm font-semibold
                     text-bg-base hover:bg-amber-dark transition-colors duration-150"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
