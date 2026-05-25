import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, CheckCircle } from "lucide-react";
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

const STATUS_BADGE = { Paid: "teal", Pending: "orange", Overdue: "danger" };
const today = new Date().toISOString().split("T")[0];
const emptyInvoice = { client: "", description: "", amount: "", date: today, status: "Pending" };
const inputCls = "w-full bg-[var(--bg-raised)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--teal)] transition-colors";

function SummaryCard({ label, amount, color }) {
  return (
    <div className="flex-shrink-0 w-44 bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-4">
      <p className="text-xs text-[var(--text-muted)] mb-1 font-outfit">{label}</p>
      <p className="font-mono font-bold text-base truncate" style={{ color }}>{amount}</p>
    </div>
  );
}

export default function Income() {
  const { state, dispatch, formatCurrency } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newInvoice, setNewInvoice] = useState(emptyInvoice);
  const [toast, setToast] = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const paid = state.income.filter((i) => i.status === "Paid").reduce((s, i) => s + i.amount, 0);
  const pending = state.income.filter((i) => i.status === "Pending").reduce((s, i) => s + i.amount, 0);
  const overdue = state.income.filter((i) => i.status === "Overdue").reduce((s, i) => s + i.amount, 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newInvoice.client || !newInvoice.amount) return;
    dispatch({ type: "ADD_INCOME", payload: { id: Date.now(), ...newInvoice, amount: parseFloat(newInvoice.amount) } });
    setIsModalOpen(false);
    setNewInvoice(emptyInvoice);
  };

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit"
      className="min-h-screen bg-[var(--bg-void)] pb-32">
      <div className="px-4 pt-4 space-y-4 max-w-2xl mx-auto">
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4">
          <SummaryCard label="Total Paid" amount={formatCurrency(paid)} color="var(--teal)" />
          <SummaryCard label="Total Pending" amount={formatCurrency(pending)} color="var(--orange)" />
          <SummaryCard label="Total Overdue" amount={formatCurrency(overdue)} color="var(--danger)" />
        </div>

        <Card padding="none">
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <h3 className="text-sm font-outfit text-[var(--text-secondary)]">Income Transactions</h3>
          </div>
          {state.income.length === 0 ? (
            <div className="py-16 text-center text-[var(--text-muted)] text-sm">No income records yet</div>
          ) : (
            <ul>
              {state.income.map((item, i) => (
                <motion.li key={item.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                  className={`flex items-center gap-3 px-4 py-4 ${i < state.income.length - 1 ? "border-b border-[var(--border)]" : ""}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[var(--text-primary)] truncate">{item.client}</p>
                    <p className="text-xs text-[var(--text-muted)] truncate">{item.description}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">{item.date}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <span className="font-mono text-sm font-bold text-[var(--teal)]">{formatCurrency(item.amount)}</span>
                    <Badge variant={STATUS_BADGE[item.status] || "muted"}>{item.status}</Badge>
                  </div>
                </motion.li>
              ))}
            </ul>
          )}
        </Card>

        <Card padding="none">
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <h3 className="text-sm font-outfit text-[var(--text-secondary)]">Invoice Tracker</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {["Client", "Description", "Amount", "Due Date", "Status", "Action"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[var(--text-muted)] font-outfit whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {state.income.map((item) => (
                  <tr key={item.id}
                    style={item.status === "Overdue" ? { borderLeft: "2px solid var(--orange)" } : {}}
                    className="border-b border-[var(--border)] hover:bg-[var(--bg-raised)] transition-colors">
                    <td className="px-4 py-3 font-bold text-[var(--text-primary)] whitespace-nowrap">{item.client}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] max-w-[140px] truncate">{item.description}</td>
                    <td className="px-4 py-3 font-mono text-[var(--teal)] whitespace-nowrap">{formatCurrency(item.amount)}</td>
                    <td className="px-4 py-3 text-[var(--text-muted)] whitespace-nowrap">{item.date}</td>
                    <td className="px-4 py-3"><Badge variant={STATUS_BADGE[item.status] || "muted"}>{item.status}</Badge></td>
                    <td className="px-4 py-3">
                      {(item.status === "Pending" || item.status === "Overdue") && (
                        <button onClick={() => showToast("Feature available in Phase 2")}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)] transition-colors whitespace-nowrap">
                          <CheckCircle size={12} /> Mark Paid
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <motion.button onClick={() => setIsModalOpen(true)} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}
        className="fixed bottom-24 md:bottom-6 right-6 w-14 h-14 rounded-full bg-[var(--teal)] flex items-center justify-center shadow-[0_0_20px_var(--teal)] z-30">
        <Plus size={24} className="text-[var(--bg-void)]" />
      </motion.button>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-40 left-1/2 -translate-x-1/2 bg-[var(--bg-raised)] border border-[var(--border)] rounded-xl px-5 py-3 text-sm text-[var(--text-primary)] z-50 shadow-xl whitespace-nowrap">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Invoice / Income">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1.5">Client Name</label>
            <input type="text" placeholder="Client or company name" value={newInvoice.client}
              onChange={(e) => setNewInvoice((p) => ({ ...p, client: e.target.value }))}
              className={inputCls} required />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1.5">Description</label>
            <input type="text" placeholder="Service or project description" value={newInvoice.description}
              onChange={(e) => setNewInvoice((p) => ({ ...p, description: e.target.value }))}
              className={inputCls} />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1.5">Amount</label>
            <input type="number" step="0.01" placeholder="0.00" value={newInvoice.amount}
              onChange={(e) => setNewInvoice((p) => ({ ...p, amount: e.target.value }))}
              className={inputCls + " font-mono"} required />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1.5">Due Date</label>
            <input type="date" value={newInvoice.date}
              onChange={(e) => setNewInvoice((p) => ({ ...p, date: e.target.value }))}
              className={inputCls} />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1.5">Status</label>
            <select value={newInvoice.status} onChange={(e) => setNewInvoice((p) => ({ ...p, status: e.target.value }))} className={inputCls}>
              {["Paid", "Pending", "Overdue"].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <Button type="submit" variant="primary" fullWidth>Add Income</Button>
        </form>
      </Modal>
    </motion.div>
  );
}
