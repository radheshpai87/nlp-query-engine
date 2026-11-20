"use client";

import { useEffect, useState } from "react";
import { Clock, History, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useShellStore } from "@/lib/store";
import { listQueryExecutions, type QueryExecution } from "@/lib/execution-api";

export default function HistoryPage() {
  const currentWorkspace = useShellStore((state) => state.currentWorkspace);
  const [executions, setExecutions] = useState<QueryExecution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listQueryExecutions(currentWorkspace.id);
      setExecutions(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not load query history.");
      setExecutions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    listQueryExecutions(currentWorkspace.id)
      .then((data) => {
        if (active) setExecutions(data);
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Could not load query history.");
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [currentWorkspace.id]);

  return (
    <div className="mx-auto flex-1 max-w-6xl space-y-6 p-6 md:p-8">
      <div className="flex flex-col justify-between gap-4 border-b border-border pb-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-lg font-medium tracking-tight">Query history</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Every execution in this workspace, with its target, row count and duration.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={load}
          disabled={isLoading}
          className="h-8 gap-1.5 text-xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2 rounded-lg border border-border bg-card p-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      ) : executions.length === 0 ? (
        <EmptyState
          icon={History}
          title="No queries yet"
          description="Questions you run from the assistant appear here with their execution details."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[45%]">Question</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Rows</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Executed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {executions.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="max-w-xs truncate text-[13px] text-foreground">
                    {row.natural_query}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={row.status === "success" ? "success" : row.status === "failed" ? "destructive" : "secondary"}
                      className="text-[10px]"
                    >
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs tabular-nums">{row.row_count}</TableCell>
                  <TableCell className="text-xs tabular-nums text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {Math.round(row.duration_ms)}ms
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(row.created_at).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
