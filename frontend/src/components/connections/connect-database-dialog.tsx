"use client";

import * as React from "react";
import { Database, CheckCircle2, AlertCircle, RefreshCw, KeyRound, Server } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authFetch } from "@/lib/auth-api";
import type { DatabaseConnectionItem } from "./connection-card";

interface ConnectDatabaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  onConnectionCreated?: (conn: DatabaseConnectionItem) => void;
}

type DatabaseType = "postgres" | "mongodb" | "elasticsearch";

interface TestStatus {
  tested: boolean;
  success: boolean;
  message?: string;
  latency_ms?: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export function ConnectDatabaseDialog({
  open,
  onOpenChange,
  workspaceId,
  onConnectionCreated,
}: ConnectDatabaseDialogProps) {
  const [selectedType, setSelectedType] = React.useState<DatabaseType>("postgres");
  const [name, setName] = React.useState("PostgreSQL Demo");
  const [host, setHost] = React.useState("localhost");
  const [port, setPort] = React.useState("5432");
  const [database, setDatabase] = React.useState("ecommerce_demo");
  const [username, setUsername] = React.useState("postgres");
  const [password, setPassword] = React.useState("");
  const [uri, setUri] = React.useState("");
  const [isUriMode, setIsUriMode] = React.useState(false);

  const [testing, setTesting] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [testStatus, setTestStatus] = React.useState<TestStatus | null>(null);

  const handleSelectType = (type: DatabaseType) => {
    setSelectedType(type);
    if (type === "postgres") {
      setPort("5432");
      setDatabase("ecommerce_demo");
      setUsername("postgres");
      setName("PostgreSQL Demo");
    } else if (type === "mongodb") {
      setPort("27017");
      setDatabase("analytics_demo");
      setUsername("root");
      setName("MongoDB Demo");
    } else if (type === "elasticsearch") {
      setPort("9200");
      setDatabase("default");
      setUri("http://localhost:9200");
      setName("Elasticsearch Demo");
    }
    setTestStatus(null);
  };

  const getPayload = () => {
    return {
      name,
      db_type: selectedType,
      host: isUriMode || selectedType === "elasticsearch" ? undefined : host,
      port: isUriMode || selectedType === "elasticsearch" ? undefined : parseInt(port, 10),
      database,
      username: isUriMode ? undefined : username,
      password: isUriMode ? undefined : password,
      uri: isUriMode || selectedType === "elasticsearch" ? uri : undefined,
    };
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestStatus(null);
    try {
      const payload = getPayload();
      const res = await authFetch(`${API_BASE}/workspaces/${workspaceId}/connections/test-ephemeral`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        setTestStatus({
          tested: true,
          success: false,
          message: err.detail || err.message || "Failed to reach database",
        });
        return;
      }

      const data = await res.json();
      setTestStatus({
        tested: true,
        success: data.success,
        latency_ms: data.latency_ms,
        message: data.success
          ? `Connected (${data.server_version || "OK"}) in ${data.latency_ms}ms`
          : data.error_message || "Connection refused",
      });
    } catch (e: unknown) {
      setTestStatus({
        tested: true,
        success: false,
        message: (e as Error).message || "Network error communicating with backend",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = getPayload();
      const res = await authFetch(`${API_BASE}/workspaces/${workspaceId}/connections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.detail || err.message || "Failed to save connection");
        return;
      }

      const created = await res.json();
      if (onConnectionCreated) {
        onConnectionCreated(created);
      }
      onOpenChange(false);
    } catch (e: unknown) {
      alert((e as Error).message || "Network error saving connection");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-sky-600" />
            <DialogTitle>Connect Target Database</DialogTitle>
          </div>
          <DialogDescription>
            Attach a PostgreSQL, MongoDB, or Elasticsearch database for schema discovery and natural language querying.
          </DialogDescription>
        </DialogHeader>

        {/* Database Type Selector */}
        <div className="grid grid-cols-3 gap-2 py-2">
          <button
            type="button"
            onClick={() => handleSelectType("postgres")}
            className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-medium transition-all ${
              selectedType === "postgres"
                ? "border-sky-500 bg-sky-50 text-sky-900 dark:bg-sky-950 dark:text-sky-200"
                : "border-border hover:bg-muted text-muted-foreground"
            }`}
          >
            <Server className="h-5 w-5 mb-1 text-sky-600" />
            <span>PostgreSQL</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectType("mongodb")}
            className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-medium transition-all ${
              selectedType === "mongodb"
                ? "border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
                : "border-border hover:bg-muted text-muted-foreground"
            }`}
          >
            <Database className="h-5 w-5 mb-1 text-emerald-600" />
            <span>MongoDB</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectType("elasticsearch")}
            className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-medium transition-all ${
              selectedType === "elasticsearch"
                ? "border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
                : "border-border hover:bg-muted text-muted-foreground"
            }`}
          >
            <KeyRound className="h-5 w-5 mb-1 text-amber-600" />
            <span>Elasticsearch</span>
          </button>
        </div>

        <form onSubmit={handleSaveConnection} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium">Connection Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Production Analytics"
              required
            />
          </div>

          {selectedType === "elasticsearch" ? (
            <div className="space-y-1">
              <label className="text-xs font-medium">Cluster Endpoint URL</label>
              <Input
                value={uri}
                onChange={(e) => setUri(e.target.value)}
                placeholder="http://localhost:9200"
                required
              />
            </div>
          ) : (
            <>
              {selectedType === "mongodb" && (
                <div className="flex items-center gap-2 pb-1">
                  <input
                    type="checkbox"
                    id="mongo-uri-toggle"
                    checked={isUriMode}
                    onChange={(e) => setIsUriMode(e.target.checked)}
                    className="rounded border-border"
                  />
                  <label htmlFor="mongo-uri-toggle" className="text-xs text-muted-foreground cursor-pointer">
                    Connect using Mongo Connection URI string
                  </label>
                </div>
              )}

              {isUriMode ? (
                <div className="space-y-1">
                  <label className="text-xs font-medium">Connection URI</label>
                  <Input
                    value={uri}
                    onChange={(e) => setUri(e.target.value)}
                    placeholder="mongodb://root:password@localhost:27017/dbname?authSource=admin"
                    required
                  />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2 space-y-1">
                      <label className="text-xs font-medium">Host</label>
                      <Input
                        value={host}
                        onChange={(e) => setHost(e.target.value)}
                        placeholder="localhost"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Port</label>
                      <Input
                        value={port}
                        onChange={(e) => setPort(e.target.value)}
                        placeholder="5432"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium">Database Name</label>
                    <Input
                      value={database}
                      onChange={(e) => setDatabase(e.target.value)}
                      placeholder="database_name"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Username</label>
                      <Input
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="dbuser"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Password</label>
                      <Input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* Test Status Feedback Banner */}
          {testStatus && (
            <div
              className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 animate-in fade-in-50 ${
                testStatus.success
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-200"
                  : "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950 dark:border-rose-800 dark:text-rose-200"
              }`}
            >
              {testStatus.success ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              )}
              <div className="flex-1 break-words">
                <div className="font-semibold">{testStatus.success ? "Connectivity Verified" : "Connection Failed"}</div>
                <div className="text-[11px] mt-0.5 leading-relaxed">{testStatus.message}</div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleTestConnection}
              disabled={testing || !name}
              className="gap-1.5 text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${testing ? "animate-spin" : ""}`} />
              <span>{testing ? "Testing..." : "Test Connection"}</span>
            </Button>

            <div className="flex-1" />

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              size="sm"
              disabled={saving || !name}
              className="bg-sky-600 hover:bg-sky-500 text-white"
            >
              {saving ? "Saving..." : "Save Connection"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
