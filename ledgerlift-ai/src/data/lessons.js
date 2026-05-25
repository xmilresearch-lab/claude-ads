export const lessons = [
  {
    id: 1,
    title: "What is Bookkeeping?",
    description: "Learn the basics of tracking money in your business.",
    estimatedTime: "5 min",
    icon: "📚",
    screens: [
      {
        type: "content",
        heading: "What is Bookkeeping?",
        body: "Bookkeeping is the process of recording all financial transactions in your business. Think of it like keeping a diary — but instead of writing about your day, you're writing down every dollar that comes in and goes out.",
      },
      {
        type: "content",
        heading: "Why Does It Matter?",
        body: "Without bookkeeping, you have no idea if your business is making money. It helps you pay the right amount of taxes, spot problems early, and make smart business decisions. It's the foundation of a healthy business.",
      },
      {
        type: "content",
        heading: "The Two Main Records",
        body: "Every bookkeeping system tracks two things:\n\n• **Income** — money coming INTO your business (from sales, clients, etc.)\n• **Expenses** — money going OUT of your business (rent, supplies, software, etc.)",
      },
      {
        type: "quiz",
        scenario: "Sarah runs a small bakery. She sells 50 cupcakes at $3 each and spends $40 on ingredients.",
        question: "What should Sarah record in her bookkeeping?",
        options: [
          "Only the $150 in sales",
          "Only the $40 in expenses",
          "Both the $150 income AND the $40 expense",
          "Nothing — she only needs to track monthly totals",
        ],
        correct: 2,
        explanation: "Correct! Good bookkeeping records BOTH income and expenses. Sarah earned $150 and spent $40, so her profit for this batch is $110. Recording both gives her the full picture.",
      },
      {
        type: "content",
        heading: "You're Ready!",
        body: "Bookkeeping doesn't have to be complicated. LedgerLift AI helps you record transactions in seconds and makes sense of it all automatically. You've taken the first step!",
      },
    ],
  },
  {
    id: 2,
    title: "Income vs Expenses",
    description: "Understand the difference and why both matter.",
    estimatedTime: "5 min",
    icon: "⚖️",
    screens: [
      {
        type: "content",
        heading: "Income = Money In",
        body: "Income is any money your business receives. This includes payments from clients, product sales, consulting fees, or even interest on a business savings account. Every dollar that enters your business is income.",
      },
      {
        type: "content",
        heading: "Expenses = Money Out",
        body: "Expenses are costs you pay to run your business. Rent, software subscriptions, marketing, supplies, contractor payments — anything you spend money on to operate is an expense.",
      },
      {
        type: "content",
        heading: "Profit = Income − Expenses",
        body: "The most important number in your business is your profit. It's simple: take all your income, subtract all your expenses, and what's left is your profit. If expenses are MORE than income, you have a loss.",
      },
      {
        type: "quiz",
        scenario: "Marcus runs a photography business. This month: he earned $4,000 from photo shoots, paid $800 for camera gear, and spent $200 on editing software.",
        question: "What is Marcus's profit for the month?",
        options: [
          "$4,000 — only count income",
          "$3,200 — subtract the $800 gear",
          "$3,000 — subtract both the gear and software",
          "$5,000 — add everything together",
        ],
        correct: 2,
        explanation: "Correct! Profit = Income − All Expenses. $4,000 − $800 − $200 = $3,000. Marcus made $3,000 profit this month. Both expenses must be subtracted.",
      },
      {
        type: "content",
        heading: "Track Both, Always",
        body: "Many business owners only track income — big mistake! Tracking expenses lets you find savings, deduct them from taxes, and understand your true profit margin. LedgerLift AI makes tracking both effortless.",
      },
    ],
  },
  {
    id: 3,
    title: "Accounts Payable & Receivable",
    description: "Master the art of tracking what you owe and what you're owed.",
    estimatedTime: "5 min",
    icon: "🔄",
    screens: [
      {
        type: "content",
        heading: "Accounts Receivable",
        body: "Accounts Receivable (AR) is money that customers OWE you. When you complete a project and send an invoice but haven't been paid yet — that's AR. It's money you've earned but haven't received.",
      },
      {
        type: "content",
        heading: "Accounts Payable",
        body: "Accounts Payable (AP) is money YOU owe to others. If you received a service or product but haven't paid for it yet — that's AP. For example, if your supplier delivers goods and you'll pay next month.",
      },
      {
        type: "content",
        heading: "Why They Matter",
        body: "Watching AR helps you chase overdue payments before they become a problem. Watching AP helps you plan cash flow and avoid late fees. Together, they tell you if you'll have enough cash next month.",
      },
      {
        type: "quiz",
        scenario: "Lisa is a graphic designer. She finished a logo project worth $2,000 and sent the invoice. The client hasn't paid yet. She also ordered a new laptop for $1,500 that she'll pay for next week.",
        question: "How should Lisa categorize these?",
        options: [
          "Both are Accounts Receivable",
          "Both are Accounts Payable",
          "$2,000 is AR (owed to her), $1,500 is AP (she owes)",
          "$2,000 is AP, $1,500 is AR",
        ],
        correct: 2,
        explanation: "Correct! The $2,000 invoice is Accounts Receivable — the client owes Lisa. The $1,500 laptop she'll pay later is Accounts Payable — Lisa owes the supplier. AR = owed to you, AP = you owe others.",
      },
      {
        type: "content",
        heading: "Keep Cash Flowing",
        body: "The goal is to collect AR fast and manage AP wisely. LedgerLift AI tracks your outstanding invoices and bills, sending you alerts so nothing slips through the cracks.",
      },
    ],
  },
  {
    id: 4,
    title: "Reading a Profit & Loss",
    description: "Decode your most important financial report.",
    estimatedTime: "5 min",
    icon: "📊",
    screens: [
      {
        type: "content",
        heading: "What is a P&L?",
        body: "A Profit & Loss statement (also called an Income Statement) is a report that shows your total income, total expenses, and net profit over a specific time period — usually a month, quarter, or year.",
      },
      {
        type: "content",
        heading: "The Structure",
        body: "A P&L has three main sections:\n\n**Revenue** — All money earned\n**Expenses** — All money spent (organized by category)\n**Net Profit/Loss** — Revenue minus Expenses\n\nIf Net Profit is positive, you made money. If negative, you had a loss.",
      },
      {
        type: "content",
        heading: "Reading the Numbers",
        body: "Look for trends: Is income growing month over month? Are expenses creeping up? Is your profit margin (profit ÷ income × 100%) healthy? Most service businesses aim for 20–40% profit margins.",
      },
      {
        type: "quiz",
        scenario: "Jordan's P&L shows: Revenue $8,500 | Expenses: Marketing $1,200, Software $300, Contractor $2,000, Office $500 | Total Expenses: $4,000",
        question: "What is Jordan's net profit and profit margin?",
        options: [
          "Net profit $4,500 — about 53% margin",
          "Net profit $8,500 — 100% margin",
          "Net profit $4,000 — 47% margin",
          "Net profit $3,000 — 35% margin",
        ],
        correct: 0,
        explanation: "Correct! $8,500 − $4,000 = $4,500 net profit. Margin = $4,500 ÷ $8,500 × 100 = 52.9%, roughly 53%. That's a healthy profit margin for a service business!",
      },
      {
        type: "content",
        heading: "Your P&L in LedgerLift",
        body: "LedgerLift AI generates your P&L automatically from your logged transactions. Go to the Reports tab anytime to see your plain-English P&L breakdown. No accounting degree required.",
      },
    ],
  },
  {
    id: 5,
    title: "Tax Basics for Small Business",
    description: "Understand deductions and avoid surprises at tax time.",
    estimatedTime: "5 min",
    icon: "🧾",
    screens: [
      {
        type: "content",
        heading: "What Are Business Taxes?",
        body: "As a business owner, you pay taxes on your PROFIT — not your total income. This is great news: every legitimate business expense you track reduces your taxable income, which means you pay less tax.",
      },
      {
        type: "content",
        heading: "Common Deductible Expenses",
        body: "These are often tax-deductible:\n\n• Home office (if you work from home)\n• Business travel and mileage\n• Software and subscriptions\n• Marketing and advertising\n• Professional development\n• Equipment and supplies\n\n*Always consult a tax professional for your situation.*",
      },
      {
        type: "content",
        heading: "The Golden Rule: Keep Records",
        body: "The IRS can audit you for up to 3 years. Keep receipts for every deductible expense. LedgerLift AI stores your expense records digitally so you're always audit-ready without the stress.",
      },
      {
        type: "quiz",
        scenario: "Alex earned $60,000 this year and had $20,000 in documented business expenses. Their tax rate is 25%.",
        question: "How much does Alex owe in taxes?",
        options: [
          "$15,000 — 25% of $60,000 total income",
          "$10,000 — 25% of $40,000 profit",
          "$20,000 — 25% of the expenses only",
          "$5,000 — expenses reduce the rate, not the base",
        ],
        correct: 1,
        explanation: "Correct! Taxes are on PROFIT, not income. $60,000 − $20,000 expenses = $40,000 taxable profit. 25% × $40,000 = $10,000 in taxes. By tracking expenses, Alex saved $5,000 compared to paying tax on full income!",
      },
      {
        type: "content",
        heading: "Stay Ready Year-Round",
        body: "Don't scramble at tax time. LedgerLift AI categorizes your expenses, generates tax-ready reports, and highlights your biggest deductions all year long. You'll walk into tax season with confidence.",
      },
    ],
  },
];
