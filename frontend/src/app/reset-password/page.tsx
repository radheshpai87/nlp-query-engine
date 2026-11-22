"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles, Lock, KeyRound, ArrowRight, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NexusLogo } from "@/components/ui/nexus-logo";
import { resetPasswordWithToken } from "@/lib/auth-api";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token") || "";

  const [token, setToken] = React.useState(tokenFromUrl);
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await resetPasswordWithToken(token.trim(), password);
      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Password reset failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
      <div className="text-center mb-6">
        <NexusLogo size={42} className="mx-auto mb-3 drop-shadow-[0_0_15px_rgba(245,158,11,0.25)]" />
        <h1 className="text-2xl font-bold text-white tracking-tight">Set new password</h1>
        <p className="text-xs text-zinc-400 mt-1.5">
          Enter your verification token and your new account password.
        </p>
      </div>

      {error && (
        <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5 text-rose-400 text-xs">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success ? (
        <div className="p-4 rounded-xl bg-brand-muted border border-brand/20 text-brand text-xs text-center space-y-3">
          <CheckCircle2 className="h-8 w-8 text-brand mx-auto" />
          <h2 className="font-semibold text-sm text-white">Password Reset Successful!</h2>
          <p className="text-zinc-400">Your password has been securely updated. Redirecting to sign in...</p>
          <Link href="/login" className="inline-block pt-2 text-brand hover:underline">
            Click here if not redirected automatically
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">Reset Token</label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                required
                placeholder="Paste token received"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full h-10 bg-background border border-zinc-700/80 rounded-xl pl-9 pr-3 text-xs text-foreground placeholder:text-zinc-500 focus:outline-none focus:border-brand transition-colors font-mono"              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">New Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
              <input
                type="password"
                required
                placeholder="Minimum 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-10 bg-background border border-zinc-700/80 rounded-xl pl-9 pr-3 text-xs text-foreground placeholder:text-zinc-500 focus:outline-none focus:border-brand transition-colors"              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">Confirm New Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
              <input
                type="password"
                required
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full h-10 bg-background border border-zinc-700/80 rounded-xl pl-9 pr-3 text-xs text-foreground placeholder:text-zinc-500 focus:outline-none focus:border-brand transition-colors"              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading || !token.trim() || password.length < 8 || password !== confirmPassword}
            className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-2 mt-2"          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Updating Password...</span>
              </>
            ) : (
              <>
                <span>Update Password</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between p-4 sm:p-6 antialiased selection:bg-brand/30">
      <div className="flex items-center justify-between max-w-5xl mx-auto w-full py-2">
        <Link href="/" className="flex items-center gap-2.5 group">
          <NexusLogo size={28} className="group-hover:scale-105 transition-transform" />
          <span className="font-semibold text-sm tracking-tight text-white">Nexus Query</span>
        </Link>

        <Link
          href="/login"
          className="text-xs text-zinc-400 hover:text-foreground transition-colors"        >
          Sign In
        </Link>
      </div>

      <div className="max-w-md mx-auto w-full my-auto py-8">
        <React.Suspense fallback={<div className="text-center text-xs text-zinc-500">Loading form...</div>}>
          <ResetPasswordForm />
        </React.Suspense>
      </div>

      <div className="text-center text-xs text-zinc-500 max-w-5xl mx-auto w-full py-4">
        &copy; 2026 Nexus Query Engine.
      </div>
    </div>
  );
}
