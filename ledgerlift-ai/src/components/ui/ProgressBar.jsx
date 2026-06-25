import { motion } from "framer-motion";

export default function ProgressBar({ value = 0, max = 100, showLabel = false, color = "teal", height = "sm" }) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));

  const heights = { sm: "h-1.5", md: "h-2.5", lg: "h-3" };

  const fillStyle =
    color === "orange"
      ? { background: "var(--orange)", boxShadow: "0 0 10px rgba(255,107,0,0.4)" }
      : { background: "var(--teal)", boxShadow: "0 0 10px rgba(0,255,209,0.4)" };

  return (
    <div className="w-full flex items-center gap-3">
      <div className={`flex-1 bg-[var(--bg-raised)] rounded-full overflow-hidden ${heights[height]}`}>
        <motion.div
          className="h-full rounded-full"
          style={fillStyle}
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-mono text-[var(--text-muted)] min-w-[2.5rem] text-right">
          {Math.round(percent)}%
        </span>
      )}
    </div>
  );
}
