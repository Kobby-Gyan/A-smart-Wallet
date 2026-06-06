import React, { useState } from "react";
import { Coins, RefreshCw, Layers, Check } from "lucide-react";
import { CurrencyCode } from "../types";

interface CurrencySelectorProps {
  currentPreferred: CurrencyCode;
  rates: Record<CurrencyCode, number>;
  onSelect: (code: CurrencyCode) => void;
  onSync: () => Promise<void>;
}

export default function CurrencySelector({
  currentPreferred,
  rates,
  onSelect,
  onSync
}: CurrencySelectorProps) {
  const [syncing, setSyncing] = useState(false);

  const handleSyncClick = async () => {
    setSyncing(true);
    try {
      await onSync();
    } catch (err) {
      console.error(err);
    } finally {
      // Allow slight spin duration for aesthetics
      setTimeout(() => setSyncing(false), 900);
    }
  };

  const currencyMetadata: Record<CurrencyCode, { symbol: string; name: string; flag: string }> = {
    USD: { symbol: "$", name: "United States Dollar", flag: "🇺🇸" },
    EUR: { symbol: "€", name: "Eurozone Currency", flag: "🇪🇺" },
    GBP: { symbol: "£", name: "British Sterling", flag: "🇬🇧" },
    JPY: { symbol: "¥", name: "Japanese Yen", flag: "🇯🇵" },
    CAD: { symbol: "CA$", name: "Canadian Dollar", flag: "🇨🇦" },
    AUD: { symbol: "A$", name: "Australian Dollar", flag: "🇦🇺" }
  };

  return (
    <div id="currency-sync-card" className="flex flex-col gap-4 rounded-[32px] border border-[#E5E5E5] bg-white p-6 shadow-xs">
      <div className="flex items-center justify-between">
        <label className="text-[10px] uppercase tracking-widest text-[#9E9E9E] font-mono font-bold">Multi-Currency Syncing</label>
        <button
          id="sync-rates-action-btn"
          onClick={handleSyncClick}
          disabled={syncing}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-[#E5E5E5] px-3 py-1 text-xs text-[#1A1A1A] hover:bg-[#F8F9FA] transition-colors disabled:opacity-50 cursor-pointer font-mono font-bold"
        >
          <RefreshCw className={`h-3 w-3 ${syncing ? "animate-spin text-black" : "text-zinc-400"}`} />
          <span>{syncing ? "SYNCING..." : "SYNC FOREX"}</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {Object.entries(currencyMetadata).map(([codeStr, meta]) => {
          const code = codeStr as CurrencyCode;
          const isSelected = code === currentPreferred;
          const usdValue = rates[code];
          
          return (
            <button
              id={`currency-select-btn-${code}`}
              key={code}
              onClick={() => onSelect(code)}
              className={`flex flex-col items-start rounded-xl p-3 text-left border transition-all cursor-pointer ${
                isSelected
                  ? "border-black bg-zinc-50 shadow-xs"
                  : "border-zinc-100 bg-white hover:bg-zinc-50"
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <span className="text-sm font-bold tracking-tight text-[#1A1A1A] flex items-center gap-1">
                  <span>{meta.flag}</span>
                  <span>{code}</span>
                </span>
                {isSelected && <Check className="h-3.5 w-3.5 text-black" />}
              </div>
              <div className="mt-1 w-full flex items-center justify-between font-mono text-[9px] text-[#9E9E9E]">
                <span>{meta.symbol}1</span>
                <span className="text-[#1A1A1A] font-semibold">
                  {code === "USD" ? "Base" : `$${usdValue?.toFixed(2)}`}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="rounded-xl bg-[#F8F9FA] p-3 flex items-start gap-2 border border-[#E5E5E5]">
        <Layers className="h-4 w-4 text-[#9E9E9E] flex-shrink-0 mt-0.5" />
        <span className="text-[10px] text-[#9E9E9E] leading-relaxed">
          Forex tickers auto-sync with master cloud indices to convert spent thresholds dynamically.
        </span>
      </div>
    </div>
  );
}
