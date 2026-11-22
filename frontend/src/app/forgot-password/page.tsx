"use client";

import * as React from "react";
import Link from "next/link";
import { Sparkles, Mail, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NexusLogo } from "@/components/ui/nexus-logo";
import { requestPasswordReset } from "@/lib/auth-api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [resetToken, setResetToken] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await requestPasswordReset(email.trim());
      setSuccessMessage(res.message);
      if (res.reset_token) {
        setResetToken(res.reset_token);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Request failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between p-4 sm:p-6 antialiased selection:bg-brand/30">
      <div className="flex items-center justify-between max-w-5xl mx-auto w-full py-2">
        <Link href="/" className="flex items-center gap-2.5 group">
          <NexusLogo size={28} className="group-hover:scale-105 transition-transform" />
          <span className="font-semibold text-sm tracking-tight text-white">Nexus Query</span>
        </Link>

        <Link
          href="/login"
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-foreground transition-colors"        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Sign In</span>
        </Link>
      </div>

      <div className="max-w-md mx-auto w-full my-auto py-8">
        <div className="bg-card border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
          <div className="text-center mb-6">
            <NexusLogo size={42} className="mx-auto mb-3 drop-shadow-[0_0_15px_rgba(245,158,11,0.25)]" />
            <h1 className="text-2xl font-bold text-white tracking-tight">Reset your password</h1>
            <p className="text-xs text-zinc-400 mt-1.5">
              Enter your registered work email to receive password reset instructions.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5 text-rose-400 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMessage ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-brand-muted border border-brand/20 text-brand text-xs space-y-2">
                <div className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-brand" />
                  <span>Reset Instructions Dispatched</span>
                </div>
                <p className="text-zinc-400 leading-relaxed">{successMessage}</p>
                {resetToken && (
                  <div className="pt-2 border-t border-brand/20">
                    <p className="text-[11px] text-zinc-300 mb-1">Testing Token (Evaluation Mode):</p>
                    <code className="block p-2 rounded bg-black/50 text-[10px] font-mono break-all text-brand select-all">
                      {resetToken}
                    </code>
                    <Link
                      href={`/reset-password?token=${encodeURIComponent(resetToken)}`}
                      className="inline-flex items-center gap-1.5 mt-2.5 text-xs text-brand hover:underline"
                    >
                      <span>Proceed to reset password</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                )}
              </div>

              <Link href="/login" className="block">
                <Button variant="outline" className="w-full text-xs">
                  Return to Sign In
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Registered Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                  <input
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-10 bg-background border border-zinc-700/80 rounded-xl pl-9 pr-3 text-xs text-foreground placeholder:text-zinc-500 focus:outline-none focus:border-brand transition-colors"                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-2"              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>Send Reset Instructions</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          )}
        </div>
      </div>

      <div className="text-center text-xs text-zinc-500 max-w-5xl mx-auto w-full py-4">
        &copy; 2026 Nexus Query Engine.
      </div>
    </div>
  );
}
