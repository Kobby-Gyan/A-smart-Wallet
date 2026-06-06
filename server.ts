import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { 
  Transaction, 
  AuditLog, 
  RecurringExpense, 
  BudgetLimit, 
  BudgetAlert, 
  CurrencyCode, 
  TransactionCategory, 
  WalletState 
} from "./src/types";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize AI Client
const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not set. Gemini features will run in mock mode.");
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
};

// Seed Exchange Rates (relative to USD: 1 Unit = X USD)
let currentRates: Record<CurrencyCode, number> = {
  USD: 1.0,
  EUR: 1.08,  // 1 EUR = 1.08 USD
  GBP: 1.27,  // 1 GBP = 1.27 USD
  JPY: 0.0064, // 1 JPY = 0.0064 USD
  CAD: 0.73,  // 1 CAD = 0.73 USD
  AUD: 0.66   // 1 AUD = 0.66 USD
};

// Seed Budget Limits (represented in USD internally for uniform tracking, but displays in local preferred currency)
let budgetLimitsUSD: Record<TransactionCategory, number> = {
  [TransactionCategory.FOOD]: 500,
  [TransactionCategory.TRAVEL]: 300,
  [TransactionCategory.UTILITIES]: 200,
  [TransactionCategory.ENTERTAINMENT]: 150,
  [TransactionCategory.SHOPPING]: 400,
  [TransactionCategory.INVESTMENTS]: 1000,
  [TransactionCategory.OTHER]: 200
};

// Seed Initial Transactions
let transactions: Transaction[] = [
  {
    id: "tx-1",
    amount: 120,
    currency: "USD",
    amountUSD: 120,
    category: TransactionCategory.UTILITIES,
    type: "expense",
    merchant: "Metropolitan Water & Power",
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    biometricVerified: true,
    status: "cleared"
  },
  {
    id: "tx-2",
    amount: 45.50,
    currency: "EUR",
    amountUSD: Math.round(45.50 * currentRates.EUR * 100) / 100,
    category: TransactionCategory.FOOD,
    type: "expense",
    merchant: "La Brasserie Bistrot",
    timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    biometricVerified: false,
    status: "cleared"
  },
  {
    id: "tx-3",
    amount: 3200,
    currency: "USD",
    amountUSD: 3200,
    category: TransactionCategory.OTHER,
    type: "income",
    merchant: "Google AI Inc Tech Corp",
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    biometricVerified: true,
    status: "cleared"
  },
  {
    id: "tx-4",
    amount: 18.99,
    currency: "GBP",
    amountUSD: Math.round(18.99 * currentRates.GBP * 100) / 100,
    category: TransactionCategory.ENTERTAINMENT,
    type: "expense",
    merchant: "Netflix UK Ltd",
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    biometricVerified: false,
    status: "cleared"
  },
  {
    id: "tx-5",
    amount: 85.00,
    currency: "USD",
    amountUSD: 85.00,
    category: TransactionCategory.SHOPPING,
    type: "expense",
    merchant: "Amazon.com Gateway",
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    biometricVerified: true,
    status: "cleared"
  },
  {
    id: "tx-6",
    amount: 450.00,
    currency: "USD",
    amountUSD: 450.00,
    category: TransactionCategory.INVESTMENTS,
    type: "expense",
    merchant: "Coinbase Global Brokerage",
    timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12h ago
    biometricVerified: true,
    status: "cleared"
  },
  {
    id: "tx-7",
    amount: 14200,
    currency: "JPY",
    amountUSD: Math.round(14200 * currentRates.JPY * 100) / 100,
    category: TransactionCategory.FOOD,
    type: "expense",
    merchant: "Shibuya Sushi Supreme",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2h ago
    biometricVerified: false,
    status: "cleared"
  },
  {
    id: "tx-8",
    amount: 250,
    currency: "EUR",
    amountUSD: Math.round(250 * currentRates.EUR * 100) / 100,
    category: TransactionCategory.TRAVEL,
    type: "expense",
    merchant: "Lufthansa Airlines Direct",
    timestamp: new Date().toISOString(), // Just now (pending/needs biometric verify simulation)
    biometricVerified: false,
    status: "pending"
  }
];

// Seed Audit Logs
let auditLogs: AuditLog[] = [
  {
    id: "log-1",
    timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    action: "Wallet Created",
    details: "Primary multi-currency cryptograph initialized successfully.",
    category: "security",
    status: "success"
  },
  {
    id: "log-2",
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    action: "Biometric Handshake",
    details: "Passkey biometric setup completed for Google Pixel TouchID.",
    category: "security",
    status: "success"
  },
  {
    id: "log-3",
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    action: "Currency Table Updated",
    details: "Exchange rates updated against dynamic master clock syncing.",
    category: "currency",
    status: "success"
  },
  {
    id: "log-4",
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    action: "Large Transfer Cleared",
    details: "Google AI Inc Tech Corp payroll direct deposit income $3,200 clearing.",
    category: "transaction",
    status: "success"
  },
  {
    id: "log-5",
    timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    action: "Biometric Secured Verification",
    details: "Cleared crypto-signed brokerage expense of $450 to Coinbase. Biometrics validated.",
    category: "security",
    status: "success"
  }
];

// Seed Recurring Expenses
let recurringExpenses: RecurringExpense[] = [
  {
    id: "rec-1",
    name: "Amazon Prime Subscription",
    amount: 14.99,
    currency: "USD",
    category: TransactionCategory.SHOPPING,
    frequency: "monthly",
    nextDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    active: true
  },
  {
    id: "rec-2",
    name: "Metropolitan Internet & Mesh",
    amount: 55.00,
    currency: "USD",
    category: TransactionCategory.UTILITIES,
    frequency: "monthly",
    nextDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
    active: true
  },
  {
    id: "rec-3",
    name: "Spotify Duo Music Premium",
    amount: 14.99,
    currency: "EUR",
    category: TransactionCategory.ENTERTAINMENT,
    frequency: "monthly",
    nextDate: new Date(Date.now() + 19 * 24 * 60 * 60 * 1000).toISOString(),
    active: true
  },
  {
    id: "rec-4",
    name: "Gold's Gym Membership Club",
    amount: 45.00,
    currency: "GBP",
    category: TransactionCategory.TRAVEL, // Health & Transit category mapping
    frequency: "weekly",
    nextDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    active: false
  }
];

// Wallet Settings
let preferredCurrency: CurrencyCode = "USD";
let biometricsEnabled: boolean = true;
let biometricsSetup: boolean = true;

// Quick helper to fetch spent amounts for categories in USD
function calculateSpentMapUSD(): Record<TransactionCategory, number> {
  const map: Record<TransactionCategory, number> = {
    [TransactionCategory.FOOD]: 0,
    [TransactionCategory.TRAVEL]: 0,
    [TransactionCategory.UTILITIES]: 0,
    [TransactionCategory.ENTERTAINMENT]: 0,
    [TransactionCategory.SHOPPING]: 0,
    [TransactionCategory.INVESTMENTS]: 0,
    [TransactionCategory.OTHER]: 0
  };
  
  transactions.forEach(t => {
    if (t.type === "expense" && t.status === "cleared") {
      map[t.category] += t.amountUSD;
    }
  });

  return map;
}

// Check budget limit spend status and generate instant alerts
function checkBudgetAlerts(): BudgetAlert[] {
  const spentMap = calculateSpentMapUSD();
  const alerts: BudgetAlert[] = [];

  Object.keys(budgetLimitsUSD).forEach((catStr) => {
    const cat = catStr as TransactionCategory;
    const limitUSD = budgetLimitsUSD[cat];
    const spentUSD = spentMap[cat];

    if (spentUSD >= limitUSD) {
      alerts.push({
        id: `alert-${cat}-${Date.now()}-crit`,
        timestamp: new Date().toISOString(),
        category: cat,
        message: `Critical budget alert: You spent $${spentUSD.toFixed(2)} USD in '${cat}', exceeding your designated budget cap of $${limitUSD.toFixed(2)} USD!`,
        severity: "critical",
        read: false
      });
    } else if (spentUSD >= limitUSD * 0.8) {
      alerts.push({
        id: `alert-${cat}-${Date.now()}-warn`,
        timestamp: new Date().toISOString(),
        category: cat,
        message: `Budget warning: '${cat}' expense of $${spentUSD.toFixed(2)} USD is at ${( (spentUSD / limitUSD) * 100 ).toFixed(0)}% of your limit ($${limitUSD.toFixed(2)} USD).`,
        severity: "warning",
        read: false
      });
    }
  });

  return alerts;
}

// Serve master wallet state
app.get("/api/wallet", (req, res) => {
  const spentMapUSD = calculateSpentMapUSD();
  const liveAlerts = checkBudgetAlerts();

  // Map limits to active local preferred currency scale
  const localRate = currentRates[preferredCurrency];
  const responseLimits: Record<string, number> = {};
  Object.keys(budgetLimitsUSD).forEach((catStr) => {
    const limitUSD = budgetLimitsUSD[catStr as TransactionCategory];
    // Convert to preferred currency local equivalent
    responseLimits[catStr] = Math.round((limitUSD / localRate) * 100) / 100;
  });

  res.json({
    transactions,
    recurringExpenses,
    budgetLimits: responseLimits, // category -> value in preferred currency
    preferredCurrency,
    biometricsEnabled,
    biometricsSetup,
    auditLogs: auditLogs.slice().sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    alerts: liveAlerts,
    rates: currentRates
  });
});

// Create Transaction
app.post("/api/wallet/transactions", (req, res) => {
  const { amount, currency, category, merchant, type, requireBiometrics } = req.body;

  if (!amount || isNaN(amount) || !currency || !category || !merchant || !type) {
    return res.status(400).json({ error: "Missing required core transaction properties" });
  }

  // Convert amount rate to USD internally for analytics
  const rateToUSD = currentRates[currency as CurrencyCode] || 1.0;
  const amountUSD = Math.round(amount * rateToUSD * 100) / 100;

  // Audit Biometric Check if enforced
  let authStatus = true;
  if (requireBiometrics && biometricsEnabled) {
    // Audit biometric signature logic checks
    auditLogs.push({
      id: `log-sec-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: "Biometric Verification Verified",
      details: `Digitally authorized €$¥ ${amount} ${currency} transfer to ${merchant}. Passkey signature: 0x${Math.floor(Math.random() * 10000000).toString(16).toUpperCase()}`,
      category: "security",
      status: "success"
    });
  }

  const newTx: Transaction = {
    id: `tx-user-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    amount: parseFloat(amount),
    currency: currency as CurrencyCode,
    amountUSD,
    category: category as TransactionCategory,
    type: type as "income" | "expense",
    merchant,
    timestamp: new Date().toISOString(),
    biometricVerified: requireBiometrics && biometricsEnabled,
    status: "cleared" // user transactions instant clearing
  };

  transactions.unshift(newTx);

  // Log transaction
  auditLogs.push({
    id: `log-tx-${Date.now()}`,
    timestamp: new Date().toISOString(),
    action: type === "expense" ? "Expense Registered" : "Income Registered",
    details: `${merchant} - ${amount} ${currency} (${type}) cleared.`,
    category: "transaction",
    status: "success"
  });

  // Check alerts as side effect
  const liveAlerts = checkBudgetAlerts();
  const relevantAlert = liveAlerts.find(a => a.category === category);
  if (relevantAlert) {
    auditLogs.push({
      id: `log-alert-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: "Budget Limit Threshold Triggered",
      details: `Alert generated for ${category}: ${relevantAlert.message}`,
      category: "budget",
      status: "warning"
    });
  }

  res.json({ transaction: newTx, alerts: liveAlerts });
});

// Clear/Authorize pending transaction
app.post("/api/wallet/transactions/clear", (req, res) => {
  const { id, biometricVerified } = req.body;
  const tx = transactions.find(t => t.id === id);
  if (!tx) {
    return res.status(404).json({ error: "Transaction not found" });
  }
  
  tx.status = "cleared";
  if (biometricVerified) {
    tx.biometricVerified = true;
  }
  
  auditLogs.push({
    id: `log-tx-clear-${Date.now()}`,
    timestamp: new Date().toISOString(),
    action: "Transaction Authorized",
    details: `Pending transaction to ${tx.merchant} (${tx.amount} ${tx.currency}) was fully authorized & cleared.`,
    category: "transaction",
    status: "success"
  });

  res.json({ success: true, transaction: tx });
});

// Delete Transaction
app.delete("/api/wallet/transactions/:id", (req, res) => {
  const { id } = req.params;
  const index = transactions.findIndex(t => t.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Transaction not found" });
  }
  
  const removed = transactions[index];
  transactions.splice(index, 1);
  
  auditLogs.push({
    id: `log-tx-del-${Date.now()}`,
    timestamp: new Date().toISOString(),
    action: "Transaction Removed",
    details: `Ledger entry for ${removed.merchant} ($${removed.amountUSD} USD Equiv) was pruned from database.`,
    category: "transaction",
    status: "warning"
  });

  res.json({ success: true });
});

// Delete Recurring Expense
app.delete("/api/wallet/recurring/:id", (req, res) => {
  const { id } = req.params;
  const index = recurringExpenses.findIndex(r => r.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Recurring subscription not found" });
  }

  const removed = recurringExpenses[index];
  recurringExpenses.splice(index, 1);

  auditLogs.push({
    id: `log-rec-del-${Date.now()}`,
    timestamp: new Date().toISOString(),
    action: "Recurring Bill Pruned",
    details: `Subscription schedule for ${removed.name} was successfully cancelled and deleted.`,
    category: "transaction",
    status: "warning"
  });

  res.json({ success: true });
});

// Update Budget Limits
app.post("/api/wallet/budgets", (req, res) => {
  const { category, limitAmount } = req.body;

  if (!category || limitAmount === undefined || isNaN(limitAmount)) {
    return res.status(400).json({ error: "Invalid budget properties" });
  }

  // Convert given budget limit using active currency conversions back to master USD
  const localRate = currentRates[preferredCurrency];
  const limitUSD = Math.round((limitAmount * localRate) * 100) / 100;

  budgetLimitsUSD[category as TransactionCategory] = limitUSD;

  auditLogs.push({
    id: `log-bud-${Date.now()}`,
    timestamp: new Date().toISOString(),
    action: "Budget Cap Configured",
    details: `Updated limit for ${category} to ${limitAmount} ${preferredCurrency} ($${limitUSD.toFixed(2)} USD equivalence).`,
    category: "budget",
    status: "success"
  });

  res.json({ success: true, budgetLimits: budgetLimitsUSD });
});

// Update Preferred Base Currency & Re-sync conversions
app.post("/api/wallet/change-currency", (req, res) => {
  const { currency } = req.body;

  if (!currency || !currentRates[currency as CurrencyCode]) {
    return res.status(400).json({ error: "Unsupported currency target select." });
  }

  preferredCurrency = currency as CurrencyCode;

  auditLogs.push({
    id: `log-curr-${Date.now()}`,
    timestamp: new Date().toISOString(),
    action: "Preferred Currency Sync",
    details: `Transferred layout dashboard view preference interface to ${preferredCurrency}.`,
    category: "currency",
    status: "success"
  });

  res.json({ success: true, preferredCurrency });
});

// Simulate Biometric toggles
app.post("/api/wallet/biometrics", (req, res) => {
  const { enabled, setup } = req.body;

  if (enabled !== undefined) biometricsEnabled = enabled;
  if (setup !== undefined) biometricsSetup = setup;

  auditLogs.push({
    id: `log-sec-toggle-${Date.now()}`,
    timestamp: new Date().toISOString(),
    action: "Biometric Config Modified",
    details: `Biometric Lock status set to Enabled: ${biometricsEnabled}. Status Verified.`,
    category: "security",
    status: biometricsEnabled ? "success" : "warning"
  });

  res.json({ success: true, biometricsEnabled, biometricsSetup });
});

// Trigger dynamic exchange fluctuations for real-time syncing visualization
app.post("/api/wallet/sync-rates", (req, res) => {
  // Simulate standard currency swings slightly
  const fluctuations: Record<CurrencyCode, number> = {
    USD: 1.0,
    EUR: 1.05 + Math.random() * 0.06,  // range 1.05 - 1.11
    GBP: 1.25 + Math.random() * 0.06,  // range 1.25 - 1.31
    JPY: 0.0061 + Math.random() * 0.0006, // range 0.0061 - 0.0067
    CAD: 0.71 + Math.random() * 0.04,  // range 0.71 - 0.75
    AUD: 0.64 + Math.random() * 0.04   // range 0.64 - 0.68
  };

  currentRates = fluctuations;

  // Recalculate transaction amount USD
  transactions = transactions.map(t => {
    const rate = currentRates[t.currency] || 1.0;
    return {
      ...t,
      amountUSD: Math.round(t.amount * rate * 100) / 100
    };
  });

  auditLogs.push({
    id: `log-sync-${Date.now()}`,
    timestamp: new Date().toISOString(),
    action: "Dynamic Sync Rates Reloaded",
    details: `Synchronized global foreign-exchange tables with decentralized indexes. EUR=${fluctuations.EUR.toFixed(4)}, GBP=${fluctuations.GBP.toFixed(4)}, JPY=${fluctuations.JPY.toFixed(6)}`,
    category: "currency",
    status: "success"
  });

  res.json({ success: true, rates: currentRates });
});

// Toggle/Manage Recurring Expense Status
app.post("/api/wallet/recurring/toggle", (req, res) => {
  const { id } = req.body;
  const item = recurringExpenses.find(r => r.id === id);

  if (!item) {
    return res.status(404).json({ error: "Recurring item not found" });
  }

  item.active = !item.active;

  auditLogs.push({
    id: `log-rec-toggle-${Date.now()}`,
    timestamp: new Date().toISOString(),
    action: "Recurring Bill Updated",
    details: `Toggled recurring payment '${item.name}' status to ${item.active ? "Active" : "Inactive"}.`,
    category: "transaction",
    status: item.active ? "success" : "warning"
  });

  res.json({ success: true, item });
});

// Create new Recurring Expense
app.post("/api/wallet/recurring", (req, res) => {
  const { name, amount, currency, category, frequency } = req.body;

  if (!name || !amount || !currency || !category || !frequency) {
    return res.status(400).json({ error: "Missing required recurring payload properties." });
  }

  const nextDate = new Date();
  if (frequency === "daily") nextDate.setDate(nextDate.getDate() + 1);
  else if (frequency === "weekly") nextDate.setDate(nextDate.getDate() + 7);
  else if (frequency === "monthly") nextDate.setMonth(nextDate.getMonth() + 1);
  else if (frequency === "yearly") nextDate.setFullYear(nextDate.getFullYear() + 1);

  const newRec: RecurringExpense = {
    id: `rec-user-${Date.now()}`,
    name,
    amount: parseFloat(amount),
    currency: currency as CurrencyCode,
    category: category as TransactionCategory,
    frequency,
    nextDate: nextDate.toISOString(),
    active: true
  };

  recurringExpenses.push(newRec);

  auditLogs.push({
    id: `log-rec-create-${Date.now()}`,
    timestamp: new Date().toISOString(),
    action: "Recurring Schedule Created",
    details: `Scheduled automated recurring ledger track for '${name}' at ${amount} ${currency}/${frequency}.`,
    category: "transaction",
    status: "success"
  });

  res.json({ success: true, item: newRec });
});

// AI Gemini Real-time Insights Proxy using correct TS SDK
app.post("/api/wallet/insights", async (req, res) => {
  const spentMapUSD = calculateSpentMapUSD();
  const activeAlerts = checkBudgetAlerts();

  const formattedTransactions = transactions.slice(0, 15).map(t => (
    `- ${t.merchant}: ${t.amount} ${t.currency} ($${t.amountUSD} Equiv), Category: ${t.category}, ${t.type}, verified: ${t.biometricVerified}`
  )).join("\n");

  const formattedBudgets = Object.entries(budgetLimitsUSD).map(([cat, limit]) => (
    `- ${cat}: Limit is $${limit} USD, Spent: $${(spentMapUSD[cat as TransactionCategory] || 0).toFixed(2)} USD`
  )).join("\n");

  const systemInstruction = `You are an elite, highly intelligent personal micro-finance algorithm embedded in a Smart Wallet dashboard.
Your goal is to offer razor-sharp, custom spending suggestions, recognize anomalies, review multi-currency impacts, and help configure custom budget paths.
You MUST output exactly a JSON array containing exactly 3 financial insights objects. 
Each object in the array MUST strictly follow this exact schema:
{
  "id": "insight-unique-123",
  "title": "Short punchy title (max 5 words)",
  "description": "Clear, actionable, personalized wisdom detailing anomalies or savings potential (max 30 words).",
  "category": "One of: Food & Dining | Travel & Transit | Utilities & Bills | Entertainment | Shopping & Retail | Investments | Other",
  "impact": "positive" | "negative" | "neutral"
}
Do NOT wrap the JSON inside markdown ticks (like \`\`\`json ...) - output ONLY raw, pure, valid JSON string and nothing else.`;

  const prompt = `Review the user's recent financials and provide exactly 3 actionable bullet insights according to the schema.

Recent Transactions:
${formattedTransactions}

Active Category Budgets (USD):
${formattedBudgets}

Active Limits Warnings Count: ${activeAlerts.length}

Generate unique JSON instructions array.`;

  const aiClient = getAiClient();

  if (!aiClient) {
    // Return high-quality offline simulated AI insights if key is absent
    const fallbackInsights = [
      {
        id: "insight-off-1",
        title: "Diversify Investments Balance",
        description: "Your investments total $450 USD. Consider establishing a recurring daily transfer strategy to build dollar-cost average buffers.",
        category: TransactionCategory.INVESTMENTS,
        impact: "positive",
        timestamp: new Date().toISOString()
      },
      {
        id: "insight-off-2",
        title: "Food Outlays Warning",
        description: "You've spent $140.40 USD on food dining recently. Consolidating small bills could reduce currency conversion overheads by up to 12%.",
        category: TransactionCategory.FOOD,
        impact: "negative",
        timestamp: new Date().toISOString()
      },
      {
        id: "insight-off-3",
        title: "Evaluate Subscription Stack",
        description: "Your streaming and monthly recurring expense schedule aggregates to $83 USD equivalence. Consider freezing unused subscriptions.",
        category: TransactionCategory.ENTERTAINMENT,
        impact: "neutral",
        timestamp: new Date().toISOString()
      }
    ];
    return res.json({ insights: fallbackInsights, offlineInfo: true });
  }

  try {
    const response = await aiClient.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.8,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              category: { type: Type.STRING },
              impact: { type: Type.STRING }
            },
            required: ["id", "title", "description", "category", "impact"]
          }
        }
      }
    });

    const bodyText = response.text || "[]";
    const insights = JSON.parse(bodyText.trim());
    res.json({ insights, offlineInfo: false });
  } catch (error: any) {
    console.error("Gemini API error in insight generation:", error);
    res.status(500).json({ error: "Failed to generate AI insights", details: error.message });
  }
});

// Configure Vite middleware in development or static asset pipeline in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Smart Wallet backend running successfully on host 0.0.0.0 and port 3000.`);
  });
}

startServer();
