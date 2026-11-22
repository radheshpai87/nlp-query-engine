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
  handleOAuthCallbackToken,
} from "@/lib/auth-api";
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

export default function LoginPage() {
  const router = useRouter();
  const { setCurrentUser, setCurrentWorkspace } = useShellStore();

  const [email, setEmail] = React.useState<string>("");
  const [password, setPassword] = React.useState<string>("");
  const [showPassword, setShowPassword] = React.useState<boolean>(false);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<boolean>(false);

  // Check stored user or handle OAuth callback redirection (?token=... or ?error=...)
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const urlParams = new URLSearchParams(window.location.search);
    const callbackToken = urlParams.get("token");
    const callbackError = urlParams.get("error");

    if (callbackError) {
      setError(decodeURIComponent(callbackError));
      // Clean query string
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (callbackToken) {
      setLoading(true);
      setSuccess(true);
      window.history.replaceState({}, document.title, window.location.pathname);
      handleOAuthCallbackToken(callbackToken)
        .then((user) => {
          if (user) {
            setCurrentUser(user);
            if (user.default_workspace_id) {
              setCurrentWorkspace({
                id: user.default_workspace_id,
                name: "Nexus Query",
                role: "admin",
              });
            }
          }
          setTimeout(() => {
            router.push("/chat");
          }, 300);
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : "Failed to verify OAuth credentials");
          setSuccess(false);
        })
        .finally(() => {
          setLoading(false);
        });
      return;
    }

    const existing = getStoredUser();
    if (existing) {
      setCurrentUser(existing);
    }
  }, [router, setCurrentUser, setCurrentWorkspace]);

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

  const handleOAuthLogin = (provider: "google" | "github") => {
    setError(null);
    window.location.href = `${API_BASE}/auth/${provider}/login`;
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
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
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

        {/* Login Box */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-xl text-left">
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

          {/* OAuth Buttons */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => handleOAuthLogin("google")}
              disabled={loading}
              className="flex items-center justify-center gap-2 h-9 px-3 rounded-lg border border-border bg-muted/40 hover:bg-muted text-xs font-medium text-foreground transition-colors cursor-pointer disabled:opacity-50"
            >
              <GoogleIcon />
              <span>Google</span>
            </button>
            <button
              type="button"
              onClick={() => handleOAuthLogin("github")}
              disabled={loading}
              className="flex items-center justify-center gap-2 h-9 px-3 rounded-lg border border-border bg-muted/40 hover:bg-muted text-xs font-medium text-foreground transition-colors cursor-pointer disabled:opacity-50"
            >
              <GithubIcon />
              <span>GitHub</span>
            </button>
          </div>

          <div className="relative my-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/70" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-card px-2 text-muted-foreground tracking-wider">
                or sign in with email
              </span>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
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
                  className="w-full h-9 pl-9 pr-3 rounded-lg bg-background border border-secondary text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:border-brand transition-colors"
                />
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
                  className="w-full h-9 pl-9 pr-9 rounded-lg bg-background border border-secondary text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:border-brand transition-colors"
                />
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

          <div className="flex items-center justify-center text-xs pt-1">
            <Link
              href="/register"
              className="text-brand hover:text-brand font-medium transition-colors"
            >
              Create new account →
            </Link>
          </div>
        </div>
      </div>

      {/* Footer info */}
      <div className="text-center text-[11px] text-muted-foreground py-3">
        <span>Protected by SHA-256 JWT & Read-Only AST Guard · Local Instance 127.0.0.1</span>
      </div>
    </div>
  );
}
