import * as React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-rose-200 bg-rose-50/50 p-6 text-center dark:border-rose-900 dark:bg-rose-950/20",
        className
      )}
      role="alert"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400 mb-3">
        <AlertCircle className="h-5 w-5" />
      </div>
      <h4 className="text-sm font-semibold text-rose-900 dark:text-rose-200 mb-1">
        {title}
      </h4>
      <p className="text-xs text-rose-700 dark:text-rose-400 max-w-sm mb-4">
        {message}
      </p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="border-rose-300 text-rose-800 hover:bg-rose-100 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-900/40"
        >
          <RefreshCw className="mr-2 h-3.5 w-3.5" />
          Try Again
        </Button>
      )}
    </div>
  );
}
