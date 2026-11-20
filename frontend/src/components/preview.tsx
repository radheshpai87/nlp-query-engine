"use client";

import * as React from "react";
import { Database, Layers, Zap, Lock, Sparkles, CheckCircle2 } from "lucide-react";

export const Preview = () => {
  const [selectedClarification, setSelectedClarification] = React.useState(0);

  return (
    <div className="relative mx-auto mt-16 sm:mt-20 max-w-4xl">
      {/* Sleek App Window */}
      <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0B0E14] shadow-[0_24px_70px_-15px_rgba(0,0,0,0.9),0_0_40px_-10px_rgba(245,158,11,0.12)]">
        {/* Window Bar */}
        <div className="flex h-11 items-center justify-between border-b border-white/5 bg-[#080B10] px-5">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
            <span className="ml-3 text-xs text-slate-400 font-mono">
              nexus-query · read-only workspace
            </span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-0.5 text-[11px] text-amber-400 font-mono">
            <Lock className="h-3 w-3" />
            <span>Read-only</span>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* User Message Bubble */}
          <div className="flex justify-end">
            <div className="rounded-2xl rounded-tr-sm bg-slate-800/90 border border-white/10 px-5 py-3 text-xs sm:text-sm text-slate-100 max-w-lg shadow-sm leading-relaxed">
              Which customers generated the highest revenue last month?
            </div>
          </div>

          {/* Engine Clarification Bubble */}
          <div className="space-y-3.5 max-w-xl">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Nexus Assistant</span>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Before running, two values need a definition. How would you like to define &quot;highest revenue&quot;?
            </p>

            {/* Clickable Clarification Options */}
            <div className="flex flex-wrap gap-2.5 pt-1">
              {[
                "Lifetime spend above $1,000",
                "Single order above $1,000",
                "Top 10% of customers",
              ].map((opt, idx) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setSelectedClarification(idx)}
                  className={`flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-medium transition-all ${
                    selectedClarification === idx
                      ? "border-amber-500/60 bg-amber-500/15 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                      : "border-white/10 bg-slate-900/60 text-slate-400 hover:border-white/20 hover:text-slate-200"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      selectedClarification === idx
                        ? "bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.6)]"
                        : "bg-slate-600"
                    }`}
                  />
                  <span>{opt}</span>
                </button>
              ))}
            </div>

            {/* Clean Result Preview Table */}
            <div className="mt-4 overflow-hidden rounded-lg border border-white/10 bg-slate-950/80">
              <div className="flex items-center justify-between border-b border-white/5 bg-slate-900/40 px-4 py-2 text-[10px] font-mono text-slate-400">
                <span>Result preview · customers</span>
                <span className="text-amber-400 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="h-3 w-3" />
                  Read-only verified
                </span>
              </div>

              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="border-b border-white/5 bg-slate-900/20 text-[11px] font-mono text-slate-400">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Customer</th>
                    <th className="px-4 py-2.5 font-medium">Spend</th>
                    <th className="px-4 py-2.5 font-medium">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <tr className="hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5 font-medium text-slate-200">A. Sharma</td>
                    <td className="px-4 py-2.5 font-mono text-amber-400 font-semibold">$4,250</td>
                    <td className="px-4 py-2.5 text-slate-400 text-xs font-mono">PostgreSQL</td>
                  </tr>
                  <tr className="hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5 font-medium text-slate-200">M. Okafor</td>
                    <td className="px-4 py-2.5 font-mono text-amber-400 font-semibold">$3,100</td>
                    <td className="px-4 py-2.5 text-slate-400 text-xs font-mono">PostgreSQL</td>
                  </tr>
                  <tr className="hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5 font-medium text-slate-200">L. Chen</td>
                    <td className="px-4 py-2.5 font-mono text-amber-400 font-semibold">$2,890</td>
                    <td className="px-4 py-2.5 text-slate-400 text-xs font-mono">PostgreSQL</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="border-t border-white/5 bg-[#080B10] px-5 py-3 text-center text-[11px] text-slate-500">
          Illustrative interface. Figures are example data, not results from your databases.
        </div>
      </div>
    </div>
  );
};
