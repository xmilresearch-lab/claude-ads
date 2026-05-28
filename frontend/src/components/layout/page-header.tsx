import Link from "next/link";
import { cn } from "@/lib/utils/cn";

interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  /** Alias: description */
  subtitle?: string;
  description?: string;
  /** Alias: action */
  actions?: React.ReactNode;
  action?: React.ReactNode;
  breadcrumb?: Breadcrumb[];
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  description,
  actions,
  action,
  breadcrumb,
  className,
}: PageHeaderProps) {
  const sub = subtitle ?? description;
  const cta = actions ?? action;

  return (
    <div className={cn("border-b border-border px-6 py-5", className)}>
      {breadcrumb && breadcrumb.length > 0 && (
        <nav className="mb-1.5 flex items-center gap-1">
          {breadcrumb.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span className="text-2xs font-mono text-text-muted">/</span>}
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="text-2xs font-mono text-text-muted hover:text-text-secondary transition-colors"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-2xs font-mono text-text-muted">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-text-primary tracking-wide">
            {title}
          </h1>
          {sub && (
            <p className="mt-0.5 text-sm text-text-muted">{sub}</p>
          )}
        </div>
        {cta && (
          <div className="ml-4 flex shrink-0 items-center gap-2">{cta}</div>
        )}
      </div>
    </div>
  );
}
