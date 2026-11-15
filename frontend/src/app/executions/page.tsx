"use client";

import { useEffect, useState } from "react";
import { Activity, Database, Clock, RefreshCw, CheckCircle2, XCircle, ShieldAlert, Code2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useShellStore } from "@/lib/store";
import { listQueryExecutions, QueryExecution } from "@/lib/execution-api";

export default function ExecutionsPage() {
  const currentWorkspace = useShellStore((state) => state.currentWorkspace);
  const [executions, setExecutions] = useState<QueryExecution[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedExec, setSelectedExec] = useState<QueryExecution | null>(null);

  useEffect(() => {
    let isMounted = true;
    listQueryExecutions(currentWorkspace.id)
      .then((data) => {
        if (isMounted) {
          setExecutions(data);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setExecutions([]);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [currentWorkspace.id]);

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const data = await listQueryExecutions(currentWorkspace.id);
      setExecutions(data);
    } catch {
      setExecutions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return (
          <Badge variant="success" className="gap-1 text-[10px]">
            <CheckCircle2 className="h-3 w-3" />
            <span>Success</span>
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive" className="gap-1 text-[10px]">
            <XCircle className="h-3 w-3" />
            <span>Failed</span>
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="outline" className="gap-1 text-[10px] text-amber-400 border-amber-500/30">
            <ShieldAlert className="h-3 w-3" />
            <span>Rejected</span>
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="flex-1 p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-500" />
            <span>Query Execution Engine</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Audit trace of read-only query plans, federated hash joins, and target database latency.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoading}
          className="text-xs gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="h-6 w-6 animate-spin text-emerald-500" />
          <p className="text-xs text-muted-foreground">Loading execution telemetry...</p>
        </div>
      ) : executions.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No query executions recorded"
          description="Execute a natural language query in the Query Assistant to see telemetry, generated dialect syntax, and latency traces."
        />
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/80 bg-[#181818] overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Execution ID</TableHead>
                  <TableHead>Natural Query</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Rows</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Executed At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {executions.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {row.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="text-xs font-medium max-w-xs truncate">
                      {row.natural_query}
                    </TableCell>
                    <TableCell>{renderStatusBadge(row.status)}</TableCell>
                    <TableCell className="font-mono text-xs">
                      <div className="flex items-center gap-1">
                        <Database className="h-3 w-3 text-muted-foreground" />
                        <span>{row.row_count}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-emerald-400" />
                        <span>{row.duration_ms}ms</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(row.created_at).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      {Object.keys(row.generated_syntax || {}).length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedExec(row)}
                          className="h-7 text-xs text-emerald-400 hover:text-emerald-300 gap-1"
                        >
                          <Code2 className="h-3.5 w-3.5" />
                          <span>Syntax</span>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Generated Syntax Drawer/Modal Preview */}
          {selectedExec && (
            <div className="rounded-xl border border-border/80 bg-[#181818] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-400">
                  Compiled Native Syntax for &quot;{selectedExec.natural_query}&quot;
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedExec(null)}
                  className="h-6 text-xs text-zinc-400 hover:text-zinc-200"
                >
                  Close
                </Button>
              </div>

              <div className="space-y-2">
                {Object.entries(selectedExec.generated_syntax).map(([key, val]) => (
                  <div key={key} className="space-y-1">
                    <Badge variant="outline" className="uppercase font-mono text-[10px] border-border">
                      {key}
                    </Badge>
                    <pre className="p-2.5 rounded bg-[#212121] border border-border/70 text-xs font-mono text-zinc-200 overflow-x-auto">
                      {val}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
