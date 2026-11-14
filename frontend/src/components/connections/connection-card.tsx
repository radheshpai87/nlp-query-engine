"use client";

import * as React from "react";
import { RefreshCw, Trash2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusIndicator, type ConnectionStatus } from "@/components/ui/status-indicator";

export interface DatabaseConnectionItem {
  id: string;
  name: string;
  db_type: "postgres" | "mongodb" | "elasticsearch";
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  status: ConnectionStatus;
  status_message?: string;
  last_verified_at?: string;
  is_enabled: boolean;
}

interface ConnectionCardProps {
  connection: DatabaseConnectionItem;
  onTest?: (id: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  isTesting?: boolean;
}

export function ConnectionCard({
  connection,
  onTest,
  onDelete,
  isTesting = false,
}: ConnectionCardProps) {
  const [showConfirmDelete, setShowConfirmDelete] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const handleDelete = async () => {
    if (onDelete) {
      setDeleting(true);
      try {
        await onDelete(connection.id);
      } finally {
        setDeleting(false);
        setShowConfirmDelete(false);
      }
    }
  };

  const typeLabels: Record<string, string> = {
    postgres: "PostgreSQL",
    mongodb: "MongoDB",
    elasticsearch: "Elasticsearch",
  };

  return (
    <Card className="hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="font-mono text-[10px]">
            {typeLabels[connection.db_type] || connection.db_type}
          </Badge>
          <StatusIndicator status={connection.status} />
        </div>
        <CardTitle className="text-base mt-2 truncate">{connection.name}</CardTitle>
        <CardDescription className="text-xs font-mono truncate">
          {connection.host ? `${connection.host}:${connection.port || ""}` : "Custom URI"} / {connection.database || "default"}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        {connection.status_message && (
          <div className="text-[11px] text-muted-foreground bg-muted/60 p-2 rounded truncate" title={connection.status_message}>
            {connection.status_message}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/60 pt-2">
          <span>Last checked</span>
          <span>{connection.last_verified_at ? new Date(connection.last_verified_at).toLocaleTimeString() : "Pending test"}</span>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-border/60">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onTest && onTest(connection.id)}
            disabled={isTesting}
            className="flex-1 text-xs gap-1.5"
          >
            <RefreshCw className={`h-3 w-3 ${isTesting ? "animate-spin" : ""}`} />
            <span>{isTesting ? "Testing..." : "Test"}</span>
          </Button>

          {!showConfirmDelete ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowConfirmDelete(true)}
              className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
              aria-label="Delete connection"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          ) : (
            <div className="flex items-center gap-1">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={deleting}
                className="h-8 text-xs px-2"
              >
                {deleting ? "Deleting..." : "Confirm"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowConfirmDelete(false)}
                className="h-8 text-xs px-2"
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
