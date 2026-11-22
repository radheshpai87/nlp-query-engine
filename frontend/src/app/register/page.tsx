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
import { API_BASE } from "@/lib/api-config";
import { useShellStore } from "@/lib/store";

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" {...props}>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

function GithubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

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

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);
    const err = urlParams.get("error");
    if (err) {
      setError(decodeURIComponent(err));
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

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

  const handleOAuthSignUp = (provider: "google" | "github") => {
    setError(null);
    window.location.href = `${API_BASE}/auth/${provider}/login?mode=signup`;
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
            className="text-foreground hover:text-brand font-medium transition-colors"
          >
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

          {/* OAuth Buttons */}
          <div className="grid grid-cols-2 gap-2.5 mb-4">
            <button
              type="button"
              onClick={() => handleOAuthSignUp("google")}
              disabled={loading}
              className="flex items-center justify-center gap-2 h-9 px-3 rounded-lg border border-border bg-muted/40 hover:bg-muted text-xs font-medium text-foreground transition-colors cursor-pointer disabled:opacity-50"
            >
              <GoogleIcon />
              <span>Google</span>
            </button>
            <button
              type="button"
              onClick={() => handleOAuthSignUp("github")}
              disabled={loading}
              className="flex items-center justify-center gap-2 h-9 px-3 rounded-lg border border-border bg-muted/40 hover:bg-muted text-xs font-medium text-foreground transition-colors cursor-pointer disabled:opacity-50"
            >
              <GithubIcon />
              <span>GitHub</span>
            </button>
          </div>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/70" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-card px-2 text-muted-foreground tracking-wider">
                or register with email
              </span>
            </div>
          </div>

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
                  className="w-full h-10 bg-background border border-zinc-700/80 rounded-xl pl-9 pr-3 text-xs text-foreground placeholder:text-zinc-500 focus:outline-none focus:border-brand transition-colors"
                />
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
                  className="w-full h-10 bg-background border border-zinc-700/80 rounded-xl pl-9 pr-3 text-xs text-foreground placeholder:text-zinc-500 focus:outline-none focus:border-brand transition-colors"
                />
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
                  className="w-full h-10 bg-background border border-zinc-700/80 rounded-xl pl-9 pr-10 text-xs text-foreground placeholder:text-zinc-500 focus:outline-none focus:border-brand transition-colors"
                />
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
                  className="w-full h-10 bg-background border border-zinc-700/80 rounded-xl pl-9 pr-3 text-xs text-foreground placeholder:text-zinc-500 focus:outline-none focus:border-brand transition-colors"
                />
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
              className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-2 mt-4"
            >
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
