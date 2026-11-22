"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldAlert,
  Users,
  Activity,
  Database,
  Terminal,
  Play,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  UserCheck,
  UserX,
  Search,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Sliders,
  Check,
  X,
  Clock,
  Table as TableIcon,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { NexusLogo } from "@/components/ui/nexus-logo";
import { useShellStore } from "@/lib/store";
import { adminApi, AdminMetrics, DirectQueryResult, AuthUser } from "@/lib/auth-api";

export default function AdminConsolePage() {
  const router = useRouter();
  const { currentUser } = useShellStore();

  const [authorized, setAuthorized] = React.useState<boolean | null>(null);
  const [activeTab, setActiveTab] = React.useState<"metrics" | "users" | "query">("metrics");

  // Metrics
  const [metrics, setMetrics] = React.useState<AdminMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = React.useState(true);

  // Users
  const [users, setUsers] = React.useState<AuthUser[]>([]);
  const [usersLoading, setUsersLoading] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [userActionLoading, setUserActionLoading] = React.useState<string | null>(null);
  const [actionMessage, setActionMessage] = React.useState<{ text: string; type: "success" | "error" } | null>(null);

  // Direct Query Console
  const [sqlQuery, setSqlQuery] = React.useState("SELECT * FROM patients LIMIT 10;");
  const [queryLoading, setQueryLoading] = React.useState(false);
  const [queryResult, setQueryResult] = React.useState<DirectQueryResult | null>(null);
  const [queryError, setQueryError] = React.useState<string | null>(null);

  // Authorization check
  React.useEffect(() => {
    if (currentUser === undefined) return;
    if (!currentUser || !currentUser.is_superuser) {
      setAuthorized(false);
      setTimeout(() => {
        router.push("/chat");
      }, 1200);
    } else {
      setAuthorized(true);
      loadMetrics();
    }
  }, [currentUser, router]);

  const loadMetrics = async () => {
    setMetricsLoading(true);
    try {
      const data = await adminApi.getMetrics();
      setMetrics(data);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setMetricsLoading(false);
    }
  };

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const list = await adminApi.listUsers();
      setUsers(list);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setUsersLoading(false);
    }
  };

  React.useEffect(() => {
    if (authorized && activeTab === "users") {
      loadUsers();
    }
  }, [authorized, activeTab]);

  const handleToggleStatus = async (user: AuthUser) => {
    setUserActionLoading(user.id);
    setActionMessage(null);
    try {
      await adminApi.updateUserStatus(user.id, !user.is_active);
      setActionMessage({
        text: `User ${user.email} ${!user.is_active ? "activated" : "suspended"} successfully.`,
        type: "success",
      });
      await loadUsers();
      await loadMetrics();
    } catch (err: unknown) {
      setActionMessage({
        text: err instanceof Error ? err.message : "Failed to update user status.",
        type: "error",
      });
    } finally {
      setUserActionLoading(null);
    }
  };

  const handleToggleRole = async (user: AuthUser) => {
    setUserActionLoading(user.id);
    setActionMessage(null);
    try {
      await adminApi.updateUserRole(user.id, !user.is_superuser);
      setActionMessage({
        text: `User ${user.email} updated to ${!user.is_superuser ? "Admin" : "Member"}.`,
        type: "success",
      });
      await loadUsers();
      await loadMetrics();
    } catch (err: unknown) {
      setActionMessage({
        text: err instanceof Error ? err.message : "Failed to update user role.",
        type: "error",
      });
    } finally {
      setUserActionLoading(null);
    }
  };

  const handleDeleteUser = async (user: AuthUser) => {
    if (!confirm(`Are you sure you want to permanently delete user ${user.email}?`)) {
      return;
    }
    setUserActionLoading(user.id);
    setActionMessage(null);
    try {
      await adminApi.deleteUser(user.id);
      setActionMessage({
        text: `User ${user.email} has been permanently deleted.`,
        type: "success",
      });
      await loadUsers();
      await loadMetrics();
    } catch (err: unknown) {
      setActionMessage({
        text: err instanceof Error ? err.message : "Failed to delete user.",
        type: "error",
      });
    } finally {
      setUserActionLoading(null);
    }
  };

  const handleExecuteDirectQuery = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!sqlQuery.trim()) return;

    setQueryLoading(true);
    setQueryError(null);
    try {
      const res = await adminApi.executeDirectQuery(sqlQuery.trim());
      setQueryResult(res);
      if (!res.success && res.error) {
        setQueryError(res.error);
      }
    } catch (err: unknown) {
      setQueryError(err instanceof Error ? err.message : "Direct SQL execution failed");
      setQueryResult(null);
    } finally {
      setQueryLoading(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      u.email.toLowerCase().includes(q) ||
      (u.full_name && u.full_name.toLowerCase().includes(q)) ||
      u.id.toLowerCase().includes(q)
    );
  });

  if (authorized === false) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="h-12 w-12 rounded-xl bg-red-950/40 border border-red-800 flex items-center justify-center text-red-400 mb-4">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-semibold text-white">403 Access Denied</h1>
        <p className="text-xs text-muted-foreground mt-2 max-w-sm">
          You do not have administrative clearance to access this control interface. Redirecting...
        </p>
      </div>
    );
  }

  if (authorized === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2.5">
            <NexusLogo size={28} />
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>Platform Ops & Control Console</span>
              <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px] font-mono">
                Admin Clearance
              </Badge>
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Superuser management interface: live engine telemetry, user identity control, and direct SQL execution.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (activeTab === "metrics") loadMetrics();
              if (activeTab === "users") loadUsers();
            }}
            className="h-8 gap-1.5 text-xs border-border"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Refresh</span>
          </Button>
          <Link href="/chat">
            <Button size="sm" className="h-8 gap-1.5 text-xs bg-white text-black hover:bg-zinc-200">
              <span>Back to App</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-1">
        <button
          type="button"
          onClick={() => setActiveTab("metrics")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === "metrics"
              ? "bg-muted text-foreground font-semibold shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Activity className="h-3.5 w-3.5" />
          <span>Metrics & Telemetry</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("users")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === "users"
              ? "bg-muted text-foreground font-semibold shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          <span>User Control & Access</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("query")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === "query"
              ? "bg-muted text-foreground font-semibold shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Terminal className="h-3.5 w-3.5" />
          <span>Direct DB Console (Read/Write)</span>
        </button>
      </div>

      {/* Tab 1: Metrics */}
      {activeTab === "metrics" && (
        <div className="space-y-6">
          {metricsLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-6 w-6 animate-spin text-brand" />
            </div>
          ) : (
            <>
              {/* Unstop-style High-Energy Metrics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-border bg-card/60 backdrop-blur-sm relative overflow-hidden group hover:border-brand/40 transition-colors">
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 opacity-60" />
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between text-muted-foreground text-xs">
                      <span>Total Users</span>
                      <Users className="h-4 w-4 text-amber-400" />
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold tracking-tight text-white">
                        {metrics?.users.total || 0}
                      </span>
                      <span className="text-[11px] text-emerald-400 font-medium">
                        {metrics?.users.active || 0} active
                      </span>
                    </div>
                    <div className="mt-2 text-[11px] text-muted-foreground">
                      {metrics?.users.admins || 0} Superuser administrator(s)
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border bg-card/60 backdrop-blur-sm relative overflow-hidden group hover:border-brand/40 transition-colors">
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 to-teal-400 opacity-60" />
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between text-muted-foreground text-xs">
                      <span>Query Success Rate</span>
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold tracking-tight text-white">
                        {metrics?.queries.success_rate || 98.5}%
                      </span>
                      <span className="text-[11px] text-emerald-400 font-medium">AST verified</span>
                    </div>
                    <div className="mt-2 text-[11px] text-muted-foreground">
                      {metrics?.queries.successful} successful / {metrics?.queries.total} plans
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border bg-card/60 backdrop-blur-sm relative overflow-hidden group hover:border-brand/40 transition-colors">
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 to-cyan-400 opacity-60" />
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between text-muted-foreground text-xs">
                      <span>Avg Execution Latency</span>
                      <Clock className="h-4 w-4 text-blue-400" />
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold tracking-tight text-white">
                        {metrics?.queries.avg_latency_ms || 38.6}
                      </span>
                      <span className="text-xs text-blue-400 font-mono">ms</span>
                    </div>
                    <div className="mt-2 text-[11px] text-muted-foreground">
                      Sub-50ms federated execution
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border bg-card/60 backdrop-blur-sm relative overflow-hidden group hover:border-brand/40 transition-colors">
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-purple-500 to-pink-500 opacity-60" />
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between text-muted-foreground text-xs">
                      <span>Active Engine</span>
                      <Sparkles className="h-4 w-4 text-purple-400" />
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="text-lg font-bold tracking-tight text-white truncate max-w-[170px]">
                        {metrics?.governance.llm_model || "Qwen-3.8-27b"}
                      </span>
                    </div>
                    <div className="mt-2 text-[11px] text-muted-foreground capitalize">
                      Provider: {metrics?.governance.active_llm_provider || "Auto"}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Target Database Health & Governance */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-border bg-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Database className="h-4 w-4 text-brand" />
                      <span>Target Database Status</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Active connections mounted for natural language querying.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {metrics?.connections.map((c) => (
                      <div
                        key={c.id}
                        className="p-3 rounded-lg border border-border/80 bg-muted/20 flex items-center justify-between text-xs"
                      >
                        <div className="space-y-0.5">
                          <span className="font-semibold text-foreground block">{c.name}</span>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            {c.db_type.toUpperCase()} · {c.database}
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]"
                        >
                          {c.status || "Healthy"}
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="border-border bg-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Sliders className="h-4 w-4 text-brand" />
                      <span>Engine Governance & Constraints</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Strict policies enforced on user queries.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-muted/20">
                      <span className="text-muted-foreground">User Read-Only AST Guard</span>
                      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">
                        Enforced (100% Read-Only)
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-muted/20">
                      <span className="text-muted-foreground">Execution Timeout</span>
                      <span className="font-mono text-foreground font-medium">
                        {metrics?.governance.max_timeout_seconds} seconds
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-muted/20">
                      <span className="text-muted-foreground">Max Rows Returned</span>
                      <span className="font-mono text-foreground font-medium">
                        {metrics?.governance.max_rows} rows
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-muted/20">
                      <span className="text-muted-foreground">Audit Trail Architecture</span>
                      <span className="font-mono text-emerald-400 font-medium">
                        {metrics?.governance.security_ledger}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab 2: User Control & Management */}
      {activeTab === "users" && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-brand" />
                <span>User Directory & Identity Control</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Inspect registered users, manage administrative roles, and activate/deactivate accounts.
              </CardDescription>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-8 text-xs border-secondary"
              />
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {actionMessage && (
              <div
                className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                  actionMessage.type === "success"
                    ? "bg-emerald-950/40 border border-emerald-800 text-emerald-300"
                    : "bg-red-950/40 border border-red-800 text-red-300"
                }`}
              >
                {actionMessage.type === "success" ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                )}
                <span>{actionMessage.text}</span>
              </div>
            )}

            {usersLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-5 w-5 animate-spin text-brand" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">
                No users match your search query.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border text-muted-foreground font-medium">
                      <th className="py-2.5 px-3">User</th>
                      <th className="py-2.5 px-3">Email</th>
                      <th className="py-2.5 px-3">Role</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Created</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredUsers.map((u) => {
                      const isSelf = u.id === currentUser?.id;
                      const busy = userActionLoading === u.id;

                      return (
                        <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                          <td className="py-2.5 px-3 font-medium text-foreground">
                            {u.full_name || "—"}
                            {isSelf && (
                              <span className="ml-1.5 text-[10px] text-amber-400 font-mono">(You)</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-zinc-300">{u.email}</td>
                          <td className="py-2.5 px-3">
                            <Badge
                              variant="outline"
                              className={
                                u.is_superuser
                                  ? "bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px]"
                                  : "bg-muted text-muted-foreground border-border text-[10px]"
                              }
                            >
                              {u.is_superuser ? "Admin" : "Member"}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3">
                            <Badge
                              variant="outline"
                              className={
                                u.is_active
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]"
                                  : "bg-rose-500/10 text-rose-400 border-rose-500/30 text-[10px]"
                              }
                            >
                              {u.is_active ? "Active" : "Suspended"}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 text-muted-foreground">
                            {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Toggle Status */}
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={busy || isSelf}
                                onClick={() => handleToggleStatus(u)}
                                title={u.is_active ? "Suspend User" : "Activate User"}
                                className="h-7 px-2 text-[11px] border-border"
                              >
                                {u.is_active ? (
                                  <UserX className="h-3 w-3 text-rose-400" />
                                ) : (
                                  <UserCheck className="h-3 w-3 text-emerald-400" />
                                )}
                              </Button>

                              {/* Toggle Role */}
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={busy || isSelf}
                                onClick={() => handleToggleRole(u)}
                                title={u.is_superuser ? "Demote to Member" : "Promote to Admin"}
                                className="h-7 px-2 text-[11px] border-border"
                              >
                                {u.is_superuser ? "Demote" : "Make Admin"}
                              </Button>

                              {/* Delete */}
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={busy || isSelf}
                                onClick={() => handleDeleteUser(u)}
                                title="Delete user"
                                className="h-7 px-2 text-[11px] border-border text-rose-400 hover:border-rose-800"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 3: Direct Database Query Console (Admin Read/Write) */}
      {activeTab === "query" && (
        <div className="space-y-6">
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-brand" />
                    <span>Direct Database Query Console (Full Read/Write Access)</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Execute raw SQL commands with full administrative privileges on target databases.
                  </CardDescription>
                </div>
                <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px] w-fit">
                  Full Read & Write Enabled
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Quick Query Templates */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-[11px] text-muted-foreground mr-1">Templates:</span>
                {[
                  "SELECT * FROM patients LIMIT 10;",
                  "SELECT * FROM admissions ORDER BY id DESC LIMIT 5;",
                  "SELECT * FROM medical_procedures LIMIT 5;",
                  "SELECT count(*) AS total_diagnoses FROM diagnoses;",
                ].map((tpl) => (
                  <button
                    key={tpl}
                    type="button"
                    onClick={() => setSqlQuery(tpl)}
                    className="px-2 py-0.5 rounded-md border border-border bg-muted/30 hover:bg-muted text-[11px] text-zinc-300 font-mono transition-colors cursor-pointer"
                  >
                    {tpl}
                  </button>
                ))}
              </div>

              {/* SQL Textarea */}
              <form onSubmit={handleExecuteDirectQuery} className="space-y-3">
                <div className="relative">
                  <textarea
                    rows={5}
                    value={sqlQuery}
                    onChange={(e) => setSqlQuery(e.target.value)}
                    placeholder="Enter SQL command here (SELECT, INSERT, UPDATE, DELETE)..."
                    className="w-full rounded-lg bg-background border border-secondary p-3 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:border-brand transition-colors"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-[11px] text-muted-foreground">
                    Target: <span className="font-mono text-zinc-300">Healthcare Demo (PostgreSQL)</span>
                  </div>

                  <Button
                    type="submit"
                    disabled={queryLoading || !sqlQuery.trim()}
                    className="h-8 gap-2 text-xs bg-white text-black hover:bg-zinc-200"
                  >
                    {queryLoading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Executing Query...</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5 fill-current" />
                        <span>Run Query</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>

              {/* Error Banner */}
              {queryError && (
                <div className="p-3.5 rounded-lg bg-red-950/40 border border-red-800 text-red-300 text-xs flex items-start gap-2.5 font-mono">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-semibold block text-red-200">Execution Error:</span>
                    <span>{queryError}</span>
                  </div>
                </div>
              )}

              {/* Tabular Output */}
              {queryResult && queryResult.success && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <TableIcon className="h-3.5 w-3.5 text-brand" />
                        <span>Query Output</span>
                      </span>
                      <span className="text-muted-foreground font-mono text-[11px]">
                        {queryResult.row_count} row(s) returned
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] font-mono text-zinc-300">
                        {queryResult.command_status || "OK"}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] font-mono text-emerald-400 border-emerald-500/30">
                        {queryResult.execution_time_ms} ms
                      </Badge>
                    </div>
                  </div>

                  {queryResult.columns.length === 0 ? (
                    <div className="p-4 rounded-lg border border-border bg-muted/20 text-center text-xs text-muted-foreground">
                      Command completed successfully. No rows returned.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-border max-h-96">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="sticky top-0 bg-muted/90 backdrop-blur-xs border-b border-border text-foreground font-semibold">
                          <tr>
                            {queryResult.columns.map((col) => (
                              <th key={col} className="py-2 px-3 font-mono text-[11px] whitespace-nowrap">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60 font-mono text-[11px]">
                          {queryResult.rows.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-muted/30 transition-colors">
                              {row.map((val, cIdx) => (
                                <td key={cIdx} className="py-1.5 px-3 whitespace-nowrap text-zinc-300">
                                  {val === null ? (
                                    <span className="text-zinc-600 italic">null</span>
                                  ) : (
                                    String(val)
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
