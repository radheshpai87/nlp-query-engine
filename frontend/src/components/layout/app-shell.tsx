"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { useShellStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
}

// Pages that live outside the authenticated application shell.
const STANDALONE_ROUTES = ["/", "/login", "/register", "/forgot-password", "/reset-password"];

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const { mobileSidebarOpen, setMobileSidebarOpen } = useShellStore();

  if (STANDALONE_ROUTES.includes(pathname ?? "")) {
    return <div className="min-h-screen w-full bg-background text-foreground">{children}</div>;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <div className="hidden shrink-0 md:flex">
        <Sidebar />
      </div>

      {mobileSidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 md:hidden",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <Sidebar />
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {pathname !== "/chat" && <Topbar />}
        <main className="flex-1 overflow-auto bg-background">{children}</main>
      </div>
    </div>
  );
}
