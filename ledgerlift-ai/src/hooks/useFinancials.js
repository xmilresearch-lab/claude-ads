import { useMemo } from "react";
import { useApp } from "../context/AppContext";

export function useFinancials() {
  const { state } = useApp();

  const totals = useMemo(() => {
    const totalIncome   = state.income.reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = state.expenses.reduce((sum, t) => sum + t.amount, 0);
    const netProfit     = totalIncome - totalExpenses;
    const unpaidCount   = state.income.filter(i => i.status !== "Paid").length;
    return { totalIncome, totalExpenses, netProfit, unpaidCount };
  }, [state.income, state.expenses]);

  const categoryBreakdown = useMemo(() => {
    const map = {};
    state.expenses.forEach(exp => {
      map[exp.category] = (map[exp.category] || 0) + exp.amount;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [state.expenses]);

  const recentTransactions = useMemo(() => {
    const incomeRows = state.income.map(i => ({
      ...i, type: "income", description: `${i.client} — ${i.description}`,
    }));
    const expenseRows = state.expenses.map(e => ({ ...e, type: "expense" }));
    return [...incomeRows, ...expenseRows]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);
  }, [state.income, state.expenses]);

  return { totals, categoryBreakdown, recentTransactions };
}
