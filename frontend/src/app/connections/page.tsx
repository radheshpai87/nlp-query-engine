"use client";

import * as React from "react";
import { Plus, RefreshCw, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ConnectionCard, type DatabaseConnectionItem } from "@/components/connections/connection-card";
import { ConnectDatabaseDialog } from "@/components/connections/connect-database-dialog";
import { useShellStore } from "@/lib/store";
import { authFetch } from "@/lib/auth-api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export default function ConnectionsPage() {
  const { currentWorkspace } = useShellStore();
  const [connections, setConnections] = React.useState<DatabaseConnectionItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [testingId, setTestingId] = React.useState<string | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);

  React.useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      try {
        const res = await authFetch(`${API_BASE}/workspaces/${currentWorkspace.id}/connections`);
        if (res.ok) {
          const data = await res.json();
          if (!ignore && Array.isArray(data)) {
            setConnections(data);
          }
        }
      } catch {
        // Leave empty on failure
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    void load();
    return () => {
      ignore = true;
    };
  }, [currentWorkspace.id]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await authFetch(`${API_BASE}/workspaces/${currentWorkspace.id}/connections`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setConnections(data);
        }
      }
    } catch {
      // Keep existing list on network timeout
    } finally {
      setRefreshing(false);
    }
  };

  const handleTestConnection = async (id: string) => {
    setTestingId(id);
    try {
      const res = await authFetch(`${API_BASE}/workspaces/${currentWorkspace.id}/connections/${id}/test`, {
        method: "POST",
      });
      if (res.ok) {
        const testRes = await res.json();
        setConnections((prev) =>
          prev.map((c) =>
            c.id === id
              ? {
                  ...c,
                  status: testRes.success ? "online" : "error",
                  status_message: testRes.success
                    ? `Connected (${testRes.server_version || "OK"}) in ${testRes.latency_ms}ms`
                    : testRes.error_message || "Connection failed",
                  last_verified_at: new Date().toISOString(),
                }
              : c
          )
        );
      } else {
        const errData = await res.json().catch(() => null);
        const errMsg = errData?.detail || errData?.message || `HTTP ${res.status}`;
        setConnections((prev) =>
          prev.map((c) => (c.id === id ? { ...c, status: "error", status_message: errMsg } : c))
        );
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Connection test request failed";
      setConnections((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                status: "error",
                status_message: errMsg,
                last_verified_at: new Date().toISOString(),
              }
            : c
        )
      );
    } finally {
      setTestingId(null);
    }
  };

  const handleDeleteConnection = async (id: string) => {
    try {
      await authFetch(`${API_BASE}/workspaces/${currentWorkspace.id}/connections/${id}`, {
        method: "DELETE",
      });
    } catch {
      // Optimistic update
    }
    setConnections((prev) => prev.filter((c) => c.id !== id));
  };

  const handleConnectionCreated = (newConn: DatabaseConnectionItem) => {
    setConnections((prev) => [newConn, ...prev]);
  };

  return (
    <div className="flex-1 p-6 md:p-8 max-w-6xl mx-auto space-y-6 animate-in fade-in-50 duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Target Database Connections
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure secure, encrypted connections to PostgreSQL, MongoDB, and Elasticsearch.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="text-xs gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Button
            onClick={() => setDialogOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 text-xs font-medium"
            size="sm"
          >
            <Plus className="h-4 w-4" />
            <span>Connect Database</span>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-44 rounded-xl border border-border/40 bg-card/40 animate-pulse"
            />
          ))}
        </div>
      ) : connections.length === 0 ? (
        <EmptyState
          icon={Database}
          title="No databases connected yet"
          description="Connect any database to enable natural language querying and automated schema exploration."
          actionLabel="Connect First Database"
          onAction={() => setDialogOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {connections.map((conn) => (
            <ConnectionCard
              key={conn.id}
              connection={conn}
              onTest={handleTestConnection}
              onDelete={handleDeleteConnection}
              isTesting={testingId === conn.id}
            />
          ))}
        </div>
      )}

      <ConnectDatabaseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        workspaceId={currentWorkspace.id}
        onConnectionCreated={handleConnectionCreated}
      />
    </div>
  );
}
