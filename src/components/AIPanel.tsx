import React, { useState, useEffect } from "react";
import { Sparkles, TrendingDown, TrendingUp, AlertTriangle, Zap, Lightbulb } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { SpendingInsight } from "../types";

interface AIPanelProps {
  onTriggerFetch: () => Promise<SpendingInsight[]>;
  initialInsights?: SpendingInsight[];
}

export default function AIPanel({ onTriggerFetch, initialInsights = [] }: AIPanelProps) {
  const [insights, setInsights] = useState<SpendingInsight[]>(initialInsights);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await onTriggerFetch();
      setInsights(result);
    } catch (err: any) {
      setError("Unable to synthesize real-time Gemini parameters at this time.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialInsights.length > 0) {
      setInsights(initialInsights);
    } else {
      fetchInsights();
    }
  }, [initialInsights]);

  return (
    <div id="ai-smart-insights-card" className="relative overflow-hidden rounded-[32px] border border-[#E5E5E5] bg-white p-6 md:p-8 shadow-xs">
      <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />
      
      <div className="mb-4 flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-widest text-[#9E9E9E] font-mono font-bold flex items-center gap-1.5">
            <span>Gemini Smart Analyzer</span>
            <span className="rounded bg-zinc-150 px-1.5 py-0.5 text-[8px] font-bold text-[#1A1A1A] tracking-wider uppercase">Active</span>
          </label>
          <p className="text-xs text-[#9E9E9E] font-light">Real-time spending habits & predictive audit models</p>
        </div>
        <button
          id="regenerate-ai-insights-btn"
          onClick={fetchInsights}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-[#E5E5E5] bg-white px-3.5 py-1 text-xs text-[#1A1A1A] hover:bg-[#F8F9FA] transition-colors disabled:opacity-50 cursor-pointer font-mono font-bold"
        >
          <Zap className="h-3 w-3 text-amber-500" />
          <span>{loading ? "SYNTHESIZING..." : "ANALYZE"}</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3 py-2"
          >
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
                <div id={`shimmer-circle-${i}`} className="h-8 w-8 animate-pulse rounded-full bg-zinc-200" />
                <div className="flex-1 space-y-2">
                  <div id={`shimmer-[#1]-${i}`} className="h-3.5 w-1/3 animate-pulse rounded bg-zinc-200" />
                  <div id={`shimmer-[#2]-${i}`} className="h-3 w-4/5 animate-pulse rounded bg-zinc-100" />
                </div>
              </div>
            ))}
          </motion.div>
        ) : error ? (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border border-red-200 bg-red-50/50 p-4 text-center text-xs text-red-600"
          >
            <span>{error}</span>
          </motion.div>
        ) : (
          <motion.div
            key="insights"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            {insights.map((insight, idx) => {
              const isNegative = insight.impact === "negative";
              const isPositive = insight.impact === "positive";
              
              return (
                <div
                  id={`ai-insight-item-${insight.id || idx}`}
                  key={insight.id || idx}
                  className="group relative flex gap-3.5 rounded-2xl border border-zinc-100 bg-white p-4 hover:border-zinc-200 hover:bg-zinc-50 transition-all duration-350"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {isPositive ? (
                      <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600 border border-emerald-100">
                        <TrendingDown className="h-4 w-4" />
                      </div>
                    ) : isNegative ? (
                      <div className="rounded-lg bg-red-50 p-2 text-red-500 border border-red-100 animate-pulse">
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                    ) : (
                      <div className="rounded-lg bg-zinc-50 p-2 text-zinc-600 border border-zinc-155">
                        <Lightbulb className="h-4 w-4" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#1A1A1A]">{insight.title}</span>
                      {insight.category && (
                        <span className="rounded bg-zinc-100 text-[#1A1A1A] border border-zinc-200 px-1.5 py-0.5 text-[8px] font-mono tracking-tight font-semibold">
                          {insight.category.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-[#9E9E9E] leading-relaxed font-light">
                      {insight.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-4 flex items-center gap-1.5 justify-end text-[9px] text-[#9E9E9E] font-mono tracking-widest px-1 font-bold">
        <span>POWERED BY GEMINI PRO COGNITIVE CORE</span>
      </div>
    </div>
  );
}
