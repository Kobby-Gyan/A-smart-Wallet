import React, { useState, useEffect } from "react";
import { 
  Plus, X, Lock, Unlock, Settings, Activity, Calendar, DollarSign, 
  AlertCircle, ArrowUpRight, ArrowDownLeft, Trash2, Filter, 
  Check, ChevronRight, Fingerprint, Shield, Info, CreditCard, RefreshCw, Layers
} from "lucide-react";
import AIPanel from "./components/AIPanel";
import BiometricPrompt from "./components/BiometricPrompt";
import CurrencySelector from "./components/CurrencySelector";
import { 
  Transaction, 
  AuditLog, 
  RecurringExpense, 
  CurrencyCode, 
  TransactionCategory, 
  WalletState, 
  SpendingInsight 
} from "./types";

const currencySymbols: Record<CurrencyCode, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  CAD: "CA$",
  AUD: "A$"
};

export default function App() {
  // Primary state matching Backend WalletState contract
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // UI Interactivity state
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  
  // New transaction form inputs
  const [txAmount, setTxAmount] = useState("");
  const [txCurrency, setTxCurrency] = useState<CurrencyCode>("USD");
  const [txCategory, setTxCategory] = useState<TransactionCategory>(TransactionCategory.FOOD);
  const [txMerchant, setTxMerchant] = useState("");
  const [txType, setTxType] = useState<"expense" | "income">("expense");
  const [requireBiometrics, setRequireBiometrics] = useState(false);

  // New recurring expense inputs
  const [recName, setRecName] = useState("");
  const [recAmount, setRecAmount] = useState("");
  const [recCurrency, setRecCurrency] = useState<CurrencyCode>("USD");
  const [recCategory, setRecCategory] = useState<TransactionCategory>(TransactionCategory.FOOD);
  const [recFrequency, setRecFrequency] = useState<"daily" | "weekly" | "monthly" | "yearly">("monthly");

  // Biometric Verification authorization trigger
  const [biometricPendingAction, setBiometricPendingAction] = useState<(() => void) | null>(null);
  const [biometricLabel, setBiometricLabel] = useState("");

  // Budget slider values temporarily held for input
  const [tempBudgets, setTempBudgets] = useState<Record<string, number>>({});

  // Active category filter for transaction list
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>("ALL");
  const [txSearchSearch, setTxSearchSearch] = useState("");
  const [txTypeFilter, setTxTypeFilter] = useState<"ALL" | "INCOME" | "EXPENSE">("ALL");

  // AI insights list
  const [insights, setInsights] = useState<SpendingInsight[]>([]);

  // Fetch full wallet parameters
  const fetchWalletData = async (bypassLoading = false) => {
    if (!bypassLoading) setLoading(true);
    try {
      const res = await fetch("/api/wallet");
      if (!res.ok) throw new Error("Failed to load secure wallet registry information");
      const data: WalletState = await res.json();
      setWallet(data);
      setTxCurrency(data.preferredCurrency);
      setRecCurrency(data.preferredCurrency);
      
      // Initialize budget sliders
      const initialTempBudgets: Record<string, number> = {};
      Object.keys(data.budgetLimits).forEach(cat => {
        initialTempBudgets[cat] = data.budgetLimits[cat];
      });
      setTempBudgets(initialTempBudgets);
      setError(null);
    } catch (err: any) {
      setError(err?.message || "Fault synchronizing decentral ledger networks.");
      console.error(err);
    } finally {
      if (!bypassLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletData();
  }, []);

  // Sync real-time insights triggers
  const fetchAIHabitInsights = async (): Promise<SpendingInsight[]> => {
    try {
      const res = await fetch("/api/wallet/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      if (!res.ok) throw new Error("Could not construct habit model summaries");
      const data = await res.json();
      setInsights(data.insights || []);
      return data.insights || [];
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  // Switch preferred currency sync
  const handleCurrencyChange = async (targetCode: CurrencyCode) => {
    try {
      const res = await fetch("/api/wallet/change-currency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency: targetCode })
      });
      if (!res.ok) throw new Error("Could not complete currency realignment");
      await fetchWalletData(true);
    } catch (err: any) {
      alert(err.message || "Failed changing preferred currency");
    }
  };

  // Sync / Fluctuate forex rates
  const handleSyncForexRates = async () => {
    const res = await fetch("/api/wallet/sync-rates", {
      method: "POST"
    });
    if (!res.ok) throw new Error("Failed syncing exchange indexes");
    await fetchWalletData(true);
  };

  // Toggle biometrics configuration status
  const toggleBiometrics = async () => {
    if (!wallet) return;
    const targetStatus = !wallet.biometricsEnabled;
    try {
      const res = await fetch("/api/wallet/biometrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: targetStatus })
      });
      if (!res.ok) throw new Error("Failed modifying security matrices");
      await fetchWalletData(true);
    } catch (err: any) {
      alert(err.message || "Failed changing lock profile configurations");
    }
  };

  // Toggle recurring billing item status
  const handleToggleRecurring = async (id: string) => {
    try {
      const res = await fetch("/api/wallet/recurring/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      if (!res.ok) throw new Error("Failed resetting calendar bill trigger");
      await fetchWalletData(true);
    } catch (err: any) {
      console.error(err);
    }
  };

  // Config budget limits parameters
  const handleSaveBudgetLimit = async (category: TransactionCategory, amount: number) => {
    try {
      const res = await fetch("/api/wallet/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, limitAmount: amount })
      });
      if (!res.ok) throw new Error("Budget limit update rejected");
      await fetchWalletData(true);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Adding a new transaction
  const handleCreateTransaction = async () => {
    if (!txAmount || isNaN(parseFloat(txAmount)) || parseFloat(txAmount) <= 0) {
      alert("Please provide a valid numeric ledger amount.");
      return;
    }
    if (!txMerchant.trim()) {
      alert("Please specify a target merchant details line.");
      return;
    }

    const action = async () => {
      try {
        const res = await fetch("/api/wallet/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: parseFloat(txAmount),
            currency: txCurrency,
            category: txCategory,
            merchant: txMerchant,
            type: txType,
            requireBiometrics: requireBiometrics
          })
        });
        if (!res.ok) throw new Error("Failed reporting ledger activity");
        
        // Reset states
        setTxAmount("");
        setTxMerchant("");
        setRequireBiometrics(false);
        setIsTxModalOpen(false);
        
        // Refresh
        await fetchWalletData(false);
      } catch (err: any) {
        alert(err.message || "Unable to register transaction.");
      }
    };

    // If transaction requires biometric security scan
    if (requireBiometrics && wallet?.biometricsEnabled) {
      setBiometricLabel(`${currencySymbols[txCurrency]}${parseFloat(txAmount).toFixed(2)} to ${txMerchant}`);
      setBiometricPendingAction(() => action);
    } else {
      await action();
    }
  };

  // Handle adding recurring bill
  const handleCreateRecurring = async () => {
    if (!recName.trim()) {
      alert("Please specify recurring service name");
      return;
    }
    if (!recAmount || isNaN(parseFloat(recAmount))) {
      alert("Please enter a valid recurring numeric charge.");
      return;
    }

    try {
      const res = await fetch("/api/wallet/recurring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: recName,
          amount: parseFloat(recAmount),
          currency: recCurrency,
          category: recCategory,
          frequency: recFrequency
        })
      });
      if (!res.ok) throw new Error("Failed planning automated debit ledger");
      
      // Reset input state
      setRecName("");
      setRecAmount("");
      setIsRecurringModalOpen(false);

      await fetchWalletData(true);
    } catch (err: any) {
      alert(err.message || "Failed saving scheduling parameters");
    }
  };

  // Authorize/Clear a pending transaction
  const handleAuthorizePending = async (tx: Transaction) => {
    const action = async () => {
      try {
        const res = await fetch("/api/wallet/transactions/clear", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: tx.id, biometricVerified: wallet?.biometricsEnabled })
        });
        if (!res.ok) throw new Error("Could not authorize transaction");
        await fetchWalletData(true);
      } catch (err: any) {
        alert(err.message || "Failed to authorize transaction");
      }
    };

    if (wallet?.biometricsEnabled) {
      setBiometricLabel(`${currencySymbols[tx.currency]}${tx.amount.toFixed(2)} to ${tx.merchant}`);
      setBiometricPendingAction(() => action);
    } else {
      await action();
    }
  };

  // Delete/prune an audited transaction
  const handleDeleteTransaction = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this historical transaction entry?")) return;
    try {
      const res = await fetch(`/api/wallet/transactions/${id}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Could not delete transaction from ledger");
      await fetchWalletData(true);
    } catch (err: any) {
      alert(err.message || "Failed to prune transaction");
    }
  };

  // Delete/cancel a recurring bill item
  const handleDeleteRecurring = async (id: string) => {
    if (!window.confirm("Are you sure you want to cancel and delete this recurring monitoring schedule?")) return;
    try {
      const res = await fetch(`/api/wallet/recurring/${id}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Could not delete recurring subscription schedule");
      await fetchWalletData(true);
    } catch (err: any) {
      alert(err.message || "Failed to cancel subscription item");
    }
  };

  // Execute biometric scan success
  const handleBiometricSuccess = () => {
    if (biometricPendingAction) {
      biometricPendingAction();
      setBiometricPendingAction(null);
    }
  };

  // Convert and calculate statistics
  const currentSymbol = wallet ? currencySymbols[wallet.preferredCurrency] : "$";
  const preferredCurrencyCode = wallet ? wallet.preferredCurrency : "USD";

  // Calculate combined parameters
  const totalBalanceUSD = wallet ? wallet.transactions.reduce((acc, curr) => {
    if (curr.status !== "cleared") return acc;
    if (curr.type === "income") return acc + curr.amountUSD;
    return acc - curr.amountUSD;
  }, 0) : 0;

  // Convert Total Balance to active preferred currency representation
  const activeRate = wallet ? wallet.rates[wallet.preferredCurrency] : 1.0;
  const balanceInPreferred = wallet ? (totalBalanceUSD / activeRate) : 0;
  const balanceMainStr = Math.floor(Math.abs(balanceInPreferred)).toLocaleString();
  const balanceFractionStr = (Math.abs(balanceInPreferred) % 1).toFixed(2).substring(1);

  // Spend percentages for habits card
  const categoryTotalSpentUSD: Record<TransactionCategory, number> = {
    [TransactionCategory.FOOD]: 0,
    [TransactionCategory.TRAVEL]: 0,
    [TransactionCategory.UTILITIES]: 0,
    [TransactionCategory.ENTERTAINMENT]: 0,
    [TransactionCategory.SHOPPING]: 0,
    [TransactionCategory.INVESTMENTS]: 0,
    [TransactionCategory.OTHER]: 0
  };

  if (wallet) {
    wallet.transactions.forEach((tx) => {
      if (tx.type === "expense" && tx.status === "cleared") {
        categoryTotalSpentUSD[tx.category] += tx.amountUSD;
      }
    });
  }

  // Find max category spent in USD to scale habit chart heights
  const maxSpentUSD = Math.max(...Object.values(categoryTotalSpentUSD), 1);

  // Filter transaction list
  const filteredTransactions = wallet ? wallet.transactions.filter(t => {
    // 1. Category Filter
    const matchesCategory = activeCategoryFilter === "ALL" || t.category === activeCategoryFilter;
    
    // 2. Type Filter
    const matchesType = txTypeFilter === "ALL" || 
      (txTypeFilter === "INCOME" && t.type === "income") || 
      (txTypeFilter === "EXPENSE" && t.type === "expense");
      
    // 3. Search Filter (merchant matching case-insensitive)
    const matchesSearch = t.merchant.toLowerCase().includes(txSearchSearch.toLowerCase());
    
    return matchesCategory && matchesType && matchesSearch;
  }) : [];

  if (loading && !wallet) {
    return (
      <div id="full-loading-screen" className="flex h-screen w-full items-center justify-center bg-[#F8F9FA] text-[#1A1A1A] font-sans">
        <div className="text-center">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-zinc-400 mb-3" />
          <h2 className="text-sm font-medium uppercase tracking-widest text-zinc-500">Initializing Smart Wallet Node</h2>
          <p className="text-xs text-zinc-400 font-mono mt-1">Establishing SECURE Cryptographic Session...</p>
        </div>
      </div>
    );
  }

  return (
    <div id="clean-minimal-app-root" className="flex w-full min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans overflow-x-hidden select-none">
      {/* Dynamic Biometric verification popover dialog */}
      <BiometricPrompt
        isOpen={biometricPendingAction !== null}
        amountLabel={biometricLabel}
        onSuccess={handleBiometricSuccess}
        onCancel={() => setBiometricPendingAction(null)}
      />

      {/* Left Navigation Rails - Aesthetic minimalism matching theme design */}
      <nav id="minimal-navigation-sidebar" className="hidden md:flex w-20 bg-white border-r border-[#E5E5E5] flex-col items-center py-8 justify-between sticky top-0 h-screen">
        <div className="flex flex-col gap-8 items-center">
          <div className="w-11 h-11 bg-black rounded-2xl flex items-center justify-center text-white font-mono font-bold text-lg select-none hover:opacity-85 transition-opacity">
            W
          </div>
          <div className="flex flex-col gap-6">
            <button 
              id="sidebar-nav-active"
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-zinc-50 border border-zinc-200 text-black shadow-xs"
              title="Overview Dashboard"
            >
              <Activity className="h-5 w-5" />
            </button>
            <button 
              id="sidebar-nav-limits"
              onClick={() => setIsBudgetModalOpen(true)}
              className="w-10 h-10 flex items-center justify-center rounded-xl text-[#9E9E9E] hover:text-[#1A1A1A] hover:bg-zinc-50 transition-all border border-transparent hover:border-zinc-200"
              title="Budget Limits Control"
            >
              <Settings className="h-5 w-5" />
            </button>
            <button 
              id="sidebar-nav-recurring"
              onClick={() => setIsRecurringModalOpen(true)}
              className="w-10 h-10 flex items-center justify-center rounded-xl text-[#9E9E9E] hover:text-[#1A1A1A] hover:bg-zinc-50 transition-all border border-transparent hover:border-zinc-200"
              title="Recurring Subscriptions Schedule"
            >
              <Calendar className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-4 items-center">
          {/* Status Indicator circle reflecting verified security state */}
          <div 
            id="status-indicator-puck" 
            onClick={toggleBiometrics}
            className={`w-10 h-10 rounded-full flex items-center justify-center border border-[#E5E5E5] cursor-pointer hover:bg-zinc-50 transition-colors ${wallet?.biometricsEnabled ? "bg-emerald-50" : "bg-zinc-50"}`}
            title="Biometric Setup Toggle Status"
          >
            <div className={`w-3.5 h-3.5 rounded-full ${wallet?.biometricsEnabled ? "bg-[#10B981] animate-pulse" : "bg-amber-400"}`} />
          </div>
          <span className="text-[10px] font-mono font-bold text-[#9E9E9E]">V.1.0</span>
        </div>
      </nav>

      {/* Main Sandbox Section */}
      <main id="main-content-fluid" className="flex-1 flex flex-col p-4 md:p-10 gap-8 max-w-7xl mx-auto w-full">
        
        {/* Header Layout */}
        <header id="main-dashboard-header" className="flex flex-col md:flex-row justify-between items-start md:items-end gap-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold tracking-widest text-[#9E9E9E] uppercase">Total Balance</span>
              <span className="text-[9px] bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded text-[#10B981] font-mono tracking-wider font-bold">SECURED VAULT</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-light tracking-tight text-[#1A1A1A]">
              {balanceInPreferred < 0 ? "-" : ""}{currentSymbol}{balanceMainStr}
              <span className="text-[#9E9E9E]">{balanceFractionStr}</span>
            </h1>
          </div>
          
          {/* Actions & Currency Sync container */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              id="global-trigger-new-tx"
              onClick={() => setIsTxModalOpen(true)}
              className="px-5 py-2.5 bg-black text-white rounded-xl text-xs font-semibold uppercase tracking-wider hover:bg-zinc-800 transition-colors cursor-pointer shadow-sm flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>Record Transaction</span>
            </button>

            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-[#E5E5E5] shadow-xs">
              {(["USD", "EUR", "GBP"] as CurrencyCode[]).map((code) => {
                const isSelected = wallet?.preferredCurrency === code;
                return (
                  <button
                    id={`layout-currency-trigger-${code}`}
                    key={code}
                    onClick={() => handleCurrencyChange(code)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-medium tracking-tight transition-all cursor-pointer ${
                      isSelected 
                        ? "bg-black text-white shadow-xs" 
                        : "text-[#9E9E9E] hover:text-[#1A1A1A] hover:bg-zinc-50"
                    }`}
                  >
                    {code}
                  </button>
                );
              })}
            </div>
          </div>
        </header>

        {/* Global Warnings / Live System Alerts bar overlay */}
        {wallet && wallet.alerts.length > 0 && (
          <div id="system-budget-alerts-ticker" className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h5 className="text-xs font-bold text-amber-900 uppercase tracking-wider font-mono">Dynamic Budget Threshold Flags</h5>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                {wallet.alerts[0].message}
              </p>
            </div>
            <span className="rounded bg-amber-100 text-[10px] font-mono text-amber-800 px-2 py-0.5 font-bold uppercase">
              {wallet.alerts[0].severity}
            </span>
          </div>
        )}

        {/* Primary Functional Grid */}
        <div id="dashboard-grid-containers" className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Visuals ColSpan-2 */}
          <div className="lg:col-span-2 flex flex-col gap-8">
            
            {/* SPENDING HABIT ANALYTICS CARD */}
            <div id="spending-habits-container" className="bg-white p-6 md:p-8 rounded-[32px] border border-[#E5E5E5] flex flex-col min-h-[340px]">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="font-semibold text-lg text-[#1A1A1A]">Spending Habit Analytics</h3>
                  <p className="text-xs text-[#9E9E9E]">Normalized expenditure comparisons against budget constraints</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                  <span className="text-[10px] text-[#9E9E9E] font-mono tracking-widest">REAL-TIME SYNC ACTIVE</span>
                </div>
              </div>

              {/* Graphical vertical bars */}
              <div id="habits-bar-chart" className="flex-1 flex items-end justify-between gap-1 h-44 border-b border-zinc-100 pb-3 font-mono">
                {Object.keys(categoryTotalSpentUSD).map((catStr) => {
                  const cat = catStr as TransactionCategory;
                  const spentUSD = categoryTotalSpentUSD[cat];
                  const spentInPreferred = wallet ? (spentUSD / activeRate) : spentUSD;
                  
                  // Limit logic support in preferred currency conversion scaling
                  const limitInPreferred = wallet ? (wallet?.budgetLimits[cat] || 1) : 1;
                  const spentPctOfBudget = limitInPreferred > 0 ? (spentInPreferred / limitInPreferred) * 100 : 0;
                  
                  // Height based on absolute spend relative to max
                  const heightPct = Math.min((spentUSD / maxSpentUSD) * 100, 100);

                  // Color mapping based on limit status warnings
                  let barColor = "bg-[#F0F0F0] hover:bg-black";
                  if (spentPctOfBudget >= 100) {
                    barColor = "bg-red-500 hover:bg-red-600";
                  } else if (spentPctOfBudget >= 80) {
                    barColor = "bg-orange-500 hover:bg-orange-600";
                  }

                  return (
                    <div key={cat} className="group relative flex-1 flex flex-col items-center h-full justify-end">
                      {/* Tooltip detail card popup */}
                      <div className="absolute opacity-0 group-hover:opacity-100 bottom-full mb-2 z-10 w-40 bg-zinc-950 text-white rounded-xl p-3 text-[10px] transition-all duration-200 pointer-events-none shadow-lg border border-zinc-800">
                        <p className="font-bold text-zinc-300 mb-1 truncate">{cat}</p>
                        <div className="flex justify-between text-zinc-400 mb-0.5">
                          <span>Outlay:</span>
                          <span className="font-bold text-white font-mono">{currentSymbol}{spentInPreferred.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-zinc-400">
                          <span>Limit:</span>
                          <span className="font-mono">{currentSymbol}{limitInPreferred.toFixed(2)}</span>
                        </div>
                        <div className="mt-2 h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${spentPctOfBudget >= 100 ? "bg-red-500" : spentPctOfBudget >= 80 ? "bg-orange-500" : "bg-emerald-400"}`}
                            style={{ width: `${Math.min(spentPctOfBudget, 100)}%` }}
                          />
                        </div>
                        <p className="mt-1 text-[9px] text-[#9E9E9E] text-right font-mono font-bold">
                          {spentPctOfBudget.toFixed(0)}% Utilized
                        </p>
                      </div>

                      {/* Bar fill element */}
                      <div className="w-full max-w-[28px] rounded-md transition-all duration-500 flex flex-col justify-end overflow-hidden" style={{ height: `${Math.max(heightPct, 4)}%` }}>
                        <div className={`h-full w-full rounded-md ${barColor} transition-all duration-300`} />
                      </div>

                      {/* Label under code */}
                      <span className="text-[9px] text-zinc-400 mt-2 truncate max-w-full text-center tracking-tighter">
                        {cat.split(" ")[0]}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Legends container */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[10px] text-[#9E9E9E] font-mono font-bold pt-2">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 H-2 bg-[#F0F0F0] rounded-xs border border-zinc-200"></span>
                    <span>NOMINAL</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 H-2 bg-orange-500 rounded-xs"></span>
                    <span>WARNING (&gt;80%)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 H-2 bg-red-500 rounded-xs"></span>
                    <span>EXCEEDED LIMIT </span>
                  </div>
                </div>
                <div id="limits-interactive-settings-btn" onClick={() => setIsBudgetModalOpen(true)} className="text-black hover:underline cursor-pointer flex items-center gap-1">
                  <span>ADJUST THRESHOLDS</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </div>
            </div>

            {/* LOWER DOUBLE COLUMN - SECURITY & INTEGRATIVE WIDGETS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* SECURITY COLUMN: BIOMETRIC SHIELD STATUS */}
              <div className="bg-black text-white p-6 md:p-8 rounded-[32px] flex flex-col justify-between min-h-[220px]">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest opacity-60 mb-2 font-mono font-bold">Authentic Security Profile</p>
                    <h4 className="text-xl font-medium leading-tight">
                      Biometric Shield Lock<br />
                      {wallet?.biometricsEnabled ? (
                        <span className="text-emerald-400">Fully Active & Verified</span>
                      ) : (
                        <span className="text-amber-400">Bypassed (Require Setup)</span>
                      )}
                    </h4>
                  </div>
                  <Fingerprint className={`h-7 w-7 ${wallet?.biometricsEnabled ? "text-emerald-400 animate-pulse" : "text-zinc-600"}`} />
                </div>

                <div className="mt-4 space-y-3 pt-3 border-t border-zinc-900">
                  <p className="text-xs opacity-75 leading-relaxed font-light">
                    Cryptographic signature requirements enforce fingerprint verification scans before high-value ledger operations execute.
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${wallet?.biometricsEnabled ? "bg-[#10B981]" : "bg-amber-400"}`}></div>
                      <span className="text-[11px] opacity-80 font-mono tracking-wider">TOUCH-ID: {wallet?.biometricsEnabled ? "SECURED" : "STANDBY"}</span>
                    </div>

                    <button
                      id="biometrics-config-toggle"
                      onClick={toggleBiometrics}
                      className="px-3 py-1 bg-zinc-900 border border-zinc-800 text-xs font-mono font-medium rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-850 cursor-pointer"
                    >
                      {wallet?.biometricsEnabled ? "Deactivate Shield" : "Activate Security Link"}
                    </button>
                  </div>
                </div>
              </div>

              {/* CURRENCY SELECTOR INTEGRATED ROW */}
              {wallet && (
                <CurrencySelector
                  currentPreferred={wallet.preferredCurrency}
                  rates={wallet.rates}
                  onSelect={handleCurrencyChange}
                  onSync={handleSyncForexRates}
                />
              )}
            </div>

            {/* INTERACTIVE RECURRING EXPENSES MONITORING BOX */}
            <div id="recurring-monitoring-card" className="bg-white p-6 md:p-8 rounded-[32px] border border-[#E5E5E5] flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-semibold text-[#1A1A1A]">Recurring Monitored Outlays</h4>
                  <p className="text-xs text-[#9E9E9E]">Subscription stacks scheduled automatically against master ledger calendars</p>
                </div>
                <button
                  id="open-modal-recurring-expense"
                  onClick={() => setIsRecurringModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-xs text-black font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Configure Schedule</span>
                </button>
              </div>

              <div id="recurring-expenses-rows" className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {wallet && wallet.recurringExpenses.map((rec) => {
                  const localSymbol = currencySymbols[rec.currency];
                  return (
                    <div 
                      id={`recurring-card-item-${rec.id}`}
                      key={rec.id} 
                      className={`p-4 rounded-2xl border transition-all ${
                        rec.active 
                          ? "bg-white border-zinc-200" 
                          : "bg-zinc-50 border-zinc-200/50 opacity-60"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-[#1A1A1A] truncate max-w-[150px]">{rec.name}</span>
                        <span className="font-mono text-xs font-bold text-[#1A1A1A]">
                          {localSymbol}{rec.amount.toFixed(2)}
                          <span className="text-[#9E9E9E] font-light text-[10px]">/{rec.frequency.substring(0,3)}</span>
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-[#9E9E9E] font-mono pt-2 border-t border-zinc-100">
                        <span>Calendar Due: {new Date(rec.nextDate).toLocaleDateString()}</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            id={`toggle-recurring-active-state-${rec.id}`}
                            onClick={() => handleToggleRecurring(rec.id)}
                            className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold transition-all cursor-pointer ${
                              rec.active
                                ? "bg-emerald-50 text-[#10B981] hover:bg-emerald-100"
                                : "bg-zinc-100 text-[#9E9E9E] hover:bg-zinc-200"
                            }`}
                          >
                            {rec.active ? "MONITORED ACTIVE" : "SUSPENDED OUTLAY"}
                          </button>
                          <button
                            id={`delete-recurring-btn-${rec.id}`}
                            onClick={() => handleDeleteRecurring(rec.id)}
                            className="p-1 text-[#9E9E9E] hover:text-red-500 hover:bg-zinc-50 rounded transition-colors cursor-pointer"
                            title="Prune Subscription"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CLIENT GEMINI AI SMARTHABITS INSIGHTS PANEL */}
            <AIPanel 
              onTriggerFetch={fetchAIHabitInsights} 
              initialInsights={insights} 
            />

          </div>

          {/* AUDIT LOG SIDEBAR PANEL (ColSpan 1) */}
          <div className="bg-white border border-[#E5E5E5] rounded-[32px] flex flex-col overflow-hidden min-h-[600px] h-fit">
            
            {/* Sidebar Title */}
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-[#1A1A1A]">Master Ledger Audit Logs</h3>
                <p className="text-[11px] text-[#9E9E9E]">Secure cryptographic ledger activities record</p>
              </div>
              <div className="rounded-full bg-zinc-50 border border-zinc-200 p-1.5">
                <Shield className="h-4 w-4 text-black" />
              </div>
            </div>

            {/* Inner controls - Filter categories, merchant search & type triggers */}
            <div className="px-6 py-4 bg-[#F8F9FA] border-b border-zinc-100 flex flex-col gap-3">
              {/* Search Bar */}
              <div className="relative">
                <input
                  id="ledger-merchant-search"
                  type="text"
                  placeholder="Search merchant or ledger details..."
                  value={txSearchSearch}
                  onChange={(e) => setTxSearchSearch(e.target.value)}
                  className="w-full text-xs font-mono bg-white border border-[#E5E5E5] pl-3 pr-8 py-2 rounded-xl text-zinc-700 placeholder-zinc-400 focus:outline-none focus:border-black transition-colors"
                />
                {txSearchSearch && (
                  <button
                    onClick={() => setTxSearchSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-black text-xs font-mono"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Scope & Type Dropdowns Grid */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[8px] uppercase font-mono font-bold tracking-widest text-[#9E9E9E] mb-1">Scope:</label>
                  <select
                    id="audit-category-dropdown"
                    value={activeCategoryFilter}
                    onChange={(e) => setActiveCategoryFilter(e.target.value)}
                    className="w-full text-[10px] font-mono bg-white border border-[#E5E5E5] px-2 py-1.5 rounded-lg text-[#1A1A1A] focus:outline-none"
                  >
                    <option value="ALL">ALL GENERAL</option>
                    {Object.values(TransactionCategory).map((cat) => (
                      <option key={cat} value={cat}>{cat.toUpperCase()}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[8px] uppercase font-mono font-bold tracking-widest text-[#9E9E9E] mb-1">Type:</label>
                  <select
                    id="audit-type-dropdown"
                    value={txTypeFilter}
                    onChange={(e) => setTxTypeFilter(e.target.value as any)}
                    className="w-full text-[10px] font-mono bg-white border border-[#E5E5E5] px-2 py-1.5 rounded-lg text-[#1A1A1A] focus:outline-none"
                  >
                    <option value="ALL">ALL TYPES</option>
                    <option value="INCOME">INCOME (+)</option>
                    <option value="EXPENSE">EXPENSE (-)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Activity Stream Items */}
            <div id="audit-log-scroller" className="flex-1 overflow-y-auto max-h-[500px] divide-y divide-zinc-100 flex flex-col">
              {filteredTransactions.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#9E9E9E] font-light flex-1 flex flex-col justify-center items-center gap-2">
                  <Info className="h-5 w-5 text-zinc-300" />
                  <span>No ledger entries conform with active category scopes</span>
                </div>
              ) : (
                filteredTransactions.map((tx) => {
                  const isIncome = tx.type === "income";
                  const localSymbol = currencySymbols[tx.currency] || "$";
                  
                  return (
                    <div 
                      id={`transaction-log-item-${tx.id}`}
                      key={tx.id} 
                      className="p-5 hover:bg-[#F8F9FA] transition-colors cursor-default"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <div>
                          <p className="text-sm font-semibold text-[#1A1A1A] line-clamp-1">{tx.merchant}</p>
                          <span className="text-[10px] font-mono bg-[#F0F0F0] px-2 py-0.5 rounded text-[#9E9E9E] tracking-tight uppercase">
                            {tx.category}
                          </span>
                        </div>
                        <div className="text-right flex flex-col items-end">
                          <span className={`text-sm font-bold font-mono tracking-tight ${isIncome ? "text-[#10B981]" : "text-[#1A1A1A]"}`}>
                            {isIncome ? "+" : "-"}{localSymbol}{tx.amount.toFixed(2)}
                          </span>
                          {/* Normalized secondary conversion reference */}
                          {tx.currency !== preferredCurrencyCode && (
                            <span className="text-[9px] font-mono text-[#9E9E9E]">
                              ≈ {currentSymbol}{((tx.amountUSD) / activeRate).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-between items-center mt-2.5 text-[10px] text-[#9E9E9E] font-mono">
                        <div className="flex items-center gap-2">
                          <span>{new Date(tx.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          {tx.status === "pending" && (
                            <button
                              id={`auth-btn-${tx.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAuthorizePending(tx);
                              }}
                              className="bg-[#10B981] text-white hover:bg-emerald-600 active:scale-95 text-[9px] font-bold font-sans px-2.5 py-0.5 rounded-full flex items-center gap-1 transition-all shadow-xs cursor-pointer animate-pulse"
                            >
                              <Fingerprint className="h-2.5 w-2.5" />
                              <span>Authorize</span>
                            </button>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1.5">
                          {tx.biometricVerified && (
                            <span className="bg-emerald-50 text-[#10B981] border border-emerald-100 text-[8px] font-bold font-mono px-1.5 py-0.5 rounded flex items-center gap-0.5">
                              <Fingerprint className="h-2.5 w-2.5" />
                              <span>BIO</span>
                            </span>
                          )}
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                            tx.status === "cleared" ? "bg-zinc-100 text-zinc-400" : "bg-amber-100 text-amber-800"
                          }`}>
                            {tx.status.toUpperCase()}
                          </span>

                          <button
                            id={`delete-tx-btn-${tx.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTransaction(tx.id);
                            }}
                            className="p-1 text-[#9E9E9E] hover:text-red-500 hover:bg-zinc-50 rounded transition-colors cursor-pointer"
                            title="Prune entry"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Sidebar actions: Audit summary stats */}
            <div id="logs-sidebar-footer" className="p-6 bg-[#F8F9FA] text-center border-t border-zinc-100 space-y-3">
              <div className="flex justify-between items-center text-xs font-mono font-bold text-[#1A1A1A]">
                <span className="text-[#9E9E9E]">TOTAL INFLOW STATS:</span>
                <span className="text-[#10B981]">
                  {currentSymbol}
                  {wallet ? wallet.transactions.reduce((acc, t) => t.type === "income" ? acc + (t.amountUSD / activeRate) : acc, 0).toFixed(2) : "0.00"}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs font-mono font-bold text-[#1A1A1A]">
                <span className="text-[#9E9E9E]">TOTAL OUTFLOW LIMITS:</span>
                <span>
                  {currentSymbol}
                  {wallet ? wallet.transactions.reduce((acc, t) => t.type === "expense" ? acc + (t.amountUSD / activeRate) : acc, 0).toFixed(2) : "0.00"}
                </span>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* MODAL 1: RECORD NEW TRANSACTION MODAL */}
      {isTxModalOpen && (
        <div id="tx-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div id="tx-modal-container" className="w-full max-w-md bg-white rounded-[32px] border border-[#E5E5E5] overflow-hidden shadow-2xl p-6 text-[#1A1A1A]">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4 mb-5">
              <div>
                <h4 className="font-semibold text-lg text-[#1A1A1A]">Record Safe Transaction</h4>
                <p className="text-xs text-[#9E9E9E]">Register direct balance adjustments in target ledger currencies</p>
              </div>
              <button 
                id="close-tx-modal-puck"
                onClick={() => setIsTxModalOpen(false)} 
                className="w-8 h-8 rounded-full bg-[#F8F9FA] flex items-center justify-center border border-zinc-200 text-zinc-400 hover:text-black hover:bg-zinc-50 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              
              {/* Type toggle switch (Income vs Expense) */}
              <div className="flex bg-[#F8F9FA] p-1 rounded-xl border border-[#E5E5E5]">
                <button
                  id="tx-form-select-expense"
                  onClick={() => setTxType("expense")}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                    txType === "expense" ? "bg-black text-white" : "text-[#9E9E9E]"
                  }`}
                >
                  Expense Outflow
                </button>
                <button
                  id="tx-form-select-income"
                  onClick={() => setTxType("income")}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                    txType === "income" ? "bg-black text-white" : "text-[#9E9E9E]"
                  }`}
                >
                  Income Inflow
                </button>
              </div>

              {/* Amount input block */}
              <div>
                <label className="block text-[10px] uppercase font-mono font-bold tracking-widest text-[#9E9E9E] mb-1.5">Amount Outlay / Inflow</label>
                <div className="relative rounded-xl border border-zinc-200 overflow-hidden bg-white shadow-xs focus-within:border-black transition-colors flex items-center">
                  <span className="pl-3.5 text-sm font-bold font-mono text-zinc-500">{txCurrency}</span>
                  <input
                    id="tx-amount-numeric-input"
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm font-mono focus:outline-none text-[#1A1A1A]"
                  />
                </div>
              </div>

              {/* Select target ledger currency */}
              <div>
                <label className="block text-[10px] uppercase font-mono font-bold tracking-widest text-[#9E9E9E] mb-1.5">Target currency</label>
                <select
                  id="tx-currency-select"
                  value={txCurrency}
                  onChange={(e) => setTxCurrency(e.target.value as CurrencyCode)}
                  className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-xs text-[#1A1A1A] focus:outline-none focus:border-black"
                >
                  {wallet && Object.keys(wallet.rates).map((code) => (
                    <option key={code} value={code}>{code} - {currencySymbols[code as CurrencyCode]}</option>
                  ))}
                </select>
              </div>

              {/* Merchant inputs */}
              <div>
                <label className="block text-[10px] uppercase font-mono font-bold tracking-widest text-[#9E9E9E] mb-1.5">Merchant / Source descriptor</label>
                <input
                  id="tx-merchant-destination-input"
                  type="text"
                  placeholder="e.g. Google Cloud Platform, Apple Store"
                  value={txMerchant}
                  onChange={(e) => setTxMerchant(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs text-[#1A1A1A] focus:outline-none focus:border-black"
                />
              </div>

              {/* Category mappings */}
              <div>
                <label className="block text-[10px] uppercase font-mono font-bold tracking-widest text-[#9E9E9E] mb-1.5">Category Designation</label>
                <select
                  id="tx-category-select"
                  value={txCategory}
                  onChange={(e) => setTxCategory(e.target.value as TransactionCategory)}
                  className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-xs text-[#1A1A1A] focus:outline-none"
                >
                  {Object.values(TransactionCategory).map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Touch ID Authentication security settings */}
              {wallet?.biometricsEnabled && (
                <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Fingerprint className="h-5 w-5 text-emerald-500 animate-pulse" />
                    <div>
                      <p className="text-[11px] font-bold text-zinc-700">Enforce Biometric Locks</p>
                      <p className="text-[9px] text-zinc-500">Require scanned touch verification link prior to completion</p>
                    </div>
                  </div>
                  <input
                    id="tx-biometric-enforce-checkbox"
                    type="checkbox"
                    checked={requireBiometrics}
                    onChange={(e) => setRequireBiometrics(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-300 text-black focus:ring-black cursor-pointer"
                  />
                </div>
              )}

              <button
                id="submit-new-tx-action"
                onClick={handleCreateTransaction}
                className="w-full py-3 mt-2 bg-black text-white text-xs font-semibold uppercase tracking-wider rounded-xl hover:bg-zinc-800 transition-colors cursor-pointer shadow-sm"
              >
                Authenticate & Clear Ledger
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ADJUST BUDGET LIMITS MODAL */}
      {isBudgetModalOpen && (
        <div id="budget-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div id="budget-modal-container" className="w-full max-w-md bg-white rounded-[32px] border border-[#E5E5E5] overflow-hidden shadow-2xl p-6 text-[#1A1A1A]">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4 mb-5">
              <div>
                <h4 className="font-semibold text-lg text-[#1A1A1A]">Dynamic Budget Thresholds</h4>
                <p className="text-xs text-[#9E9E9E]">Recalibrated in selected local currency base {preferredCurrencyCode}</p>
              </div>
              <button 
                id="close-budget-modal-puck"
                onClick={() => setIsBudgetModalOpen(false)} 
                className="w-8 h-8 rounded-full bg-[#F8F9FA] flex items-center justify-center border border-zinc-200 text-zinc-400 hover:text-black hover:bg-zinc-50 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
              {Object.values(TransactionCategory).map((cat) => {
                const currentVal = tempBudgets[cat] || 0;
                return (
                  <div key={cat} className="space-y-1.5 p-3 rounded-xl border border-zinc-150 bg-[#F8F9FA]">
                    <div className="flex justify-between items-center text-xs font-bold font-mono">
                      <span className="text-[#1A1A1A] truncate">{cat}</span>
                      <span className="text-zinc-500 font-mono">{currentSymbol}{Math.round(currentVal).toLocaleString()}</span>
                    </div>
                    
                    <div className="flex gap-2 items-center">
                      <input
                        id={`budget-slider-control-${cat}`}
                        type="range"
                        min="0"
                        max="2500"
                        step="50"
                        value={currentVal}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setTempBudgets(prev => ({ ...prev, [cat]: val }));
                        }}
                        className="flex-1 accent-black h-1 rounded-lg cursor-pointer bg-zinc-200"
                      />
                      <button
                        id={`budget-individual-save-${cat}`}
                        onClick={() => handleSaveBudgetLimit(cat, currentVal)}
                        className="px-2.5 py-1 bg-black text-white text-[10px] uppercase font-mono tracking-wider rounded-md hover:bg-zinc-800 transition-colors cursor-pointer"
                      >
                        Set
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-[10px] text-zinc-400 font-mono mt-4 leading-normal leading-relaxed text-center">
              *All budget changes convert back to main USD rates securely to maintain historical parity graphs.
            </p>
          </div>
        </div>
      )}

      {/* MODAL 3: SCHEDULE RECURRING OUTLAY */}
      {isRecurringModalOpen && (
        <div id="recurring-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div id="recurring-modal-container" className="w-full max-w-md bg-white rounded-[32px] border border-[#E5E5E5] overflow-hidden shadow-2xl p-6 text-[#1A1A1A]">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4 mb-5">
              <div>
                <h4 className="font-semibold text-lg text-[#1A1A1A]">Configure Monitored Outlay</h4>
                <p className="text-xs text-[#9E9E9E]">Auto-registered recurring bills mapped securely prior to due calendars</p>
              </div>
              <button 
                id="close-recurring-modal-puck"
                onClick={() => setIsRecurringModalOpen(false)} 
                className="w-8 h-8 rounded-full bg-[#F8F9FA] flex items-center justify-center border border-zinc-200 text-zinc-400 hover:text-black hover:bg-zinc-50 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              
              {/* Name description */}
              <div>
                <label className="block text-[10px] uppercase font-mono font-bold tracking-widest text-[#9E9E9E] mb-1.5">Monitored Service Name</label>
                <input
                  id="rec-form-name-input"
                  type="text"
                  placeholder="e.g. Netflix Premium Master, Rent Workspace"
                  value={recName}
                  onChange={(e) => setRecName(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs text-[#1A1A1A] focus:outline-none focus:border-black"
                />
              </div>

              {/* Amount block */}
              <div>
                <label className="block text-[10px] uppercase font-mono font-bold tracking-widest text-[#9E9E9E] mb-1.5">Recurring Charge Sum</label>
                <div className="relative rounded-xl border border-zinc-200 overflow-hidden bg-white shadow-xs focus-within:border-black transition-colors flex items-center">
                  <span className="pl-3.5 text-sm font-bold font-mono text-zinc-500">{recCurrency}</span>
                  <input
                    id="rec-form-amount-input"
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={recAmount}
                    onChange={(e) => setRecAmount(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm font-mono focus:outline-none text-[#1A1A1A]"
                  />
                </div>
              </div>

              {/* Select currency */}
              <div>
                <label className="block text-[10px] uppercase font-mono font-bold tracking-widest text-[#9E9E9E] mb-1.5">Payout currency</label>
                <select
                  id="rec-form-currency-select"
                  value={recCurrency}
                  onChange={(e) => setRecCurrency(e.target.value as CurrencyCode)}
                  className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-xs text-[#1A1A1A] focus:outline-none"
                >
                  {wallet && Object.keys(wallet.rates).map((code) => (
                    <option key={code} value={code}>{code}</option>
                  ))}
                </select>
              </div>

              {/* Frequency options */}
              <div>
                <label className="block text-[10px] uppercase font-mono font-bold tracking-widest text-[#9E9E9E] mb-1.5">Calendar Period Frequency</label>
                <select
                  id="rec-form-frequency-select"
                  value={recFrequency}
                  onChange={(e) => setRecFrequency(e.target.value as any)}
                  className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-xs text-[#1A1A1A] focus:outline-none"
                >
                  <option value="daily">Daily Schedule Check</option>
                  <option value="weekly">Weekly Schedule Outlay</option>
                  <option value="monthly">Monthly Subscription Stack</option>
                  <option value="yearly">Yearly Anchor Payment</option>
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="block text-[10px] uppercase font-mono font-bold tracking-widest text-[#9E9E9E] mb-1.5">Finance Category</label>
                <select
                  id="rec-form-category-select"
                  value={recCategory}
                  onChange={(e) => setRecCategory(e.target.value as TransactionCategory)}
                  className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-xs text-[#1A1A1A] focus:outline-none"
                >
                  {Object.values(TransactionCategory).map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <button
                id="rec-form-submit-action"
                onClick={handleCreateRecurring}
                className="w-full py-3 mt-2 bg-black text-white text-xs font-semibold uppercase tracking-wider rounded-xl hover:bg-zinc-800 transition-colors cursor-pointer shadow-sm"
              >
                Schedule Monitored Period
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
