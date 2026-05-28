import { Zap } from "lucide-react";
import { APP_NAME } from "@/lib/utils/constants";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="flex h-9 w-9 items-center justify-center rounded bg-amber">
            <Zap className="h-5 w-5 text-bg-base" />
          </div>
          <span className="font-display text-xl font-bold text-text-primary tracking-wide">
            {APP_NAME}
          </span>
        </div>

        {/* Card */}
        <div className="card-command p-6">
          {children}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-2xs font-mono text-text-muted uppercase tracking-widest">
          Industrial Command Center v1.0
        </p>
      </div>
    </div>
  );
}
