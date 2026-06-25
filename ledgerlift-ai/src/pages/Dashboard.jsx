import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Bot, TrendingUp, TrendingDown, Send } from "lucide-react";
import { useApp } from "../context/AppContext";
import { useFinancials } from "../hooks/useFinancials";
import { monthlyData } from "../data/mockExpenses";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
};

const containerVariants = { animate: { transition: { staggerChildren: 0.1 } } };
const statCardVariants = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

function useCountUp(target, duration = 1200) {
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);
  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    const start = performance.now();
    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
      else setValue(target);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);
  return value;
}

function CustomTooltip({ active, payload, label, formatCurrency }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-xl px-4 py-3 text-sm font-outfit"
      style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
      <p className="font-semibold mb-2" style={{ color: "var(--text-primary)" }}>{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          <span style={{ color: "var(--text-secondary)" }} className="capitalize">{entry.name}:</span>
          <span className="font-mono font-medium" style={{ color: entry.color }}>{formatCurrency(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { state, formatCurrency } = useApp();
  const { totals, recentTransactions } = useFinancials();
  const [aiQuery, setAiQuery] = useState("");

  const animatedIncome   = useCountUp(totals.totalIncome);
  const animatedExpenses = useCountUp(totals.totalExpenses);
  const animatedProfit   = useCountUp(totals.netProfit);

  const dateString = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  function handleAiSubmit(e) { e.preventDefault(); navigate("/ai"); }

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit"
      className="min-h-screen px-4 py-6 md:px-8 md:py-8 max-w-5xl mx-auto">

      <header className="mb-8">
        <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.05 }}
          className="font-outfit font-extrabold leading-tight mb-1"
          style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
          Good morning, {state.userName} ☀️
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.15 }}
          className="text-sm font-outfit mb-0.5" style={{ color: "var(--text-secondary)" }}>{dateString}</motion.p>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.2 }}
          className="text-xs font-outfit" style={{ color: "var(--text-muted)" }}>{state.businessName}</motion.p>
      </header>

      <section className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "var(--teal)", letterSpacing: "0.15em" }}>Overview</p>
        <motion.div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: "thin" }}
          variants={containerVariants} initial="initial" animate="animate">

          <motion.div variants={statCardVariants} className="min-w-[160px] flex-shrink-0">
            <Card padding="sm">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2"><span className="text-lg">💰</span>
                  <span className="text-xs font-outfit font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)", letterSpacing: "0.12em" }}>Total Income</span></div>
                <p className="text-xl font-semibold leading-none" style={{ color: "var(--text-primary)", fontFamily: "JetBrains Mono, monospace" }}>{formatCurrency(animatedIncome)}</p>
                <p className="text-xs font-outfit flex items-center gap-1" style={{ color: "var(--teal)" }}><TrendingUp size={11} /> ↑ 8% this month</p>
              </div>
            </Card>
          </motion.div>

          <motion.div variants={statCardVariants} className="min-w-[160px] flex-shrink-0">
            <Card padding="sm">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2"><span className="text-lg">💸</span>
                  <span className="text-xs font-outfit font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)", letterSpacing: "0.12em" }}>Total Expenses</span></div>
                <p className="text-xl font-semibold leading-none" style={{ color: "var(--text-primary)", fontFamily: "JetBrains Mono, monospace" }}>{formatCurrency(animatedExpenses)}</p>
                <p className="text-xs font-outfit flex items-center gap-1" style={{ color: "var(--orange)" }}><TrendingDown size={11} /> ↓ 3% this month</p>
              </div>
            </Card>
          </motion.div>

          <motion.div variants={statCardVariants} className="min-w-[160px] flex-shrink-0">
            <div className="rounded-2xl border p-4 transition-all duration-200"
              style={{ background: "var(--bg-surface)", border: "1px solid rgba(0,255,209,0.2)", boxShadow: "var(--teal-glow)" }}>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2"><span className="text-lg">📈</span>
                  <span className="text-xs font-outfit font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)", letterSpacing: "0.12em" }}>Net Profit</span></div>
                <p className="text-xl font-semibold leading-none"
                  style={{ color: totals.netProfit >= 0 ? "var(--teal)" : "var(--danger)", fontFamily: "JetBrains Mono, monospace" }}>
                  {formatCurrency(animatedProfit)}
                </p>
                <p className="text-xs font-outfit" style={{ color: "var(--text-muted)" }}>After all expenses</p>
              </div>
            </div>
          </motion.div>

          <motion.div variants={statCardVariants} className="min-w-[160px] flex-shrink-0">
            <Card padding="sm">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2"><span className="text-lg">⚠️</span>
                  <span className="text-xs font-outfit font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)", letterSpacing: "0.12em" }}>Unpaid Invoices</span></div>
                <p className="text-xl font-semibold leading-none" style={{ color: "var(--text-primary)", fontFamily: "JetBrains Mono, monospace" }}>{totals.unpaidCount}</p>
                <Badge variant="orange">{totals.unpaidCount} pending</Badge>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      </section>

      <section className="mb-8">
        <Card padding="default">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--teal)", letterSpacing: "0.15em" }}>Cash Flow</p>
              <h3 style={{ color: "var(--text-primary)" }}>6-Month Overview</h3>
            </div>
            <div className="flex items-center gap-4 text-xs font-outfit">
              <span className="flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--teal)" }} /> Income
              </span>
              <span className="flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--orange)" }} /> Expenses
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={monthlyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(0,255,209,0.3)" />
                  <stop offset="100%" stopColor="rgba(0,255,209,0)" />
                </linearGradient>
                <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(255,107,0,0.3)" />
                  <stop offset="100%" stopColor="rgba(255,107,0,0)" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,255,200,0.08)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: "var(--text-muted)", fontSize: 11, fontFamily: "Outfit, sans-serif" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11, fontFamily: "JetBrains Mono, monospace" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={(props) => <CustomTooltip {...props} formatCurrency={formatCurrency} />} cursor={{ stroke: "rgba(0,255,200,0.15)", strokeWidth: 1 }} />
              <Area type="monotone" dataKey="income" stroke="var(--teal)" strokeWidth={2} fill="url(#incomeGradient)" dot={false} activeDot={{ r: 5, fill: "var(--teal)", stroke: "var(--bg-surface)", strokeWidth: 2 }} />
              <Area type="monotone" dataKey="expenses" stroke="var(--orange)" strokeWidth={2} fill="url(#expenseGradient)" dot={false} activeDot={{ r: 5, fill: "var(--orange)", stroke: "var(--bg-surface)", strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </section>

      <section className="mb-8">
        <Card padding="default">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--teal)", letterSpacing: "0.15em" }}>Activity</p>
              <h3 style={{ color: "var(--text-primary)" }}>Recent Transactions</h3>
            </div>
            <Link to="/expenses" className="text-xs font-outfit font-semibold transition-colors" style={{ color: "var(--teal)" }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.75")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}>View All →</Link>
          </div>
          <div className="flex flex-col">
            {recentTransactions.map((tx, i) => {
              const isIncome = tx.type === "income";
              const isLast = i === recentTransactions.length - 1;
              return (
                <div key={`${tx.id}-${tx.type}`}>
                  <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: 0.2 + i * 0.07 }}
                    className="flex items-center gap-3 py-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                      style={{ background: isIncome ? "var(--teal-dim)" : "var(--orange-dim)", border: `1px solid ${isIncome ? "rgba(0,255,209,0.2)" : "rgba(255,107,0,0.2)"}` }}>
                      {tx.icon || (isIncome ? "💰" : "💸")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-outfit font-medium truncate" style={{ color: "var(--text-primary)" }}>{tx.description}</p>
                      <p className="text-xs font-outfit mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {new Date(tx.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        {tx.category && <span className="ml-2" style={{ color: "var(--text-muted)" }}>· {tx.category}</span>}
                      </p>
                    </div>
                    <p className="text-sm font-semibold flex-shrink-0 text-right"
                      style={{ fontFamily: "JetBrains Mono, monospace", color: isIncome ? "var(--teal)" : "var(--orange)" }}>
                      {isIncome ? "+" : "-"}{formatCurrency(tx.amount)}
                    </p>
                  </motion.div>
                  {!isLast && <div className="h-px" style={{ background: "var(--border)" }} />}
                </div>
              );
            })}
          </div>
        </Card>
      </section>

      <section className="mb-8">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.5 }}
          className="rounded-2xl border p-5 md:p-6 transition-all duration-200"
          style={{ background: "var(--bg-surface)", border: "1px solid rgba(255,107,0,0.15)" }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--orange-dim)", border: "1px solid rgba(255,107,0,0.25)", boxShadow: "var(--orange-glow)" }}>
              <Bot size={16} style={{ color: "var(--orange)" }} />
            </div>
            <div>
              <p className="font-outfit font-bold text-sm" style={{ color: "var(--text-primary)" }}>LedgerLift AI</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Ask anything about your finances</p>
            </div>
          </div>
          <form onSubmit={handleAiSubmit} className="flex gap-3">
            <input type="text" value={aiQuery} onChange={(e) => setAiQuery(e.target.value)}
              placeholder="Ask LedgerLift AI anything..."
              className="flex-1 rounded-xl px-4 py-3 text-sm font-outfit transition-all duration-200"
              style={{ background: "var(--bg-raised)", border: "1px solid var(--border)", color: "var(--text-primary)", outline: "none" }}
              onFocus={(e) => { e.target.style.borderColor = "var(--orange)"; e.target.style.boxShadow = "var(--orange-glow)"; }}
              onBlur={(e) => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }} />
            <motion.button type="submit" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
              style={{ background: "var(--orange)", boxShadow: "var(--orange-glow)" }}>
              <Send size={16} style={{ color: "var(--bg-void)" }} />
            </motion.button>
          </form>
          <div className="flex flex-wrap gap-2 mt-3">
            {["Am I profitable this month?", "What are my top expenses?", "When should I pay taxes?"].map((suggestion) => (
              <button key={suggestion} type="button" onClick={() => navigate("/ai")}
                className="text-xs font-outfit px-3 py-1.5 rounded-full transition-all duration-150"
                style={{ background: "var(--bg-raised)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,107,0,0.3)"; e.currentTarget.style.color = "var(--orange)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-muted)"; }}>
                {suggestion}
              </button>
            ))}
          </div>
        </motion.div>
      </section>
    </motion.div>
  );
}
