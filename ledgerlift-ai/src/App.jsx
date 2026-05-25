import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { AppProvider } from "./context/AppContext";
import { AuthProvider } from "./context/AuthContext";

import Sidebar    from "./components/layout/Sidebar";
import BottomNav  from "./components/layout/BottomNav";

import Landing     from "./pages/Landing";
import Onboarding  from "./pages/Onboarding";
import Dashboard   from "./pages/Dashboard";
import Expenses    from "./pages/Expenses";
import Income      from "./pages/Income";
import Reports     from "./pages/Reports";
import AIAssistant from "./pages/AIAssistant";
import Learn       from "./pages/Learn";
import Settings    from "./pages/Settings";

const APP_ROUTES = ["/dashboard", "/expenses", "/income", "/reports", "/ai", "/learn", "/settings"];

function AppShell({ children }) {
  const { pathname } = useLocation();
  const isAppRoute = APP_ROUTES.some(r => pathname.startsWith(r));

  if (!isAppRoute) return children;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-void)" }}>
      <Sidebar />
      <BottomNav />
      <main className="page-wrapper min-h-screen">{children}</main>
    </div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/"           element={<Landing />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/dashboard"  element={<Dashboard />} />
        <Route path="/expenses"   element={<Expenses />} />
        <Route path="/income"     element={<Income />} />
        <Route path="/reports"    element={<Reports />} />
        <Route path="/ai"         element={<AIAssistant />} />
        <Route path="/learn"      element={<Learn />} />
        <Route path="/learn/:id"  element={<Learn />} />
        <Route path="/settings"   element={<Settings />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <BrowserRouter>
          <AppShell>
            <AnimatedRoutes />
          </AppShell>
        </BrowserRouter>
      </AppProvider>
    </AuthProvider>
  );
}
