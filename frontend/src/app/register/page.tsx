"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Lock,
  Mail,
  User,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { registerWithCredentials } from "@/lib/auth-api";
import { useShellStore } from "@/lib/store";

export default function RegisterPage() {
  const router = useRouter();
  const { setCurrentUser } = useShellStore();

  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Password validation checks
  const hasMinLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const passwordsMatch = password && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!hasMinLength) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (!passwordsMatch) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const result = await registerWithCredentials(fullName.trim(), email.trim(), password);
      setCurrentUser(result.user);
      router.push("/onboarding");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Registration failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between p-4 sm:p-6 antialiased selection:bg-brand/30">
      {/* Top Header */}
      <div className="flex items-center justify-between max-w-5xl mx-auto w-full py-2">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="h-8 w-8 rounded-lg bg-brand-muted border border-brand/20 flex items-center justify-center text-brand group-hover:scale-105 transition-transform">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="font-semibold text-sm tracking-tight text-white">Nexus Query</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-muted text-brand border border-brand/20">
            Enterprise
          </span>
        </Link>

        <div className="flex items-center gap-3 text-xs text-zinc-400">
          <span>Already have an account?</span>
          <Link
            href="/login"
            className="text-foreground hover:text-brand font-medium transition-colors"          >
            Sign In
          </Link>
        </div>
      </div>

      {/* Main Registration Card */}
      <div className="max-w-md mx-auto w-full my-auto py-8">
        <div className="bg-card border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white tracking-tight">Create your account</h1>
            <p className="text-xs text-zinc-400 mt-1.5">
              Start querying PostgreSQL, MongoDB, and Elasticsearch with natural language.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5 text-rose-400 text-xs animate-in fade-in-50">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  required
                  placeholder="Jane Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full h-10 bg-background border border-zinc-700/80 rounded-xl pl-9 pr-3 text-xs text-foreground placeholder:text-zinc-500 focus:outline-none focus:border-brand transition-colors"                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Work Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                <input
                  type="email"
                  required
                  placeholder="jane@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-10 bg-background border border-zinc-700/80 rounded-xl pl-9 pr-3 text-xs text-foreground placeholder:text-zinc-500 focus:outline-none focus:border-brand transition-colors"                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Minimum 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-10 bg-background border border-zinc-700/80 rounded-xl pl-9 pr-10 text-xs text-foreground placeholder:text-zinc-500 focus:outline-none focus:border-brand transition-colors"                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-zinc-500 hover:text-zinc-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full h-10 bg-background border border-zinc-700/80 rounded-xl pl-9 pr-3 text-xs text-foreground placeholder:text-zinc-500 focus:outline-none focus:border-brand transition-colors"                />
              </div>
            </div>

            {/* Validation checklist */}
            <div className="py-1 space-y-1 text-[11px] text-zinc-400">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className={`h-3 w-3 ${hasMinLength ? "text-brand" : "text-zinc-600"}`} />
                <span>At least 8 characters</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className={`h-3 w-3 ${passwordsMatch && confirmPassword ? "text-brand" : "text-zinc-600"}`} />
                <span>Passwords match</span>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || !hasMinLength || !passwordsMatch}
              className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-2 mt-4"            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-zinc-800/80 flex items-center justify-center gap-2 text-[11px] text-zinc-500">
            <ShieldCheck className="h-3.5 w-3.5 text-brand/80" />
            <span>Strict read-only query security & SHA-256 audit ledger</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-zinc-500 max-w-5xl mx-auto w-full py-4">
        &copy; 2026 Nexus Query Engine. Enterprise Heterogeneous Database Intelligence.
      </div>
    </div>
  );
}
