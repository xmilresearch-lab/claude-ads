import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Trash2, Sparkles } from "lucide-react";
import { useAI } from "../hooks/useAI";

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
  exit:    { opacity: 0, y: -10, transition: { duration: 0.2 } },
};

const SUGGESTED = [
  "What is accounts payable?",
  "Am I spending too much on marketing?",
  "Explain my profit & loss in simple terms",
  "What expenses are tax deductible?",
];

function ChatBubble({ msg, index }) {
  const isUser = msg.role === "user";
  return (
    <motion.div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: index * 0.05 }}>
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-1 ${
        isUser ? "bg-[var(--orange-dim)] border border-[rgba(255,107,0,0.2)]" : "bg-[var(--teal-dim)] border border-[rgba(0,255,209,0.2)]"
      }`}>
        {isUser ? <User size={14} style={{ color: "var(--orange)" }} /> : <Bot size={14} style={{ color: "var(--teal)" }} />}
      </div>
      <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${isUser ? "rounded-tr-sm" : "rounded-tl-sm border-l-2"}`}
        style={isUser
          ? { background: "rgba(255,107,0,0.12)", border: "1px solid rgba(255,107,0,0.2)", color: "var(--text-primary)" }
          : { background: "rgba(0,255,209,0.06)", borderColor: "var(--teal)", color: "var(--text-primary)" }}>
        {msg.content.split("\n").map((line, i) => <p key={i} className={i > 0 ? "mt-2" : ""}>{line}</p>)}
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
      <div className="rounded-2xl rounded-tl-sm border-l-2 px-4 py-3 flex items-center gap-1.5"
        style={{ background: "rgba(0,255,209,0.06)", borderColor: "var(--teal)" }}>
        {[0, 1, 2].map(i => (
          <motion.span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--teal)" }}
            animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }} />
        ))}
      </div>
    </div>
  );
}

export default function AIAssistant() {
  const { messages, isLoading, error, sendMessage, clearMessages } = useAI();
  const [input, setInput] = useState("");
  const [inputFocused, setInputFocused] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isLoading]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    sendMessage(text);
  };

  const handleKey = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } };
  const handleSuggestion = (text) => { setInput(text); inputRef.current?.focus(); };

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit"
      className="flex flex-col h-screen" style={{ background: "var(--bg-void)" }}>

      <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b flex-shrink-0"
        style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "var(--teal-dim)", border: "1px solid rgba(0,255,209,0.2)" }}>
            <Bot size={20} style={{ color: "var(--teal)" }} />
          </div>
          <div>
            <div className="font-outfit font-bold text-[var(--text-primary)] text-base leading-tight">LedgerLift AI</div>
            <div className="text-xs text-[var(--text-muted)]">Your Bookkeeping Assistant</div>
          </div>
        </div>
        {messages.length > 0 && (
          <button onClick={clearMessages}
            className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors px-3 py-1.5 rounded-lg hover:bg-[var(--bg-raised)]">
            <Trash2 size={14} /> Clear
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <motion.div className="flex flex-col items-center justify-center h-full gap-6 pb-8"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
              style={{ background: "var(--teal-dim)", border: "1px solid rgba(0,255,209,0.2)", boxShadow: "var(--teal-glow)" }}>
              <Sparkles size={36} style={{ color: "var(--teal)" }} />
            </div>
            <div className="text-center">
              <h2 className="font-outfit font-bold text-xl text-[var(--text-primary)] mb-2">Ask me anything about your finances</h2>
              <p className="text-sm text-[var(--text-secondary)] max-w-sm">I explain everything in plain English — no accounting degree required.</p>
            </div>
            <div className="w-full max-w-md grid grid-cols-1 gap-2">
              {SUGGESTED.map((s) => (
                <button key={s} onClick={() => handleSuggestion(s)}
                  className="text-left text-sm px-4 py-3 rounded-xl border transition-all hover:border-[var(--border-hover)] hover:bg-[var(--bg-raised)]"
                  style={{ background: "var(--bg-surface)", borderColor: "var(--border)", color: "var(--text-secondary)" }}>
                  "{s}"
                </button>
              ))}
            </div>
          </motion.div>
        )}
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

      <div className="flex-shrink-0 px-4 md:px-6 py-4 border-t"
        style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
        <div className="flex items-end gap-3 rounded-2xl px-4 py-3 transition-all duration-200"
          style={{ background: "var(--bg-raised)", border: `1px solid ${inputFocused ? "var(--teal)" : "var(--border)"}`, boxShadow: inputFocused ? "var(--teal-glow)" : "none" }}>
          <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey} onFocus={() => setInputFocused(true)} onBlur={() => setInputFocused(false)}
            placeholder="Ask LedgerLift AI anything..." rows={1}
            className="flex-1 bg-transparent text-sm resize-none max-h-32 leading-relaxed"
            style={{ color: "var(--text-primary)", fontFamily: "Outfit, sans-serif", outline: "none" }} />
          <button onClick={handleSend} disabled={!input.trim() || isLoading}
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 disabled:opacity-40"
            style={{ background: input.trim() ? "var(--teal)" : "var(--bg-surface)", color: input.trim() ? "var(--bg-void)" : "var(--text-muted)", boxShadow: input.trim() ? "var(--teal-glow)" : "none" }}>
            <Send size={16} />
          </button>
        </div>
        <p className="text-center text-[10px] text-[var(--text-muted)] mt-2">LedgerLift AI can make mistakes. Always verify important financial decisions.</p>
      </div>
    </motion.div>
  );
}
