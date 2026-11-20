"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Building2,
  Database,
  Search,
  MessageSquare,
  Shield,
  Layers,
  ChevronRight,
  Loader2,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useShellStore } from "@/lib/store";
import { updateUserProfile, getStoredUser } from "@/lib/auth-api";

export default function OnboardingPage() {
  const router = useRouter();
  const { currentUser, setCurrentUser, currentWorkspace, setCurrentWorkspace } = useShellStore();

  const [step, setStep] = React.useState<number>(1);
  const [role, setRole] = React.useState<string>("Data Analyst");
  const [workspaceName, setWorkspaceName] = React.useState<string>(
    currentUser?.full_name ? `${currentUser.full_name}'s Analytics` : "Acme Analytics"
  );
  const [selectedDbChoice, setSelectedDbChoice] = React.useState<"demo" | "custom">("demo");
  const [saving, setSaving] = React.useState<boolean>(false);

  React.useEffect(() => {
    const existing = getStoredUser();
    if (existing) {
      setCurrentUser(existing);
      if (existing.full_name) {
        setWorkspaceName(`${existing.full_name}'s Analytics`);
      }
    }
  }, [setCurrentUser]);

  const handleComplete = async () => {
    setSaving(true);
    try {
      if (currentUser?.id) {
        const updated = await updateUserProfile({ onboarding_completed: true });
        setCurrentUser(updated);
      }
    } catch {
      // Proceed even if network has delay
    } finally {
      setSaving(false);
      router.push("/chat");
    }
  };

  return (
    <div className="min-h-screen bg-[#111111] text-[#ececec] flex flex-col justify-between p-4 sm:p-6 antialiased selection:bg-[#10a37f]/30">
      {/* Header */}
      <div className="flex items-center justify-between max-w-4xl mx-auto w-full py-4 border-b border-zinc-800/80">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <span className="font-semibold text-sm tracking-tight text-white block">Nexus Query Engine</span>
            <span className="text-[11px] text-zinc-400">Enterprise Onboarding Walkthrough</span>
          </div>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all duration-300 ${
                s === step
                  ? "w-8 bg-emerald-500"
                  : s < step
                  ? "w-2 bg-emerald-500/50"
                  : "w-2 bg-zinc-700"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-2xl mx-auto w-full my-auto py-8">
        <div className="bg-[#181818] border border-zinc-800 rounded-2xl p-6 sm:p-10 shadow-2xl relative">
          {/* STEP 1: Welcome & Role */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in-50 duration-300">
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Welcome to Nexus Query</h1>
                <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                  Tell us about your primary role so we can tailor the ambiguity detection and query explanation vocabulary.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-300">What is your primary persona?</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {[
                    { title: "Data Analyst", desc: "Complex multi-table queries, CSV export & schema graphs" },
                    { title: "Business Executive", desc: "Executive KPI summaries, revenue metrics & visualizations" },
                    { title: "Product Manager", desc: "User events, retention metrics & feature usage analysis" },
                    { title: "Database Administrator", desc: "Cross-database topologies, access controls & audit logs" },
                  ].map((item) => (
                    <button
                      type="button"
                      key={item.title}
                      onClick={() => setRole(item.title)}
                      className={`text-left p-3.5 rounded-xl border transition-all ${
                        role === item.title
                          ? "bg-emerald-500/10 border-emerald-500 text-white shadow-sm shadow-emerald-900/20"
                          : "bg-[#212121] border-zinc-800 text-zinc-300 hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-white">{item.title}</span>
                        {role === item.title && <Check className="h-3.5 w-3.5 text-emerald-400" />}
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-1">{item.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end">
                <Button
                  onClick={() => setStep(2)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold gap-2"
                >
                  <span>Continue</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: Workspace Creation */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in-50 duration-300">
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Name your workspace</h1>
                <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                  Workspaces isolate database connections, schema graph topologies, and audit ledgers across teams.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-300">Workspace / Team Name</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                  <input
                    type="text"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    placeholder="Acme Global Analytics"
                    className="w-full h-10 bg-[#212121] border border-zinc-700/80 rounded-xl pl-9 pr-3 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
                <p className="text-[11px] text-zinc-500">You can invite teammates and manage role permissions later.</p>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <Button variant="ghost" onClick={() => setStep(1)} className="text-xs text-zinc-400">
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                  <span>Back</span>
                </Button>
                <Button
                  onClick={() => {
                    if (workspaceName.trim()) {
                      setCurrentWorkspace({ ...currentWorkspace, name: workspaceName.trim() });
                    }
                    setStep(3);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold gap-2"
                >
                  <span>Next Step</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: Database Selection */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in-50 duration-300">
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Connect your databases</h1>
                <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                  Choose how you want to start exploring heterogeneous databases.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedDbChoice("demo")}
                  className={`text-left p-4 rounded-xl border transition-all ${
                    selectedDbChoice === "demo"
                      ? "bg-emerald-500/10 border-emerald-500 text-white"
                      : "bg-[#212121] border-zinc-800 text-zinc-300 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-emerald-400" />
                      <span className="font-semibold text-xs text-white">
                        Use Pre-Configured Sample Cluster (Recommended)
                      </span>
                    </div>
                    {selectedDbChoice === "demo" && <Check className="h-4 w-4 text-emerald-400" />}
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed">
                    Instantly query connected PostgreSQL (E-Commerce), MongoDB (Product Reviews & Events), and Elasticsearch (Search Catalog & Telemetry).
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedDbChoice("custom")}
                  className={`text-left p-4 rounded-xl border transition-all ${
                    selectedDbChoice === "custom"
                      ? "bg-emerald-500/10 border-emerald-500 text-white"
                      : "bg-[#212121] border-zinc-800 text-zinc-300 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-emerald-400" />
                      <span className="font-semibold text-xs text-white">Connect Custom Databases Later</span>
                    </div>
                    {selectedDbChoice === "custom" && <Check className="h-4 w-4 text-emerald-400" />}
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed">
                    Proceed to dashboard now; you can add PostgreSQL, MongoDB, or Elasticsearch connections anytime in the Connections manager.
                  </p>
                </button>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <Button variant="ghost" onClick={() => setStep(2)} className="text-xs text-zinc-400">
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                  <span>Back</span>
                </Button>
                <Button
                  onClick={() => setStep(4)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold gap-2"
                >
                  <span>Preview First Query</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: First Query Walkthrough */}
          {step === 4 && (
            <div className="space-y-6 animate-in fade-in-50 duration-300">
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">How to ask your first question</h1>
                <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                  Our ambiguity engine automatically pathfinds multi-hop joins and asks for clarification when parameters are vague.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#212121] border border-zinc-800 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                  <MessageSquare className="h-4 w-4" />
                  <span>Try Asking:</span>
                </div>
                <div className="space-y-2 text-xs text-zinc-300 font-mono">
                  <p className="p-2.5 rounded-lg bg-black/40 border border-zinc-800 text-white">
                    "Which buyers purchased goods cheaper than 30?"
                  </p>
                  <p className="p-2.5 rounded-lg bg-black/40 border border-zinc-800 text-white">
                    "Show me the top 5 products by revenue this month."
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-1 text-[11px] text-zinc-400">
                  <Shield className="h-3.5 w-3.5 text-emerald-400" />
                  <span>100% Read-Only Assurance • Every query is recorded in the SHA-256 audit ledger.</span>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <Button variant="ghost" onClick={() => setStep(3)} className="text-xs text-zinc-400">
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                  <span>Back</span>
                </Button>
                <Button
                  onClick={handleComplete}
                  disabled={saving}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold gap-2 px-6"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Entering Workspace...</span>
                    </>
                  ) : (
                    <>
                      <span>Enter Workspace & Start Querying</span>
                      <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-zinc-500 max-w-4xl mx-auto w-full py-4">
        &copy; 2026 Nexus Query Engine. Enterprise Heterogeneous Database Intelligence.
      </div>
    </div>
  );
}
