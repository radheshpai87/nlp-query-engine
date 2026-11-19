"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  KeyRound,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DEMO_CREDENTIALS,
  loginWithCredentials,
  getStoredUser,
} from "@/lib/auth-api";
import { useShellStore } from "@/lib/store";

export default function LoginPage() {
  const router = useRouter();
  const { setCurrentUser } = useShellStore();

  const [email, setEmail] = React.useState<string>(DEMO_CREDENTIALS.email);
  const [password, setPassword] = React.useState<string>(DEMO_CREDENTIALS.password);
  const [showPassword, setShowPassword] = React.useState<boolean>(false);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<boolean>(false);

  // Check if already logged in
  React.useEffect(() => {
    const existing = getStoredUser();
    if (existing) {
      setCurrentUser(existing);
    }
  }, [setCurrentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await loginWithCredentials(email.trim(), password);
      setCurrentUser(result.user);
      setSuccess(true);
      setTimeout(() => {
        router.push("/chat");
      }, 500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Authentication failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleAutofill = () => {
    setEmail(DEMO_CREDENTIALS.email);
    setPassword(DEMO_CREDENTIALS.password);
    setError(null);
  };

  const handleQuickLogin = async () => {
    setEmail(DEMO_CREDENTIALS.email);
    setPassword(DEMO_CREDENTIALS.password);
    setError(null);
    setLoading(true);

    try {
      const result = await loginWithCredentials(
        DEMO_CREDENTIALS.email,
        DEMO_CREDENTIALS.password
      );
      setCurrentUser(result.user);
      setSuccess(true);
      setTimeout(() => {
        router.push("/chat");
      }, 400);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Authentication failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#111111] text-[#ececec] flex flex-col justify-between p-4 sm:p-6 antialiased selection:bg-[#10a37f]/30">
      {/* Top Header */}
      <div className="flex items-center justify-between max-w-5xl mx-auto w-full py-2">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1a1a1a] text-[#10a37f] border border-[#2a2a2a] group-hover:border-[#10a37f]/50 transition-colors">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="font-medium text-xs sm:text-sm tracking-tight text-white">
            Nexus Query
          </span>
        </Link>
        <Link
          href="/"
          className="text-xs text-[#888888] hover:text-white transition-colors"
        >
          ← Back to Overview
        </Link>
      </div>

      {/* Main Center Card */}
      <div className="max-w-md w-full mx-auto my-auto space-y-5">
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#10a37f]/10 border border-[#10a37f]/30 text-[#10a37f] text-xs font-medium">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Secure AST Engine Access</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Sign in to Nexus Query
          </h1>
          <p className="text-xs text-[#888888] max-w-sm mx-auto">
            Federate queries across PostgreSQL, MongoDB, and Elasticsearch with zero silent assumptions.
          </p>
        </div>

        {/* Highlighted Demo Credentials Box */}
        <div className="rounded-xl border border-[#2d2d2d] bg-[#171717] p-4 space-y-3 shadow-lg">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-zinc-300 font-medium">
              <KeyRound className="h-4 w-4 text-[#10a37f]" />
              <span>Demo Credentials</span>
            </div>
            <span className="text-[10px] font-mono text-[#10a37f] bg-[#10a37f]/10 px-2 py-0.5 rounded border border-[#10a37f]/20">
              Pre-Seeded Admin
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-[#111111] p-2.5 rounded-lg border border-[#242424]">
            <div>
              <span className="text-[10px] text-[#666666] block uppercase tracking-wider font-sans">
                Email
              </span>
              <span className="text-zinc-200 select-all">{DEMO_CREDENTIALS.email}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#666666] block uppercase tracking-wider font-sans">
                Password
              </span>
              <span className="text-zinc-200 select-all">{DEMO_CREDENTIALS.password}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAutofill}
              className="flex-1 border-[#2e2e2e] bg-[#202020] hover:bg-[#282828] text-xs text-[#cccccc] h-8"
            >
              Autofill Fields
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleQuickLogin}
              disabled={loading}
              className="flex-1 bg-[#10a37f] hover:bg-[#0d8a6c] text-white text-xs font-medium h-8 gap-1.5 shadow-sm"
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ArrowRight className="h-3.5 w-3.5" />
              )}
              <span>1-Click Sign In</span>
            </Button>
          </div>
        </div>

        {/* Login Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-[#282828] bg-[#181818] p-5 space-y-4 shadow-xl text-left"
        >
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-950/40 border border-red-800/50 text-red-300 text-xs animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 text-xs animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>Authentication verified. Redirecting to assistant...</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300 block">
              Email Address
            </label>
            <div className="relative">
              <Mail className="h-4 w-4 text-[#777777] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full h-9 pl-9 pr-3 rounded-lg bg-[#121212] border border-[#2e2e2e] text-xs text-white placeholder:text-[#555555] focus:outline-hidden focus:border-[#10a37f] transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-zinc-300 block">
                Password
              </label>
            </div>
            <div className="relative">
              <Lock className="h-4 w-4 text-[#777777] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-9 pl-9 pr-9 rounded-lg bg-[#121212] border border-[#2e2e2e] text-xs text-white placeholder:text-[#555555] focus:outline-hidden focus:border-[#10a37f] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#777777] hover:text-[#cccccc] p-1"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-9 bg-white hover:bg-zinc-200 text-black text-xs font-medium rounded-lg gap-2 mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Verifying credentials...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </Button>
        </form>

        <div className="text-center">
          <Link
            href="/chat"
            className="text-xs text-[#777777] hover:text-[#10a37f] transition-colors inline-flex items-center gap-1"
          >
            <span>Continue as guest session</span>
            <span>→</span>
          </Link>
        </div>
      </div>

      {/* Footer info */}
      <div className="text-center text-[11px] text-[#666666] py-3">
        <span>Protected by SHA-256 JWT & Read-Only AST Guard · Local Instance 127.0.0.1</span>
      </div>
    </div>
  );
}
