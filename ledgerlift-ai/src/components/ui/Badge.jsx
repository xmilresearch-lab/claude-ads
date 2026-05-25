export default function Badge({ children, variant = "teal", size = "sm" }) {
  const variants = {
    teal:    "bg-[var(--teal-dim)] text-[var(--teal)] border border-[rgba(0,255,209,0.2)]",
    orange:  "bg-[var(--orange-dim)] text-[var(--orange)] border border-[rgba(255,107,0,0.2)]",
    danger:  "bg-[rgba(255,59,59,0.15)] text-[var(--danger)] border border-[rgba(255,59,59,0.2)]",
    muted:   "bg-[var(--bg-raised)] text-[var(--text-secondary)] border border-[var(--border)]",
  };

  const sizes = {
    sm: "px-2.5 py-0.5 text-xs font-600 rounded-lg",
    md: "px-3 py-1 text-sm font-600 rounded-xl",
  };

  return (
    <span className={`inline-flex items-center gap-1 font-outfit ${variants[variant]} ${sizes[size]}`}>
      {children}
    </span>
  );
}
