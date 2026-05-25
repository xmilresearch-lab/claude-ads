import { Link } from "react-router-dom";
import { Bot } from "lucide-react";

export default function Navbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 glass border-b border-[var(--border)]">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "var(--teal)", boxShadow: "var(--teal-glow)" }}
          >
            <Bot size={16} className="text-void" />
          </div>
          <span className="font-outfit font-800 text-[var(--text-primary)]">
            LedgerLift <span style={{ color: "var(--teal)" }}>AI</span>
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-6">
          {["Features", "Pricing", "Blog"].map(item => (
            <a key={item} href="#" className="text-sm font-outfit text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">{item}</a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="text-sm font-outfit font-600 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors hidden md:block">Sign In</Link>
          <Link to="/onboarding" className="px-4 py-2 rounded-xl text-sm font-outfit font-700 text-void transition-all hover:brightness-110" style={{ background: "var(--teal)", boxShadow: "var(--teal-glow)" }}>Get Started Free</Link>
        </div>
      </div>
    </header>
  );
}
