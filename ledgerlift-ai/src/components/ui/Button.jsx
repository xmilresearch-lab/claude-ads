import { motion } from "framer-motion";

export default function Button({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  inline = false,
  loading = false,
  disabled = false,
  onClick,
  type = "button",
  className = "",
}) {
  const base =
    "relative inline-flex items-center justify-center font-outfit font-600 rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 select-none";

  const sizes = {
    sm: "px-4 py-2 text-sm gap-1.5",
    md: "px-6 py-3 text-base gap-2",
    lg: "px-8 py-4 text-lg gap-2.5",
  };

  const variants = {
    primary: [
      "bg-teal text-void font-bold",
      "hover:shadow-teal hover:brightness-110",
      "focus-visible:ring-teal",
      "disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none",
    ].join(" "),
    secondary: [
      "bg-orange text-void font-bold",
      "hover:shadow-orange hover:brightness-110",
      "focus-visible:ring-orange",
      "disabled:opacity-40 disabled:cursor-not-allowed",
    ].join(" "),
    ghost: [
      "bg-transparent border border-[var(--border)] text-[var(--text-secondary)]",
      "hover:border-[var(--border-hover)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-raised)]",
      "focus-visible:ring-[var(--teal)]",
      "disabled:opacity-40 disabled:cursor-not-allowed",
    ].join(" "),
    danger: [
      "bg-[var(--danger)] text-white font-bold",
      "hover:brightness-110",
      "focus-visible:ring-red-500",
      "disabled:opacity-40 disabled:cursor-not-allowed",
    ].join(" "),
  };

  const widthClass = !inline ? (fullWidth ? "w-full" : "w-full md:w-auto") : "";

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      whileHover={!disabled && !loading ? { scale: 1.02 } : {}}
      whileTap={!disabled && !loading ? { scale: 0.98 } : {}}
      className={`${base} ${sizes[size]} ${variants[variant]} ${widthClass} ${className}`}
    >
      {loading ? (
        <>
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>Loading...</span>
        </>
      ) : children}
    </motion.button>
  );
}
