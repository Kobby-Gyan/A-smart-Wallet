export enum TransactionCategory {
  FOOD = "Food & Dining",
  TRAVEL = "Travel & Transit",
  UTILITIES = "Utilities & Bills",
  ENTERTAINMENT = "Entertainment",
  SHOPPING = "Shopping & Retail",
  INVESTMENTS = "Investments",
  OTHER = "Other"
}

export type CurrencyCode = "USD" | "EUR" | "GBP" | "JPY" | "CAD" | "AUD";

export interface Currency {
  code: CurrencyCode;
  symbol: string;
  name: string;
  rateToUSD: number; // 1 currency unit = X USD
}

export interface Transaction {
  id: string;
  amount: number; // local currency amount
  currency: CurrencyCode;
  amountUSD: number; // normalized USD amount for budgeting and visual charts
  category: TransactionCategory;
  type: "income" | "expense";
  merchant: string;
  timestamp: string;
  biometricVerified: boolean;
  status: "cleared" | "pending";
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  details: string;
  category: "security" | "transaction" | "currency" | "budget";
  status: "success" | "warning" | "failure";
}

export interface RecurringExpense {
  id: string;
  name: string;
  amount: number;
  currency: CurrencyCode;
  category: TransactionCategory;
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  nextDate: string;
  active: boolean;
}

export interface BudgetLimit {
  category: TransactionCategory;
  limitAmount: number; // Always in active preferred currency
  currency: CurrencyCode;
  spent: number;
}

export interface BudgetAlert {
  id: string;
  timestamp: string;
  category: TransactionCategory | "general";
  message: string;
  severity: "info" | "warning" | "critical";
  read: boolean;
}

export interface WalletState {
  transactions: Transaction[];
  recurringExpenses: RecurringExpense[];
  budgetLimits: Record<string, number>; // Local currency budgets keyed by Category
  preferredCurrency: CurrencyCode;
  biometricsEnabled: boolean;
  biometricsSetup: boolean;
  auditLogs: AuditLog[];
  alerts: BudgetAlert[];
  rates: Record<CurrencyCode, number>; // Conversion rates relative to USD (1 unit = X USD)
}

export interface SpendingInsight {
  id: string;
  title: string;
  description: string;
  category?: TransactionCategory;
  impact: "positive" | "negative" | "neutral";
  timestamp: string;
}
