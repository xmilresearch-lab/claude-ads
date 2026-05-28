const BULLETS = [
  "Social media, email, CRM — all running while you sleep.",
  "20 AI-powered tools. One command center.",
  "Claude-powered. Production-grade.",
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Left: Brand panel */}
      <div className="relative hidden lg:flex w-1/2 flex-col justify-center px-16 bg-bg-surface border-r border-border overflow-hidden">
        <div className="mb-12">
          <p className="text-2xs font-mono text-text-muted uppercase tracking-widest mb-4">
            AI Automation Platform
          </p>
          <h1 className="font-display text-6xl font-extrabold text-amber tracking-tight leading-none mb-4">
            AUTOMATE
          </h1>
          <p className="text-text-secondary font-sans text-lg">
            Command your automations.
          </p>
        </div>

        <div className="space-y-4">
          {BULLETS.map((bullet) => (
            <div key={bullet} className="flex items-start gap-3">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber" />
              <span className="text-text-secondary text-sm leading-relaxed">{bullet}</span>
            </div>
          ))}
        </div>

        {/* Ambient glow */}
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-amber/5 blur-3xl" />
        <div className="pointer-events-none absolute top-1/4 right-0 h-64 w-64 rounded-full bg-amber/3 blur-2xl" />
      </div>

      {/* Right: Form area — inherits body grid background */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="card-command p-6">
            {children}
          </div>
          <p className="mt-5 text-center text-2xs font-mono text-text-muted uppercase tracking-widest">
            Industrial Command Center v1.0
          </p>
        </div>
      </div>
    </div>
  );
}
