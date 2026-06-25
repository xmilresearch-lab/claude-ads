export default function GlowDivider({ color = "teal" }) {
  const style =
    color === "orange"
      ? { background: "linear-gradient(90deg, transparent, var(--orange), transparent)" }
      : { background: "linear-gradient(90deg, transparent, var(--teal), transparent)" };

  return <div className="h-px w-full opacity-20" style={style} />;
}
