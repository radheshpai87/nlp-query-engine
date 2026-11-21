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
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  loginWithCredentials,
  getStoredUser,
} from "@/lib/auth-api";
import { useShellStore } from "@/lib/store";

export default function LoginPage() {
  const router = useRouter();
  const { setCurrentUser, setCurrentWorkspace } = useShellStore();

  const [email, setEmail] = React.useState<string>("");
  const [password, setPassword] = React.useState<string>("");
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
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const result = await loginWithCredentials(email.trim(), password);
      setCurrentUser(result.user);
      if (result.user.default_workspace_id) {
        setCurrentWorkspace({
          id: result.user.default_workspace_id,
          name: "Nexus Query",
          role: "admin",
        });
      }
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

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between p-4 sm:p-6 antialiased selection:bg-brand/30">
      {/* Top Header */}
      <div className="flex items-center justify-between max-w-5xl mx-auto w-full py-2">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-brand border border-muted group-hover:border-brand/50 transition-colors">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="font-medium text-xs sm:text-sm tracking-tight text-white">
            Nexus Query
          </span>
        </Link>
        <Link
          href="/"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"        >
          ← Back to Overview
        </Link>
      </div>

      {/* Main Center Card */}
      <div className="max-w-md w-full mx-auto my-auto space-y-5">
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand/10 border border-brand/30 text-brand text-xs font-medium">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Secure AST Engine Access</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Sign in to Nexus Query
          </h1>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Federate queries across PostgreSQL, MongoDB, and Elasticsearch with zero silent assumptions.
          </p>
        </div>

        {/* Login Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-xl text-left"
        >
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-950/40 border border-red-800/50 text-red-300 text-xs animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-brand-muted border border-brand/30 text-brand text-xs animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-brand" />
              <span>Authentication verified. Redirecting to assistant...</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300 block">
              Email Address
            </label>
            <div className="relative">
              <Mail className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full h-9 pl-9 pr-3 rounded-lg bg-background border border-secondary text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:border-brand transition-colors"              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-zinc-300 block">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-[11px] text-zinc-400 hover:text-brand transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-9 pl-9 pr-9 rounded-lg bg-background border border-secondary text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:border-brand transition-colors"              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
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

        <div className="flex items-center justify-between text-xs pt-1">
          <Link
            href="/register"
            className="text-brand hover:text-brand font-medium transition-colors"
          >
            Create new account →
          </Link>
          <Link
            href="/chat"
            className="text-muted-foreground hover:text-zinc-300 transition-colors inline-flex items-center gap-1"
          >
            <span>Explore as guest</span>
            <span>→</span>
          </Link>
        </div>
      </div>

      {/* Footer info */}
      <div className="text-center text-[11px] text-muted-foreground py-3">
        <span>Protected by SHA-256 JWT & Read-Only AST Guard · Local Instance 127.0.0.1</span>
      </div>
    </div>
  );
}
