import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Bot, ArrowRight, Zap, BarChart3, MessageSquare } from "lucide-react";
import Navbar from "../components/layout/Navbar";

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
};

const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  left: `${5 + (i * 4.7) % 90}%`,
  top: `${10 + (i * 7.3) % 80}%`,
  animationDelay: `${(i * 0.8) % 6}s`,
  animationDuration: `${6 + (i * 1.1) % 8}s`,
}));

const FEATURES = [
  { icon: "💼", title: "Track Every Dollar", desc: "Log income and expenses in seconds. Categorized automatically, always ready when you need it." },
  { icon: "🤖", title: "AI That Explains It", desc: "Ask plain-English questions, get plain-English answers — no accounting degree required." },
  { icon: "📊", title: "Reports on Demand", desc: "Profit & loss, cash flow, tax-ready summaries — generated instantly, any time." },
];

const STEPS = [
  "Connect your accounts or upload receipts",
  "LedgerLift AI categorizes everything automatically",
  "Get clear reports and financial insights any time",
];

const TESTIMONIALS = [
  { quote: "I used to dread tax season. Now I just export from LedgerLift and hand it to my accountant.", name: "Maria S.", role: "Bakery Owner" },
  { quote: "Finally understand if my business is actually making money.", name: "James T.", role: "Freelance Developer" },
  { quote: "Saved me $200/month in bookkeeper fees in the first week.", name: "Priya K.", role: "Online Retailer" },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
};

export default function Landing() {
  const demoRef = useRef(null);

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit"
      style={{ background: "var(--bg-void)", color: "var(--text-primary)" }}>
      <Navbar />

      <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        {PARTICLES.map((p) => (
          <div key={p.id} className="particle" style={{ left: p.left, top: p.top, animationDelay: p.animationDelay, animationDuration: p.animationDuration }} />
        ))}
        <div aria-hidden className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(ellipse at center, rgba(0,255,209,0.12) 0%, rgba(0,255,209,0.04) 40%, transparent 70%)", filter: "blur(40px)" }} />

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-full text-xs font-outfit font-semibold uppercase tracking-widest"
            style={{ background: "var(--teal-dim)", border: "1px solid rgba(0,255,209,0.25)", color: "var(--teal)" }}>
            <Zap size={12} /> AI-Powered Bookkeeping for Small Business
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.2 }}
            className="mb-6" style={{ background: "linear-gradient(135deg, #F0FAF8 0%, #00FFD1 60%, #7AADA0 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            Your Books. Done.
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.32 }}
            className="text-lg md:text-xl max-w-2xl mx-auto mb-10" style={{ color: "var(--text-secondary)" }}>
            LedgerLift AI handles your bookkeeping so you can focus on running your business.
            Track income, expenses, and profitability — all in one place, explained in plain English.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.44 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/onboarding"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-outfit font-bold text-base transition-all hover:brightness-110"
              style={{ background: "var(--teal)", color: "var(--bg-void)", boxShadow: "var(--teal-glow)" }}>
              Get Started Free <ArrowRight size={16} />
            </Link>
            <a href="#demo"
              onClick={(e) => { e.preventDefault(); demoRef.current?.scrollIntoView({ behavior: "smooth" }); }}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-outfit font-semibold text-base transition-all"
              style={{ background: "transparent", border: "1px solid rgba(255,107,0,0.35)", color: "var(--orange)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--orange-dim)"; e.currentTarget.style.borderColor = "var(--orange)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "rgba(255,107,0,0.35)"; }}>
              See How It Works
            </a>
          </motion.div>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.6 }}
            className="mt-6 text-xs" style={{ color: "var(--text-muted)" }}>
            No credit card required · Setup in 2 minutes · Cancel any time
          </motion.p>
        </div>

        <div aria-hidden className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
          style={{ background: "linear-gradient(to bottom, transparent, var(--bg-void))" }} />
      </section>

      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="section-label mb-4">Features</p>
            <h2>Everything your books need</h2>
            <p className="mt-4 max-w-xl mx-auto">Built for founders, freelancers, and small business owners who want clarity — not complexity.</p>
          </div>
          <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-6" variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}>
            {FEATURES.map((f) => (
              <motion.div key={f.title} variants={cardVariants} className="group rounded-2xl p-7 transition-all duration-300"
                style={{ background: "rgba(0,255,209,0.03)", border: "1px solid var(--border)" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-hover)"; e.currentTarget.style.background = "rgba(0,255,209,0.05)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "rgba(0,255,209,0.03)"; }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-5 transition-all duration-300 group-hover:scale-110"
                  style={{ background: "var(--teal-dim)", border: "1px solid rgba(0,255,209,0.2)", filter: "drop-shadow(0 0 8px rgba(0,255,209,0.3))" }}>
                  {f.icon}
                </div>
                <h3 className="mb-3">{f.title}</h3>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section id="demo" ref={demoRef} className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="section-label mb-4">How It Works</p>
            <h2>Up and running in minutes</h2>
            <p className="mt-4 max-w-lg mx-auto">No accountant, no setup fees, no jargon. Just your financial picture, finally clear.</p>
          </div>
          <motion.div className="flex flex-col gap-6" variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}>
            {STEPS.map((step, i) => (
              <motion.div key={i} variants={cardVariants} className="flex items-start gap-6 rounded-2xl p-6"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-outfit font-extrabold text-sm"
                  style={{ background: "var(--orange-dim)", border: "1px solid rgba(255,107,0,0.35)", color: "var(--orange)", boxShadow: "0 0 16px rgba(255,107,0,0.2)" }}>
                  {i + 1}
                </div>
                <div className="pt-1">
                  <p className="text-base font-outfit font-semibold" style={{ color: "var(--text-primary)" }}>{step}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section id="testimonials" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="section-label mb-4">Testimonials</p>
            <h2>Real owners, real results</h2>
          </div>
          <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-6" variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}>
            {TESTIMONIALS.map((t) => (
              <motion.div key={t.name} variants={cardVariants} className="rounded-2xl p-7 flex flex-col gap-5"
                style={{ background: "rgba(0,255,209,0.03)", border: "1px solid var(--border)" }}>
                <div className="flex gap-1">{Array.from({ length: 5 }).map((_, i) => <span key={i} style={{ color: "var(--teal)" }}>★</span>)}</div>
                <p className="text-sm leading-relaxed flex-1" style={{ color: "var(--text-secondary)" }}>"{t.quote}"</p>
                <div>
                  <p className="font-outfit font-bold text-sm" style={{ color: "var(--text-primary)" }}>{t.name}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{t.role}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="py-24 px-6">
        <motion.div initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true, amount: 0.4 }} transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto rounded-3xl p-12 text-center relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, rgba(0,255,209,0.18) 0%, rgba(0,255,209,0.06) 50%, rgba(0,255,209,0.02) 100%)", border: "1px solid rgba(0,255,209,0.25)", boxShadow: "var(--teal-glow)" }}>
          <div aria-hidden className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[200px] rounded-full pointer-events-none"
            style={{ background: "radial-gradient(ellipse, rgba(0,255,209,0.12) 0%, transparent 70%)", filter: "blur(30px)" }} />
          <div className="relative z-10">
            <h2 className="mb-4" style={{ color: "var(--teal)" }}>Start free. No credit card. No accountant.</h2>
            <p className="mb-8 max-w-md mx-auto">Join thousands of small business owners who finally understand their finances.</p>
            <Link to="/onboarding"
              className="inline-flex items-center gap-2 px-10 py-4 rounded-xl font-outfit font-bold text-lg transition-all hover:brightness-110 hover:scale-105"
              style={{ background: "var(--teal)", color: "var(--bg-void)", boxShadow: "var(--teal-glow)" }}>
              Create My Free Account <ArrowRight size={18} />
            </Link>
          </div>
        </motion.div>
      </section>

      <footer className="py-12 px-6" style={{ borderTop: "1px solid var(--border)", background: "var(--bg-surface)" }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--teal)", boxShadow: "var(--teal-glow)" }}>
                <Bot size={16} style={{ color: "var(--bg-void)" }} />
              </div>
              <span className="font-outfit font-extrabold" style={{ color: "var(--text-primary)" }}>LedgerLift <span style={{ color: "var(--teal)" }}>AI</span></span>
            </Link>
            <nav className="flex items-center gap-6 flex-wrap justify-center">
              {["Features", "Pricing", "Blog", "Privacy", "Terms"].map((item) => (
                <a key={item} href="#" className="text-sm font-outfit transition-colors" style={{ color: "var(--text-muted)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}>{item}</a>
              ))}
            </nav>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>© 2025 LedgerLift AI</p>
          </div>
        </div>
      </footer>
    </motion.div>
  );
}
