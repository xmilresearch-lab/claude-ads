import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Camera, Trash2, MoreVertical, Search } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { useApp } from "../context/AppContext";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import Card from "../components/ui/Card";
import Modal from "../components/ui/Modal";

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
};

const CATEGORIES = ["All", "Food", "Travel", "Software", "Office", "Marketing", "Other"];
const CAT_COLORS = { Software: "#00FFD1", Travel: "#00FFD1", Food: "#FF6B00", Marketing: "#FF6B00", Office: "#7AADA0", Other: "#3D6660" };
const CAT_BADGE = { Software: "teal", Travel: "teal", Food: "orange", Marketing: "orange", Office: "muted", Other: "muted" };

const today = new Date().toISOString().split("T")[0];
const emptyExpense = { amount: "", description: "", category: "Food", date: today };
const inputCls = "w-full bg-[var(--bg-raised)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--teal)] transition-colors";

export default function Expenses() {
  const { state, dispatch, formatCurrency } = useApp();
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newExpense, setNewExpense] = useState(emptyExpense);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const filtered = state.expenses.filter((e) => {
    const catMatch = activeFilter === "All" || e.category === activeFilter;
    const searchMatch = e.description.toLowerCase().includes(searchQuery.toLowerCase());
    return catMatch && searchMatch;
  });

  const total = filtered.reduce((s, e) => s + e.amount, 0);
  const categoryBreakdown = Object.entries(
    filtered.reduce((acc, e) => { acc[e.category] = (acc[e.category] || 0) + e.amount; return acc; }, {})
  ).map(([name, value]) => ({ name, value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newExpense.amount || !newExpense.description) return;
    dispatch({ type: "ADD_EXPENSE", payload: { id: Date.now(), icon: "💸", ...newExpense, amount: parseFloat(newExpense.amount) } });
    setIsModalOpen(false);
    setNewExpense(emptyExpense);
  };

  const handleDelete = (id) => { dispatch({ type: "DELETE_EXPENSE", payload: id }); setOpenMenuId(null); };

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit"
      className="min-h-screen bg-[var(--bg-void)] pb-32">

      <div className="sticky top-0 z-20 bg-[var(--bg-void)] border-b border-[var(--border)] px-4 py-3 space-y-3">
        <div className="flex gap-2">
          {["This Month", "Last Month"].map((p) => (
            <button key={p} className="px-3 py-1.5 rounded-lg text-xs font-outfit border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-hover)] hover:text-[var(--text-secondary)] transition-colors">{p}</button>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button key={cat} onClick={() => setActiveFilter(cat)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-outfit transition-colors ${activeFilter === cat ? "bg-[var(--teal)] text-[var(--bg-void)] font-bold" : "border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-hover)]"}`}>
              {cat}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search expenses…"
            className="w-full bg-[var(--bg-raised)] border border-[var(--border)] rounded-xl pl-9 pr-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--teal)] transition-colors" />
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4 max-w-2xl mx-auto">
        <Card padding="none">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-[var(--text-muted)] text-sm">No expenses found</div>
          ) : (
            <ul>
              {filtered.map((expense, i) => (
                <motion.li key={expense.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                  className={`flex items-center gap-3 px-4 py-4 ${i < filtered.length - 1 ? "border-b border-[var(--border)]" : ""}`}>
                  <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-[var(--bg-raised)] text-lg">{expense.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="text-sm font-medium text-[var(--text-primary)] truncate">{expense.description}</span>
                      <Badge variant={CAT_BADGE[expense.category] || "muted"}>{expense.category}</Badge>
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">{expense.date}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-mono text-sm font-bold text-[var(--orange)]">{formatCurrency(expense.amount)}</span>
                    <div className="relative">
                      <button onClick={() => setOpenMenuId(openMenuId === expense.id ? null : expense.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-raised)] transition-colors">
                        <MoreVertical size={16} />
                      </button>
                      <AnimatePresence>
                        {openMenuId === expense.id && (
                          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                            className="absolute right-0 top-9 z-10 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl overflow-hidden shadow-xl">
                            <button onClick={() => handleDelete(expense.id)}
                              className="flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--danger)] hover:bg-[var(--bg-raised)] transition-colors whitespace-nowrap">
                              <Trash2 size={14} /> Delete
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.li>
              ))}
            </ul>
          )}
          {filtered.length > 0 && (
            <div className="flex justify-between items-center px-4 py-3 border-t border-[var(--border)] bg-[var(--bg-raised)] rounded-b-2xl">
              <span className="text-sm text-[var(--text-muted)]">Total ({filtered.length} items)</span>
              <span className="font-mono font-bold text-[var(--orange)]">{formatCurrency(total)}</span>
            </div>
          )}
        </Card>

        {categoryBreakdown.length > 0 && (
          <Card>
            <h3 className="text-sm font-outfit text-[var(--text-secondary)] mb-4">Category Breakdown</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={categoryBreakdown} cx="50%" cy="50%" outerRadius={80} dataKey="value">
                  {categoryBreakdown.map((entry) => <Cell key={entry.name} fill={CAT_COLORS[entry.name] || "#3D6660"} />)}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(v)}
                  contentStyle={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--text-primary)" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {categoryBreakdown.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: CAT_COLORS[item.name] || "#3D6660" }} />
                  <span className="text-xs text-[var(--text-secondary)] truncate">{item.name}</span>
                  <span className="text-xs font-mono text-[var(--text-muted)] ml-auto">{formatCurrency(item.value)}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      <motion.button onClick={() => setIsModalOpen(true)} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}
        className="fixed bottom-24 md:bottom-6 right-6 w-14 h-14 rounded-full bg-[var(--orange)] flex items-center justify-center shadow-[0_0_20px_var(--orange)] z-30">
        <Plus size={24} className="text-white" />
      </motion.button>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-40 left-1/2 -translate-x-1/2 bg-[var(--bg-raised)] border border-[var(--border)] rounded-xl px-5 py-3 text-sm text-[var(--text-primary)] z-50 shadow-xl whitespace-nowrap">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Expense">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1.5">Amount</label>
            <input type="number" step="0.01" placeholder="0.00" value={newExpense.amount}
              onChange={(e) => setNewExpense((p) => ({ ...p, amount: e.target.value }))}
              className={inputCls + " font-mono"} required />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1.5">Description</label>
            <input type="text" placeholder="What did you spend on?" value={newExpense.description}
              onChange={(e) => setNewExpense((p) => ({ ...p, description: e.target.value }))}
              className={inputCls} required />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1.5">Category</label>
            <select value={newExpense.category} onChange={(e) => setNewExpense((p) => ({ ...p, category: e.target.value }))} className={inputCls}>
              {CATEGORIES.filter((c) => c !== "All").map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1.5">Date</label>
            <input type="date" value={newExpense.date} onChange={(e) => setNewExpense((p) => ({ ...p, date: e.target.value }))} className={inputCls} />
          </div>
          <Button type="button" variant="ghost" size="sm" inline onClick={() => showToast("Feature coming soon")}>
            <Camera size={15} /> Receipt Upload
          </Button>
          <Button type="submit" variant="primary" fullWidth>Add Expense</Button>
        </form>
      </Modal>
    </motion.div>
  );
}
