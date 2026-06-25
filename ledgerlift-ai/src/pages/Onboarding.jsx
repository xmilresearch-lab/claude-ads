import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, ArrowRight, Check } from "lucide-react";
import { useApp } from "../context/AppContext";
import Button from "../components/ui/Button";

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
};

const stepVariants = {
  initial: { opacity: 0, x: 32 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.35, ease: "easeOut" } },
  exit:    { opacity: 0, x: -32, transition: { duration: 0.2 } },
};

const BUSINESS_TYPES = ["Freelancer", "Retail", "Service", "Food & Bev", "Other"];

const GOALS = [
  { icon: "😤", label: "I never know where my money goes" },
  { icon: "📄", label: "Tax time is a nightmare" },
  { icon: "🧾", label: "I lose track of receipts and invoices" },
  { icon: "📉", label: "I don't know if I'm actually profitable" },
];

const TOOLS = ["QuickBooks", "Xero", "Wave", "Excel", "Google Sheets", "Nothing yet"];

const CONFETTI = Array.from({ length: 16 }, (_, i) => {
  const angle = (i / 16) * 360;
  const rad = (angle * Math.PI) / 180;
  const dist = 60 + (i % 3) * 30;
  return {
    id: i,
    x: Math.cos(rad) * dist,
    y: Math.sin(rad) * dist,
    color: i % 3 === 0 ? "#00FFD1" : i % 3 === 1 ? "#FF6B00" : "#7AADA0",
    delay: (i * 0.05).toFixed(2) + "s",
    rotate: (i * 47) % 360,
  };
});

function ConfettiBurst() {
  return (
    <div className="relative flex items-center justify-center w-32 h-32 mx-auto mb-6">
      {CONFETTI.map((c) => (
        <div key={c.id} className="confetti-piece"
          style={{ background: c.color, left: "50%", top: "50%", transform: `translate(${c.x}px, ${c.y}px) rotate(${c.rotate}deg)`, animationDelay: c.delay }} />
      ))}
      <div className="relative z-10 w-20 h-20 rounded-full flex items-center justify-center text-4xl"
        style={{ background: "var(--teal-dim)", border: "2px solid rgba(0,255,209,0.3)", boxShadow: "var(--teal-glow)" }}>
        🚀
      </div>
    </div>
  );
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { dispatch } = useApp();
  const [currentStep, setCurrentStep] = useState(0);
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [goal, setGoal] = useState("");
  const [tools, setTools] = useState([]);
  const totalSteps = 4;

  function goNext() { if (currentStep < totalSteps - 1) setCurrentStep((s) => s + 1); }
  function toggleTool(tool) { setTools((prev) => prev.includes(tool) ? prev.filter((t) => t !== tool) : [...prev, tool]); }
  function handleFinish() {
    dispatch({ type: "SET_BUSINESS", payload: { name: businessName || "My Business", user: businessName.split(" ")[0] || "there" } });
    dispatch({ type: "COMPLETE_ONBOARDING" });
    navigate("/dashboard");
  }

  const progressPercent = (currentStep / (totalSteps - 1)) * 100;

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit"
      className="min-h-screen flex flex-col" style={{ background: "var(--bg-void)" }}>
      <header className="px-6 pt-6 pb-4 max-w-2xl mx-auto w-full">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--teal)", boxShadow: "var(--teal-glow)" }}>
            <Bot size={16} style={{ color: "var(--bg-void)" }} />
          </div>
          <span className="font-outfit font-extrabold" style={{ color: "var(--text-primary)" }}>
            LedgerLift <span style={{ color: "var(--teal)" }}>AI</span>
          </span>
        </div>
        <div className="w-full rounded-full overflow-hidden h-1.5" style={{ background: "var(--bg-raised)" }}>
          <motion.div className="h-full rounded-full" style={{ background: "var(--teal)", boxShadow: "0 0 10px rgba(0,255,209,0.4)" }}
            animate={{ width: `${progressPercent}%` }} transition={{ duration: 0.5, ease: "easeOut" }} />
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>Step {currentStep + 1} of {totalSteps}</span>
          <span className="text-xs" style={{ color: "var(--teal)" }}>{Math.round(progressPercent)}%</span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">
            {currentStep === 0 && (
              <motion.div key="step-0" variants={stepVariants} initial="initial" animate="animate" exit="exit">
                <h1 className="text-4xl md:text-5xl font-extrabold mb-3" style={{ color: "var(--text-primary)", fontFamily: "Outfit, sans-serif", letterSpacing: "-0.03em" }}>Hey there! 👋</h1>
                <p className="mb-8 text-lg" style={{ color: "var(--text-secondary)" }}>Let's set up your LedgerLift account.</p>
                <div className="flex flex-col gap-5">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--teal)", letterSpacing: "0.15em" }}>Business Name</label>
                    <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. Sunrise Bakery"
                      className="w-full rounded-xl px-4 py-3 text-base font-outfit transition-all duration-200"
                      style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)", outline: "none" }}
                      onFocus={(e) => { e.target.style.borderColor = "var(--teal)"; e.target.style.boxShadow = "var(--teal-glow)"; }}
                      onBlur={(e) => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--teal)", letterSpacing: "0.15em" }}>Business Type</label>
                    <select value={businessType} onChange={(e) => setBusinessType(e.target.value)}
                      className="w-full rounded-xl px-4 py-3 text-base font-outfit transition-all duration-200 appearance-none cursor-pointer"
                      style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: businessType ? "var(--text-primary)" : "var(--text-muted)", outline: "none" }}
                      onFocus={(e) => { e.target.style.borderColor = "var(--teal)"; e.target.style.boxShadow = "var(--teal-glow)"; }}
                      onBlur={(e) => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }}>
                      <option value="" disabled style={{ color: "var(--text-muted)" }}>Select a type...</option>
                      {BUSINESS_TYPES.map((t) => <option key={t} value={t} style={{ background: "var(--bg-surface)", color: "var(--text-primary)" }}>{t}</option>)}
                    </select>
                  </div>
                  <div className="pt-2">
                    <Button variant="primary" size="lg" fullWidth onClick={goNext} disabled={!businessName.trim() || !businessType}>
                      Continue <ArrowRight size={16} />
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === 1 && (
              <motion.div key="step-1" variants={stepVariants} initial="initial" animate="animate" exit="exit">
                <h1 className="text-3xl md:text-4xl font-extrabold mb-3" style={{ color: "var(--text-primary)", fontFamily: "Outfit, sans-serif", letterSpacing: "-0.02em" }}>What's your #1 bookkeeping headache?</h1>
                <p className="mb-8" style={{ color: "var(--text-secondary)" }}>We'll tailor LedgerLift around what matters most to you.</p>
                <div className="flex flex-col gap-3 mb-8">
                  {GOALS.map((g) => {
                    const selected = goal === g.label;
                    return (
                      <motion.button key={g.label} type="button" onClick={() => setGoal(g.label)} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                        className="w-full text-left flex items-center gap-4 rounded-2xl px-5 py-4 transition-all duration-200"
                        style={{ background: selected ? "var(--teal-dim)" : "var(--bg-surface)", border: `1px solid ${selected ? "var(--teal)" : "var(--border)"}`, boxShadow: selected ? "var(--teal-glow)" : "none" }}>
                        <span className="text-2xl">{g.icon}</span>
                        <span className="font-outfit font-semibold text-sm flex-1" style={{ color: selected ? "var(--teal)" : "var(--text-primary)" }}>{g.label}</span>
                        {selected && <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--teal)" }}><Check size={12} style={{ color: "var(--bg-void)" }} /></span>}
                      </motion.button>
                    );
                  })}
                </div>
                <Button variant="primary" size="lg" fullWidth onClick={goNext} disabled={!goal}>Continue <ArrowRight size={16} /></Button>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div key="step-2" variants={stepVariants} initial="initial" animate="animate" exit="exit">
                <h1 className="text-3xl md:text-4xl font-extrabold mb-3" style={{ color: "var(--text-primary)", fontFamily: "Outfit, sans-serif", letterSpacing: "-0.02em" }}>Do you currently use any of these?</h1>
                <p className="mb-8" style={{ color: "var(--text-secondary)" }}>Select all that apply — we'll help you migrate or start fresh.</p>
                <div className="flex flex-wrap gap-3 mb-8">
                  {TOOLS.map((tool) => {
                    const selected = tools.includes(tool);
                    return (
                      <motion.button key={tool} type="button" onClick={() => toggleTool(tool)} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                        className="px-5 py-2.5 rounded-full font-outfit font-semibold text-sm transition-all duration-200"
                        style={{ background: selected ? "var(--teal)" : "var(--bg-surface)", border: `1px solid ${selected ? "var(--teal)" : "var(--border)"}`, color: selected ? "var(--bg-void)" : "var(--text-secondary)", boxShadow: selected ? "var(--teal-glow)" : "none" }}>
                        {tool}
                      </motion.button>
                    );
                  })}
                </div>
                <Button variant="primary" size="lg" fullWidth onClick={goNext}>Continue <ArrowRight size={16} /></Button>
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div key="step-3" variants={stepVariants} initial="initial" animate="animate" exit="exit" className="text-center">
                <ConfettiBurst />
                <h1 className="text-3xl md:text-4xl font-extrabold mb-4" style={{ color: "var(--text-primary)", fontFamily: "Outfit, sans-serif", letterSpacing: "-0.02em" }}>
                  You're all set, <span style={{ color: "var(--teal)" }}>{businessName.split(" ")[0] || "there"}</span>! 🚀
                </h1>
                <p className="text-lg mb-2" style={{ color: "var(--text-secondary)" }}>Your bookkeeping dashboard is ready.</p>
                <p className="text-sm mb-10" style={{ color: "var(--text-muted)" }}>LedgerLift is configured for <span style={{ color: "var(--text-secondary)" }}>{businessName}</span>. Let's get your finances clear.</p>
                <div className="flex flex-wrap gap-2 justify-center mb-10">
                  {businessType && <span className="px-3 py-1 rounded-full text-xs font-outfit font-semibold" style={{ background: "var(--teal-dim)", border: "1px solid rgba(0,255,209,0.2)", color: "var(--teal)" }}>{businessType}</span>}
                  {tools.map((t) => <span key={t} className="px-3 py-1 rounded-full text-xs font-outfit font-semibold" style={{ background: "var(--bg-raised)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>{t}</span>)}
                </div>
                <Button variant="primary" size="lg" fullWidth onClick={handleFinish}>Go to My Dashboard <ArrowRight size={16} /></Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </motion.div>
  );
}
