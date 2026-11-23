"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NexusLogo } from "@/components/ui/nexus-logo";
import { GitHubStarButton } from "@/components/ui/github-star-button";
import { useShellStore } from "@/lib/store";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/connections": "Connections",
  "/schema": "Schema explorer",
  "/history": "History",
  "/saved-queries": "Saved queries",
  "/executions": "Executions",
  "/audit": "Audit log",
  "/settings": "Settings",
  "/onboarding": "Get started",
};

export function Topbar() {
  const pathname = usePathname();
  const { currentWorkspace, setMobileSidebarOpen, mobileSidebarOpen } = useShellStore();
  const title = PAGE_TITLES[pathname ?? ""] ?? "Workspace";

  return (
    <header className="z-20 flex h-12 shrink-0 items-center justify-between border-b border-border bg-background px-4">
      <div className="flex items-center gap-2.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          aria-label="Toggle navigation menu"
        >
          <Menu className="h-4 w-4" />
        </Button>
        <NexusLogo size={20} className="md:hidden shrink-0" />
        <span className="text-[13px] font-medium">{title}</span>
        <span className="hidden text-[11px] text-muted-foreground sm:inline">
          {currentWorkspace.name}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <GitHubStarButton label="Star" className="text-[11px] py-0.5 px-2 h-7" />

        <Link
          href="/docs"
          className="text-[11px] text-muted-foreground transition-colors hover:text-amber-400"
        >
          API docs
        </Link>
      </div>
    </header>
  );
}
