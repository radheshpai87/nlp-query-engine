"use client";

import * as React from "react";
import {
  Shield,
  Sliders,
  User,
  Building2,
  Users,
  KeyRound,
  Trash2,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  Layers,
  Database,
  ArrowRight,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useShellStore } from "@/lib/store";
import { updateUserProfile, changeUserPassword, authFetch } from "@/lib/auth-api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface WorkspaceMember {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
}

export default function SettingsPage() {
  const { currentUser, setCurrentUser, currentWorkspace, setCurrentWorkspace } = useShellStore();

  const [activeTab, setActiveTab] = React.useState<"profile" | "workspace" | "governance">("profile");

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

  // Workspace Settings state
  const [wsName, setWsName] = React.useState(currentWorkspace.name || "Default Workspace");
  const [wsLoading, setWsLoading] = React.useState(false);
  const [wsSuccess, setWsSuccess] = React.useState<string | null>(null);
  const [wsError, setWsError] = React.useState<string | null>(null);

  // Members state
  const [members, setMembers] = React.useState<WorkspaceMember[]>([]);
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState("member");
  const [inviteLoading, setInviteLoading] = React.useState(false);
  const [inviteError, setInviteError] = React.useState<string | null>(null);

  // Load workspace members
  React.useEffect(() => {
    let ignore = false;
    async function loadMembers() {
      try {
        const res = await authFetch(`${API_BASE}/workspaces/${currentWorkspace.id}/members`);
        if (res.ok) {
          const data = await res.json();
          if (!ignore && Array.isArray(data)) {
            setMembers(data);
          }
        }
      } catch {
        // Fallback
      }
    }
    void loadMembers();
    return () => {
      ignore = true;
    };
  }, [currentWorkspace.id]);

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
      setProfileError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(null);

    if (newPassword.length < 8) {
      setPwError("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("New passwords do not match.");
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
      setPwError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setPwLoading(false);
    }
  };

  const handleUpdateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setWsError(null);
    setWsSuccess(null);
    setWsLoading(true);

    try {
      const res = await authFetch(`${API_BASE}/workspaces/${currentWorkspace.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: wsName.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentWorkspace({ ...currentWorkspace, name: data.name });
        setWsSuccess("Workspace name updated successfully.");
      } else {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || "Failed to update workspace");
      }
    } catch (err: unknown) {
      setWsError(err instanceof Error ? err.message : "Failed to update workspace");
    } finally {
      setWsLoading(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setInviteLoading(true);

    try {
      const res = await authFetch(`${API_BASE}/workspaces/${currentWorkspace.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      if (res.ok) {
        const newMember = await res.json();
        setMembers((prev) => [
          ...prev,
          {
            id: newMember.user_id,
            user_id: newMember.user_id,
            role: newMember.role,
            created_at: new Date().toISOString(),
          },
        ]);
        setInviteEmail("");
      } else {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || "Failed to invite member");
      }
    } catch (err: unknown) {
      setInviteError(err instanceof Error ? err.message : "Failed to invite member");
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      const res = await authFetch(`${API_BASE}/workspaces/${currentWorkspace.id}/members/${userId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMembers((prev) => prev.filter((m) => m.user_id !== userId));
      }
    } catch {
      // Ignore
    }
  };

  return (
    <div className="flex-1 p-6 md:p-8 max-w-4xl mx-auto space-y-6 animate-in fade-in-50 duration-300">
      <div className="border-b border-border pb-4">
        <h1 className="text-lg font-medium tracking-tight text-foreground">
          Enterprise Settings & Governance
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Manage personal credentials, workspace team access, query execution safety, and LLM configuration.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
            activeTab === "profile"
              ? "bg-zinc-800 text-white"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Personal Profile
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("workspace")}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
            activeTab === "workspace"
              ? "bg-zinc-800 text-white"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Workspace & Members
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("governance")}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
            activeTab === "governance"
              ? "bg-zinc-800 text-white"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Query Safety & Governance
        </button>
      </div>

      {/* TAB 1: Personal Profile */}
      {activeTab === "profile" && (
        <div className="space-y-6">
          <Card className="bg-card border-border/80">
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-brand" />
                <CardTitle className="text-sm">Personal Information</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Your identity used in query audit logs and workspace membership.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {profileSuccess && (
                <div className="mb-4 p-2.5 rounded-lg bg-brand-muted border border-brand/20 text-brand text-xs flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{profileSuccess}</span>
                </div>
              )}
              {profileError && (
                <div className="mb-4 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>{profileError}</span>
                </div>
              )}

              <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-medium text-foreground">Full Name</label>
                    <Input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="h-8 bg-background border-border/80 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-medium text-foreground">Work Email</label>
                    <Input
                      value={currentUser?.email || ""}
                      disabled
                      className="h-8 bg-muted border-border/80 text-xs text-zinc-400"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  size="sm"
                  disabled={profileLoading}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
                >
                  {profileLoading ? "Saving..." : "Save Profile"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/80">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-brand" />
                <CardTitle className="text-sm">Change Password</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Ensure your account uses a strong password with at least 8 characters.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pwSuccess && (
                <div className="mb-4 p-2.5 rounded-lg bg-brand-muted border border-brand/20 text-brand text-xs flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{pwSuccess}</span>
                </div>
              )}
              {pwError && (
                <div className="mb-4 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>{pwError}</span>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-medium text-foreground">Current Password</label>
                    <Input
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="h-8 bg-background border-border/80 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-medium text-foreground">New Password</label>
                    <Input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="h-8 bg-background border-border/80 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-medium text-foreground">Confirm New Password</label>
                    <Input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-8 bg-background border-border/80 text-xs"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  size="sm"
                  disabled={pwLoading}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
                >
                  {pwLoading ? "Updating..." : "Update Password"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: Workspace & Members */}
      {activeTab === "workspace" && (
        <div className="space-y-6">
          <Card className="bg-card border-border/80">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-brand" />
                <CardTitle className="text-sm">Workspace Details</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Manage workspace identification and team metadata.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {wsSuccess && (
                <div className="mb-4 p-2.5 rounded-lg bg-brand-muted border border-brand/20 text-brand text-xs flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{wsSuccess}</span>
                </div>
              )}
              {wsError && (
                <div className="mb-4 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>{wsError}</span>
                </div>
              )}

              <form onSubmit={handleUpdateWorkspace} className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-medium text-foreground">Workspace Name</label>
                  <Input
                    value={wsName}
                    onChange={(e) => setWsName(e.target.value)}
                    className="h-8 bg-background border-border/80 text-xs max-w-md"
                  />
                </div>

                <Button
                  type="submit"
                  size="sm"
                  disabled={wsLoading}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
                >
                  {wsLoading ? "Saving..." : "Rename Workspace"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/80">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-brand" />
                  <CardTitle className="text-sm">Workspace Members & RBAC</CardTitle>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {members.length} Active Member(s)
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Invite team members and configure role-based access control (Admin, Member, Viewer).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {inviteError && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>{inviteError}</span>
                </div>
              )}

              {/* Invite Form */}
              <form onSubmit={handleInviteMember} className="flex gap-2">
                <Input
                  type="email"
                  required
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="h-8 bg-background border-border/80 text-xs flex-1"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="h-8 px-2.5 bg-background border border-border/80 rounded-md text-xs text-white"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                  <option value="viewer">Viewer</option>
                </select>
                <Button
                  type="submit"
                  size="sm"
                  disabled={inviteLoading || !inviteEmail.trim()}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs gap-1.5"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>Invite</span>
                </Button>
              </form>

              {/* Members List */}
              <div className="border border-border/60 rounded-xl divide-y divide-border/60 overflow-hidden">
                {members.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    No additional team members invited yet.
                  </div>
                ) : (
                  members.map((m) => (
                    <div key={m.id} className="p-3 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-medium text-white block">{m.user_id}</span>
                        <span className="text-[10px] text-muted-foreground">
                          Added: {new Date(m.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {m.role}
                        </Badge>
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(m.user_id)}
                          className="text-zinc-500 hover:text-rose-400 p-1"
                          title="Remove member"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: Query Safety & Governance */}
      {activeTab === "governance" && (
        <div className="space-y-4">
          <Card className="bg-card border-border/80">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-brand" />
                  <CardTitle className="text-sm">Query Safety Policy</CardTitle>
                </div>
                <Badge variant="success">Enforced</Badge>
              </div>
              <CardDescription className="text-xs">
                Hard constraints applied to all query generation and adapter executions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-medium text-foreground">Max Execution Timeout (Seconds)</label>
                  <Input defaultValue="30" className="h-8 bg-background border-border/80" />
                </div>
                <div className="space-y-1.5">
                  <label className="font-medium text-foreground">Max Result Rows</label>
                  <Input defaultValue="1000" className="h-8 bg-background border-border/80" />
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border/60">
                <span className="text-muted-foreground">Allow Write Operations (DML/DDL)</span>
                <Badge variant="destructive">Disabled (Read-Only)</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/80">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-brand" />
                <CardTitle className="text-sm">LLM & Ambiguity Provider</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Configure model endpoints for intent classification and ambiguity evaluation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-medium text-foreground">Active Provider</label>
                  <Input defaultValue="mock (Deterministic for Tests)" disabled className="h-8 bg-muted border-border/80" />
                </div>
                <div className="space-y-1.5">
                  <label className="font-medium text-foreground">Ollama Endpoint</label>
                  <Input defaultValue="http://localhost:11434" className="h-8 bg-background border-border/80" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
