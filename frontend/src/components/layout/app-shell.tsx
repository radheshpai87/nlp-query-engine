"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { useShellStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { getStoredToken, getStoredUser } from "@/lib/auth-api";
import { NexusLogo } from "@/components/ui/nexus-logo";

interface AppShellProps {
  children: React.ReactNode;
}

// Pages that live outside the authenticated application shell.
const STANDALONE_ROUTES = ["/", "/login", "/register", "/forgot-password", "/reset-password", "/docs"];

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { mobileSidebarOpen, setMobileSidebarOpen, currentUser, setCurrentUser } = useShellStore();
  const [authChecked, setAuthChecked] = React.useState(false);

  const isStandalone = STANDALONE_ROUTES.includes(pathname ?? "") || (pathname?.startsWith("/docs") ?? false);

  React.useEffect(() => {
    if (isStandalone) {
      const token = getStoredToken();
      const storedUser = getStoredUser();
      if (!token || !storedUser) {
        if (currentUser) {
          setCurrentUser(null);
        }
      }
      setAuthChecked(true);
      return;
    }

    const token = getStoredToken();
    const storedUser = getStoredUser();

    if (!token && !storedUser) {
      setAuthChecked(false);
      router.replace("/login");
      return;
    }

    if (storedUser && !currentUser) {
      setCurrentUser(storedUser);
    }

    setAuthChecked(true);
  }, [pathname, isStandalone, router, currentUser, setCurrentUser]);

  if (isStandalone) {
    return <div className="min-h-screen w-full bg-background text-foreground">{children}</div>;
  }

  // Prevent flash of protected views (like /chat) before auth check completes or if redirecting
  if (!authChecked) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#080A0E] text-foreground">
        <div className="flex flex-col items-center gap-3">
          <NexusLogo size={36} className="animate-pulse" />
          <p className="text-xs text-muted-foreground">Authenticating session...</p>
        </div>
      </div>
    );
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
