import { createContext, useContext, useReducer } from "react";
import { mockExpenses } from "../data/mockExpenses";
import { mockIncome } from "../data/mockIncome";

const AppContext = createContext(null);

const initialState = {
  businessName: "My Business",
  userName: "there",
  expenses: mockExpenses,
  income: mockIncome,
  onboardingComplete: false,
  currency: "USD",
};

function appReducer(state, action) {
  switch (action.type) {
    case "SET_BUSINESS":
      return { ...state, businessName: action.payload.name, userName: action.payload.user };
    case "COMPLETE_ONBOARDING":
      return { ...state, onboardingComplete: true };
    case "ADD_EXPENSE":
      return { ...state, expenses: [action.payload, ...state.expenses] };
    case "DELETE_EXPENSE":
      return { ...state, expenses: state.expenses.filter(e => e.id !== action.payload) };
    case "ADD_INCOME":
      return { ...state, income: [action.payload, ...state.income] };
    case "SET_CURRENCY":
      return { ...state, currency: action.payload };
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: state.currency }).format(amount);

  return (
    <AppContext.Provider value={{ state, dispatch, formatCurrency }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
