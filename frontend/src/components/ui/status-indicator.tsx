import * as React from "react";
import { cn } from "@/lib/utils";

export type ConnectionStatus = "online" | "offline" | "connecting" | "error";

interface StatusIndicatorProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: ConnectionStatus;
  label?: string;
  showPing?: boolean;
}

export function StatusIndicator({
  status,
  label,
  showPing = true,
  className,
  ...props
}: StatusIndicatorProps) {
  const statusColors: Record<ConnectionStatus, { dot: string; ping: string; text: string }> = {
    online: {
      dot: "bg-brand",
      ping: "bg-emerald-400",
      text: "Online",
    },
    offline: {
      dot: "bg-slate-400",
      ping: "bg-slate-300",
      text: "Disconnected",
    },
    connecting: {
      dot: "bg-amber-500",
      ping: "bg-amber-400",
      text: "Connecting",
    },
    error: {
      dot: "bg-rose-500",
      ping: "bg-rose-400",
      text: "Error",
    },
  };

  const config = statusColors[status] || statusColors.offline;

  return (
    <span
      className={cn("inline-flex items-center gap-2 text-xs font-medium text-muted-foreground", className)}
      {...props}
    >
      <span className="relative flex h-2 w-2">
        {showPing && status === "online" && (
          <span
            className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
              config.ping
            )}
          />
        )}
        <span className={cn("relative inline-flex h-2 w-2 rounded-full", config.dot)} />
      </span>
      {label ?? config.text}
    </span>
  );
}
