import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, TrendingUp, Droplets, PieChart as PieIcon, FileText, Download } from "lucide-react";
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { useApp } from "../context/AppContext";
import { monthlyData } from "../data/mockExpenses";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
};

const PERIODS = ["This Month", "Last 3M", "This Year"];
const PIE_COLORS = ["#00FFD1", "#FF6B00", "#7AADA0", "#3D6660", "#00C4A0", "#CC5500"];
const DEDUCTIBLE_RATE = { Software: 1, Marketing: 1, Food: 0.5, Travel: 1, Office: 1, Other: 0 };

const axisStyle = { fill: "var(--text-muted)", fontSize: 11 };
const gridProps = { strokeDasharray: "3 3", stroke: "rgba(0,255,200,0.08)" };
const ttStyle = { background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--text-primary)", fontSize: 12 };

function PeriodPills({ selected, onSelect }) {
  return (
    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
      {PERIODS.map((p) => (
        <button key={p} onClick={() => onSelect(p)}
          className={`px-2.5 py-1 rounded-lg text-[10px] font-outfit transition-colors ${selected === p ? "bg-[var(--teal-dim)] text-[var(--teal)]" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"}`}>
          {p}
        </button>
      ))}
    </div>
  );
}

function ReportCard({ id, icon: Icon, title, expandedCard, onToggle, period, onPeriod, insight, children }) {
  const isOpen = expandedCard === id;
  return (
    <Card padding="none">
      <button onClick={() => onToggle(id)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[var(--bg-raised)] transition-colors rounded-t-2xl">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-[var(--teal-dim)] border border-[rgba(0,255,209,0.2)] flex items-center justify-center text-[var(--teal)]">
            <Icon size={17} />
          </span>
          <span className="font-outfit font-bold text-[var(--text-primary)] text-sm">{title}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex"><PeriodPills selected={period} onSelect={onPeriod} /></div>
          <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={18} className="text-[var(--text-muted)]" />
          </motion.span>
        </div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div key="body"
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }} style={{ overflow: "hidden" }}>
            <div className="px-5 pb-5 pt-2 border-t border-[var(--border)] space-y-4">
              <div className="flex sm:hidden pt-1"><PeriodPills selected={period} onSelect={onPeriod} /></div>
              {children}
              {insight && (
                <p className="text-xs text-[var(--text-secondary)] bg-[var(--teal-dim)] border border-[rgba(0,255,209,0.15)] rounded-xl px-4 py-3 leading-relaxed">
                  {insight}
                </p>
              )}
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" inline onClick={() => alert("PDF export available in Pro plan.")}>
                  <Download size={14} /> Export PDF
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

export default function Reports() {
  const { state, formatCurrency } = useApp();
  const [expandedCard, setExpandedCard] = useState("pl");
  const [periods, setPeriods] = useState({ pl: "This Month", cashflow: "This Month", expenses: "This Month", tax: "This Month" });

  const toggle = (id) => setExpandedCard((prev) => (prev === id ? null : id));
  const setPeriod = (id) => (p) => setPeriods((prev) => ({ ...prev, [id]: p }));

  const catMap = state.expenses.reduce((acc, e) => { acc[e.category] = (acc[e.category] || 0) + e.amount; return acc; }, {});
  const pieData = Object.entries(catMap).map(([name, value]) => ({ name, value }));

  const taxRows = Object.entries(catMap).map(([cat, total]) => ({
    cat, total, deductible: total * (DEDUCTIBLE_RATE[cat] ?? 0), rate: DEDUCTIBLE_RATE[cat] ?? 0,
  }));
  const totalDeductible = taxRows.reduce((s, r) => s + r.deductible, 0);

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit"
      className="min-h-screen bg-[var(--bg-void)] pb-32">
      <div className="px-4 pt-4 space-y-3 max-w-2xl mx-auto">

        <ReportCard id="pl" icon={TrendingUp} title="Profit & Loss"
          expandedCard={expandedCard} onToggle={toggle}
          period={periods.pl} onPeriod={setPeriod("pl")}
          insight="Your revenue grew 15% over 6 months. May was your best month.">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid {...gridProps} vertical={false} />
              <XAxis dataKey="month" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
              <Tooltip contentStyle={ttStyle} formatter={(v) => formatCurrency(v)} />
              <Legend wrapperStyle={{ fontSize: 11, color: "var(--text-muted)" }} />
              <Bar dataKey="income" name="Income" fill="#00FFD1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="Expenses" fill="#FF6B00" radius={[4, 4, 0, 0]} opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </ReportCard>

        <ReportCard id="cashflow" icon={Droplets} title="Cash Flow"
          expandedCard={expandedCard} onToggle={toggle}
          period={periods.cashflow} onPeriod={setPeriod("cashflow")}
          insight="You have positive cash flow every month. Great financial health!">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00FFD1" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#00FFD1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF6B00" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#FF6B00" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid {...gridProps} vertical={false} />
              <XAxis dataKey="month" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
              <Tooltip contentStyle={ttStyle} formatter={(v) => formatCurrency(v)} />
              <Legend wrapperStyle={{ fontSize: 11, color: "var(--text-muted)" }} />
              <Area type="monotone" dataKey="income" name="Income" stroke="#00FFD1" strokeWidth={2} fill="url(#gIncome)" />
              <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#FF6B00" strokeWidth={2} fill="url(#gExp)" />
            </AreaChart>
          </ResponsiveContainer>
        </ReportCard>

        <ReportCard id="expenses" icon={PieIcon} title="Expense Breakdown"
          expandedCard={expandedCard} onToggle={toggle}
          period={periods.expenses} onPeriod={setPeriod("expenses")}
          insight="Software is your top expense category at 22%.">
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" paddingAngle={3}>
                  {pieData.map((entry, idx) => <Cell key={entry.name} fill={PIE_COLORS[idx % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={ttStyle} formatter={(v) => formatCurrency(v)} />
                <Legend wrapperStyle={{ fontSize: 11, color: "var(--text-muted)" }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-[var(--text-muted)] text-sm">No expense data</div>
          )}
        </ReportCard>

        <ReportCard id="tax" icon={FileText} title="Tax Summary"
          expandedCard={expandedCard} onToggle={toggle}
          period={periods.tax} onPeriod={setPeriod("tax")}
          insight={`You may be able to deduct up to ${formatCurrency(totalDeductible)} this month.`}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {["Category", "Total Spent", "Est. Deductible"].map((h) => (
                    <th key={h} className="pb-2.5 pr-4 text-left text-[var(--text-muted)] font-outfit whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {taxRows.map((row) => (
                  <tr key={row.cat} className="border-b border-[var(--border)]">
                    <td className="py-2.5 pr-4 text-[var(--text-primary)] font-medium">{row.cat}</td>
                    <td className="py-2.5 pr-4 font-mono text-[var(--orange)]">{formatCurrency(row.total)}</td>
                    <td className="py-2.5 font-mono text-[var(--teal)]">
                      {row.rate === 0 ? <span className="text-[var(--text-muted)]">—</span> : (
                        <>{formatCurrency(row.deductible)}{row.rate === 0.5 && <span className="text-[var(--text-muted)] ml-1">(50%)</span>}</>
                      )}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td className="pt-3 font-bold text-[var(--text-primary)]">Total</td>
                  <td className="pt-3 font-mono font-bold text-[var(--orange)]">{formatCurrency(taxRows.reduce((s, r) => s + r.total, 0))}</td>
                  <td className="pt-3 font-mono font-bold text-[var(--teal)]">{formatCurrency(totalDeductible)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-[var(--text-muted)] mt-1">Consult a tax professional. This is an estimate only.</p>
        </ReportCard>

      </div>
    </motion.div>
  );
}
