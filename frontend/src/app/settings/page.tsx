"use client";

import * as React from "react";
import {
  User,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  Mail,
  LogOut,
  Sparkles,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useShellStore } from "@/lib/store";
import { updateUserProfile, changeUserPassword, logout } from "@/lib/auth-api";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();
  const { currentUser, setCurrentUser } = useShellStore();

  const [activeTab, setActiveTab] = React.useState<"profile" | "security">("profile");

  // Profile Form state
  const [fullName, setFullName] = React.useState(currentUser?.full_name || "");
  const [profileLoading, setProfileLoading] = React.useState(false);
  const [profileSuccess, setProfileSuccess] = React.useState<string | null>(null);
  const [profileError, setProfileError] = React.useState<string | null>(null);

  // Password Change state
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [pwLoading, setPwLoading] = React.useState(false);
  const [pwSuccess, setPwSuccess] = React.useState<string | null>(null);
  const [pwError, setPwError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (currentUser?.full_name) {
      setFullName(currentUser.full_name);
    }
  }, [currentUser]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);
    setProfileLoading(true);

    try {
      const updated = await updateUserProfile({ full_name: fullName.trim() });
      setCurrentUser(updated);
      setProfileSuccess("Profile updated successfully.");
    } catch (err: unknown) {
      setProfileError(err instanceof Error ? err.message : "Failed to update profile.");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(null);

    if (newPassword !== confirmPassword) {
      setPwError("New passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      setPwError("New password must be at least 8 characters long.");
      return;
    }

    setPwLoading(true);
    try {
      await changeUserPassword(currentPassword, newPassword);
      setPwSuccess("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      setPwError(err instanceof Error ? err.message : "Failed to change password.");
    } finally {
      setPwLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <div className="flex-1 space-y-6 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            <span>Account Settings</span>
            {currentUser?.is_superuser && (
              <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/30">
                Admin
              </Badge>
            )}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your personal profile, credentials, and active security sessions.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="h-8 gap-2 text-xs border-border text-muted-foreground hover:text-rose-400 hover:border-rose-800/50"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Sign Out</span>
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-1">
        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeTab === "profile"
              ? "bg-muted text-foreground font-semibold shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <User className="h-3.5 w-3.5" />
          <span>Personal Profile</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("security")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeTab === "security"
              ? "bg-muted text-foreground font-semibold shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <KeyRound className="h-3.5 w-3.5" />
          <span>Password & Security</span>
        </button>
      </div>

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <div className="space-y-6">
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <User className="h-4 w-4 text-brand" />
                <span>Profile Information</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Update your display name and review account credentials.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-md">
                {profileError && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-950/40 border border-red-800/50 text-red-300 text-xs">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                    <span>{profileError}</span>
                  </div>
                )}

                {profileSuccess && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 text-xs">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                    <span>{profileSuccess}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Email Address</label>
                  <div className="relative">
                    <Mail className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <Input
                      type="email"
                      disabled
                      value={currentUser?.email || ""}
                      className="pl-9 h-9 text-xs bg-muted/40 cursor-not-allowed border-secondary"
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    Email address is tied to your account authentication and cannot be edited.
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Full Name</label>
                  <Input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your name"
                    className="h-9 text-xs border-secondary"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={profileLoading}
                  className="h-8 text-xs bg-white text-black hover:bg-zinc-200"
                >
                  {profileLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Session details */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-brand" />
                <span>Active Session & Storage Isolation</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Your session is secured with dual-token authentication. User identity is isolated in private system storage.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-muted-foreground">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border/60 bg-muted/20">
                  <span className="text-[10px] uppercase text-zinc-400 block font-medium">Session Token</span>
                  <span className="text-xs font-mono text-foreground mt-0.5 block">Short-Lived JWT (30m)</span>
                </div>
                <div className="p-3 rounded-lg border border-border/60 bg-muted/20">
                  <span className="text-[10px] uppercase text-zinc-400 block font-medium">Refresh Token</span>
                  <span className="text-xs font-mono text-emerald-400 mt-0.5 block">30-Day Rotated & Hashed</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === "security" && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-brand" />
              <span>Change Password</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Ensure your account is using a long, random password for maximum security.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
              {pwError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-950/40 border border-red-800/50 text-red-300 text-xs">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                  <span>{pwError}</span>
                </div>
              )}

              {pwSuccess && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 text-xs">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span>{pwSuccess}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Current Password</label>
                <div className="relative">
                  <Lock className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <Input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="pl-9 h-9 text-xs border-secondary"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">New Password</label>
                <div className="relative">
                  <Lock className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <Input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="pl-9 h-9 text-xs border-secondary"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Confirm New Password</label>
                <div className="relative">
                  <Lock className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <Input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-9 h-9 text-xs border-secondary"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={pwLoading}
                className="h-8 text-xs bg-white text-black hover:bg-zinc-200"
              >
                {pwLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    Updating Password...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
