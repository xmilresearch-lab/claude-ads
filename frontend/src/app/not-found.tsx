import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-base px-4 text-center">
      <p className="font-display text-[8rem] font-bold leading-none text-[#1E2330] select-none">
        404
      </p>
      <h1 className="mt-4 font-display text-2xl font-semibold text-text-primary">
        Page not found
      </h1>
      <p className="mt-2 text-sm text-text-secondary">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/automations"
        className="mt-8 rounded bg-amber px-6 py-2.5 font-display text-sm font-semibold
                   text-bg-base hover:bg-amber-dark transition-colors duration-150"
      >
        Back to automations
      </Link>
    </div>
  );
}
