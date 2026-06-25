export const mockExpenses = [
  { id: 1, description: "Adobe Creative Cloud", category: "Software",  amount: 54.99,  date: "2025-05-20", icon: "💻" },
  { id: 2, description: "Coffee Meeting - Client", category: "Food",     amount: 28.50,  date: "2025-05-19", icon: "☕" },
  { id: 3, description: "Office Supplies - Staples", category: "Office",   amount: 87.23,  date: "2025-05-17", icon: "📎" },
  { id: 4, description: "Google Ads",             category: "Marketing", amount: 200.00, date: "2025-05-15", icon: "📣" },
  { id: 5, description: "Uber to Client Site",    category: "Travel",    amount: 22.40,  date: "2025-05-14", icon: "🚗" },
  { id: 6, description: "Slack Pro",              category: "Software",  amount: 12.50,  date: "2025-05-12", icon: "💬" },
  { id: 7, description: "Business Lunch",         category: "Food",      amount: 64.00,  date: "2025-05-10", icon: "🍽️" },
  { id: 8, description: "AWS Hosting",            category: "Software",  amount: 43.20,  date: "2025-05-08", icon: "☁️" },
  { id: 9, description: "LinkedIn Premium",       category: "Marketing", amount: 39.99,  date: "2025-05-05", icon: "💼" },
  { id: 10, description: "Parking - Downtown",    category: "Travel",    amount: 18.00,  date: "2025-05-03", icon: "🅿️" },
];

export const monthlyData = [
  { month: "Dec", income: 9200,  expenses: 3100 },
  { month: "Jan", income: 10500, expenses: 3800 },
  { month: "Feb", income: 8900,  expenses: 2900 },
  { month: "Mar", income: 11200, expenses: 4100 },
  { month: "Apr", income: 10800, expenses: 3600 },
  { month: "May", income: 12450, expenses: 4230 },
];

export const categoryColors = {
  Software:  "#00FFD1",
  Food:      "#FF6B00",
  Office:    "#7AADA0",
  Marketing: "#FF6B00",
  Travel:    "#00FFD1",
  Other:     "#3D6660",
};
