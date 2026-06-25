import { motion } from "framer-motion";

export default function Card({
  children,
  hover = false,
  glow = false,
  className = "",
  onClick,
  padding = "default",
}) {
  const paddings = {
    default: "p-5 md:p-6",
    sm: "p-4",
    lg: "p-6 md:p-8",
    none: "",
  };

  const base = [
    "rounded-2xl border bg-[var(--bg-surface)]",
    "border-[var(--border)]",
    "transition-all duration-200",
    paddings[padding],
  ].join(" ");

  const hoverStyles = hover
    ? { borderColor: "var(--border-hover)", boxShadow: "var(--teal-glow)", scale: 1.02 }
    : {};

  if (onClick || hover) {
    return (
      <motion.div
        className={`${base} ${onClick ? "cursor-pointer" : ""} ${className}`}
        whileHover={hoverStyles}
        onClick={onClick}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className={`${base} ${glow ? "shadow-teal" : ""} ${className}`}>
      {children}
    </div>
  );
}
