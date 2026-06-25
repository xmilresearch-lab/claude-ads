import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Trash2, Sparkles, TrendingUp, FileText, BookOpen, Rocket } from "lucide-react";
import { useAI } from "../hooks/useAI";
import { useApp } from "../context/AppContext";
import { useFinancials } from "../hooks/useFinancials";

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
  exit:    { opacity: 0, y: -10, transition: { duration: 0.2 } },
};

const PROMPT_CATEGORIES = [
  {
    label: "My Finances",
    icon: TrendingUp,
    color: "var(--teal)",
    dim: "var(--teal-dim)",
    prompts: [
      "Am I profitable this month?",
      "What are my top 3 expense categories?",
      "How does my income compare to last month?",
      "Do I have any overdue invoices I should chase?",
    ],
  },
  {
    label: "Tax & Deductions",
    icon: FileText,
    color: "#FF9500",
    dim: "rgba(255,149,0,0.12)",
    prompts: [
      "Which of my expenses are tax deductible?",
      "How much should I set aside for quarterly taxes?",
      "What records should I keep for a tax audit?",
      "Explain self-employment tax in simple terms.",
    ],
  },
  {
    label: "Explain a Concept",
    icon: BookOpen,
    color: "#7AADA0",
    dim: "rgba(122,173,160,0.12)",
    prompts: [
      "What is accounts payable vs accounts receivable?",
      "Explain profit margin like I'm 12.",
      "What's the difference between revenue and profit?",
      "What is cash flow and why does it matter?",
    ],
  },
  {
    label: "Grow My Business",
    icon: Rocket,
    color: "var(--orange)",
    dim: "var(--orange-dim)",
    prompts: [
      "What's a healthy profit margin for my type of business?",
      "When should I hire my first employee?",
      "How do I price my services to stay profitable?",
      "What financial milestone should I hit before scaling?",
    ],
  },
];

function ChatBubble({ msg, index }) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
    >
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-1 ${
        isUser
          ? "bg-[var(--orange-dim)] border border-[rgba(255,107,0,0.2)]"
          : "bg-[var(--teal-dim)] border border-[rgba(0,255,209,0.2)]"
      }`}>
        {isUser
          ? <User size={14} style={{ color: "var(--orange)" }} />
          : <Bot size={14} style={{ color: "var(--teal)" }} />}
      </div>
      <div
        className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser ? "rounded-tr-sm" : "rounded-tl-sm border-l-2"
        }`}
        style={
          isUser
            ? { background: "rgba(255,107,0,0.12)", border: "1px solid rgba(255,107,0,0.2)", color: "var(--text-primary)" }
            : { background: "rgba(0,255,209,0.06)", borderColor: "var(--teal)", color: "var(--text-primary)" }
        }
      >
        {msg.content.split("\n").map((line, i) => (
          <p key={i} className={i > 0 ? "mt-2" : ""}>{line}</p>
        ))}
      </div>
    </motion.div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-[var(--teal-dim)] border border-[rgba(0,255,209,0.2)]">
        <Bot size={14} style={{ color: "var(--teal)" }} />
      </div>
      <div
        className="rounded-2xl rounded-tl-sm border-l-2 px-4 py-3 flex items-center gap-1.5"
        style={{ background: "rgba(0,255,209,0.06)", borderColor: "var(--teal)" }}
      >
        {[0, 1, 2].map(i => (
          <motion.span
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: "var(--teal)" }}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
    </div>
  );
}

function FinancialSnapshot({ totals, formatCurrency }) {
  const items = [
    { label: "Income",   value: formatCurrency(totals.totalIncome),   color: "var(--teal)" },
    { label: "Expenses", value: formatCurrency(totals.totalExpenses), color: "var(--orange)" },
    { label: "Net Profit", value: formatCurrency(totals.netProfit),   color: totals.netProfit >= 0 ? "var(--teal)" : "var(--danger)" },
    { label: "Unpaid",   value: `${totals.unpaidCount} invoices`,      color: "var(--orange)" },
  ];
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 px-4 md:px-6 pt-3 scrollbar-none">
      {items.map(({ label, value, color }) => (
        <div key={label} className="flex-shrink-0 rounded-xl px-3 py-2 border"
          style={{ background: "var(--bg-raised)", borderColor: "var(--border)" }}>
          <div className="text-[9px] uppercase tracking-widest text-[var(--text-muted)] mb-0.5">{label}</div>
          <div className="font-mono text-sm font-bold" style={{ color }}>{value}</div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ onSelect, activeCat, setActiveCat }) {
  const cat = PROMPT_CATEGORIES[activeCat];
  const CatIcon = cat.icon;

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-2 overflow-x-auto pb-2 px-4 md:px-6 pt-3 scrollbar-none flex-shrink-0">
        {PROMPT_CATEGORIES.map((c, i) => {
          const CIcon = c.icon;
          const active = activeCat === i;
          return (
            <button key={c.label} onClick={() => setActiveCat(i)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-outfit font-semibold flex-shrink-0 transition-all"
              style={{
                background: active ? c.dim : "var(--bg-raised)",
                border: `1px solid ${active ? c.color : "var(--border)"}`,
                color: active ? c.color : "var(--text-muted)",
              }}>
              <CIcon size={12} />
              {c.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 flex flex-col justify-center px-4 md:px-6 py-4">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: cat.dim, border: `1px solid ${cat.color}33` }}>
            <CatIcon size={18} style={{ color: cat.color }} />
          </div>
          <div>
            <div className="font-outfit font-bold text-sm text-[var(--text-primary)]">{cat.label}</div>
            <div className="text-xs text-[var(--text-muted)]">Tap a question to get started</div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {cat.prompts.map((p) => (
            <motion.button key={p} onClick={() => onSelect(p)}
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
              className="text-left text-sm px-4 py-3 rounded-xl border transition-all"
              style={{ background: "var(--bg-surface)", borderColor: "var(--border)", color: "var(--text-secondary)" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = cat.color + "55"; e.currentTarget.style.color = "var(--text-primary)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; }}>
              "{p}"
            </motion.button>
          ))}
        </div>

        <p className="text-center text-[10px] text-[var(--text-muted)] mt-6">
          Or type any question below — I know your books inside and out.
        </p>
      </div>
    </div>
  );
}

export default function AIAssistant() {
  const { formatCurrency } = useApp();
  const { totals } = useFinancials();
  const { messages, isLoading, error, sendMessage, clearMessages } = useAI();
  const [input, setInput] = useState("");
  const [inputFocused, setInputFocused] = useState(false);
  const [activeCat, setActiveCat] = useState(0);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    sendMessage(text);
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleSuggestion = (text) => {
    setInput(text);
    inputRef.current?.focus();
  };

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit"
      className="flex flex-col h-screen" style={{ background: "var(--bg-void)" }}>

      <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b flex-shrink-0"
        style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "var(--teal-dim)", border: "1px solid rgba(0,255,209,0.2)" }}>
            <Sparkles size={17} style={{ color: "var(--teal)" }} />
          </div>
          <div>
            <div className="font-outfit font-bold text-[var(--text-primary)] text-sm leading-tight">LedgerLift AI</div>
            <div className="text-[10px] text-[var(--text-muted)]">Advisor · Tutor · Analyst</div>
          </div>
        </div>
        {messages.length > 0 && (
          <button onClick={clearMessages}
            className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors px-3 py-1.5 rounded-lg hover:bg-[var(--bg-raised)]">
            <Trash2 size={13} /> New chat
          </button>
        )}
      </div>

      <div className="border-b flex-shrink-0" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
        <FinancialSnapshot totals={totals} formatCurrency={formatCurrency} />
      </div>

      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <EmptyState onSelect={handleSuggestion} activeCat={activeCat} setActiveCat={setActiveCat} />
        ) : (
          <div className="px-4 md:px-6 py-4 space-y-4">
            {messages.map((msg, i) => <ChatBubble key={i} msg={msg} index={i} />)}
            {isLoading && <TypingIndicator />}
            {error && (
              <div className="text-sm px-4 py-3 rounded-xl border"
                style={{ background: "rgba(255,59,59,0.08)", borderColor: "rgba(255,59,59,0.2)", color: "var(--danger)" }}>
                ⚠️ {error}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="flex-shrink-0 px-4 md:px-6 py-4 border-t"
        style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
        <div className="flex items-end gap-3 rounded-2xl px-4 py-3 transition-all duration-200"
          style={{ background: "var(--bg-raised)", border: `1px solid ${inputFocused ? "var(--teal)" : "var(--border)"}`, boxShadow: inputFocused ? "var(--teal-glow)" : "none" }}>
          <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey} onFocus={() => setInputFocused(true)} onBlur={() => setInputFocused(false)}
            placeholder="Ask anything — finances, taxes, or concepts…" rows={1}
            className="flex-1 bg-transparent text-sm resize-none max-h-32 leading-relaxed"
            style={{ color: "var(--text-primary)", fontFamily: "Outfit, sans-serif", outline: "none" }} />
          <button onClick={handleSend} disabled={!input.trim() || isLoading}
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 disabled:opacity-40"
            style={{ background: input.trim() ? "var(--teal)" : "var(--bg-surface)", color: input.trim() ? "var(--bg-void)" : "var(--text-muted)", boxShadow: input.trim() ? "var(--teal-glow)" : "none" }}>
            <Send size={15} />
          </button>
        </div>
        <p className="text-center text-[10px] text-[var(--text-muted)] mt-2">
          AI can make mistakes. Verify important financial decisions with a professional.
        </p>
      </div>
    </motion.div>
  );
}
