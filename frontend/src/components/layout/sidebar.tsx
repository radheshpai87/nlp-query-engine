"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bookmark,
  Database,
  History,
  LogIn,
  LogOut,
  MessageSquare,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  ScrollText,
  Settings,
  SquarePen,
  TableProperties,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useShellStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { StatusIndicator, type ConnectionStatus } from "@/components/ui/status-indicator";
import { authFetch } from "@/lib/auth-api";

interface SidebarConnection {
  id: string;
  name: string;
  status: ConnectionStatus;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const NAV_GROUPS = [
  {
    label: "Workspace",
    items: [
      { label: "Assistant", href: "/chat", icon: MessageSquare },
      { label: "Schema", href: "/schema", icon: Network },
      { label: "Connections", href: "/connections", icon: Database },
    ],
  },
  {
    label: "Activity",
    items: [
      { label: "History", href: "/history", icon: History },
      { label: "Saved queries", href: "/saved-queries", icon: Bookmark },
      { label: "Executions", href: "/executions", icon: TableProperties },
      { label: "Audit log", href: "/audit", icon: ScrollText },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar, currentWorkspace, currentUser, logoutUser } =
    useShellStore();

  const [connections, setConnections] = React.useState<SidebarConnection[]>([]);
  const [connectionsLoaded, setConnectionsLoaded] = React.useState(false);

  React.useEffect(() => {
    let ignore = false;
    authFetch(`${API_BASE}/workspaces/${currentWorkspace.id}/connections`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (ignore) return;
        if (Array.isArray(data)) {
          setConnections(
            data.map((c) => ({
              id: c.id,
              name: c.name,
              status: (c.status || (c.is_enabled ? "online" : "offline")) as ConnectionStatus,
            }))
          );
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!ignore) setConnectionsLoaded(true);
      });
    return () => {
      ignore = true;
    };
  }, [currentWorkspace.id]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname?.startsWith(`${href}/`);

  const userInitial = currentUser?.full_name?.charAt(0).toUpperCase() || "?";

  return (
    <TooltipProvider delayDuration={150}>
      <aside
        data-testid="app-sidebar"
        className={cn(
          "relative z-30 flex select-none flex-col border-r border-sidebar-border bg-sidebar text-foreground transition-[width] duration-200 ease-out",
          sidebarCollapsed ? "w-[60px]" : "w-[236px]"
        )}
      >
        {/* Brand */}
        <div
          className={cn(
            "flex h-14 shrink-0 items-center border-b border-sidebar-border",
            sidebarCollapsed ? "justify-center px-2" : "justify-between px-3"
          )}
        >
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-foreground text-[11px] font-semibold text-background">
              N
            </span>
            {!sidebarCollapsed && (
              <span className="truncate text-[13px] font-medium tracking-tight">
                Nexus Query
              </span>
            )}
          </Link>

          {!sidebarCollapsed && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              data-testid="sidebar-toggle-btn"
              className="h-7 w-7 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          )}
        </div>

        {sidebarCollapsed && (
          <div className="flex justify-center py-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={toggleSidebar}
                  data-testid="sidebar-toggle-btn"
                  className="h-8 w-8 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Expand sidebar"
                >
                  <PanelLeftOpen className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Expand sidebar</TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* New conversation */}
        <div className={cn("pt-3", sidebarCollapsed ? "px-2" : "px-3")}>
          {sidebarCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/chat" aria-label="New conversation">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 border-border bg-transparent text-foreground hover:bg-muted"
                  >
                    <SquarePen className="h-4 w-4" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">New conversation</TooltipContent>
            </Tooltip>
          ) : (
            <Link href="/chat">
              <Button
                variant="outline"
                className="h-9 w-full justify-start gap-2 border-border bg-transparent text-[13px] font-normal text-foreground hover:bg-muted"
              >
                <SquarePen className="h-4 w-4 text-muted-foreground" />
                New chat
              </Button>
            </Link>
          )}
        </div>

        {/* Navigation */}
        <div className="mt-4 flex-1 overflow-y-auto px-2">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-4">
              {!sidebarCollapsed && (
                <p className="px-2 pb-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(item.href);
                  const Icon = item.icon;
                  const link = (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center rounded-md text-[13px] transition-colors",
                        sidebarCollapsed ? "mx-auto h-9 w-9 justify-center" : "gap-2.5 px-2 py-1.5",
                        active
                          ? "bg-accent text-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  );

                  return sidebarCollapsed ? (
                    <Tooltip key={item.href}>
                      <TooltipTrigger asChild>{link}</TooltipTrigger>
                      <TooltipContent side="right">{item.label}</TooltipContent>
                    </Tooltip>
                  ) : (
                    link
                  );
                })}
              </div>
            </div>
          ))}

          {/* Data sources */}
          <div className="mb-2 border-t border-sidebar-border pt-3">
            {!sidebarCollapsed && (
              <div className="flex items-center justify-between px-2 pb-1.5">
                <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Sources
                </p>
                <Link
                  href="/connections"
                  className="text-[10px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  Manage
                </Link>
              </div>
            )}

            {connections.length > 0 ? (
              <div className="space-y-0.5">
                {connections.map((connection) =>
                  sidebarCollapsed ? (
                    <Tooltip key={connection.id}>
                      <TooltipTrigger asChild>
                        <Link
                          href={`/connections?id=${connection.id}`}
                          className="mx-auto flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
                          aria-label={connection.name}
                        >
                          <Database className="h-3.5 w-3.5" />
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right">{connection.name}</TooltipContent>
                    </Tooltip>
                  ) : (
                    <Link
                      key={connection.id}
                      href={`/connections?id=${connection.id}`}
                      className="flex items-center justify-between gap-2 rounded-md px-2 py-1 text-[12px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <span className="truncate">{connection.name}</span>
                      <StatusIndicator
                        status={connection.status}
                        showPing={false}
                        label=""
                        className="shrink-0"
                      />
                    </Link>
                  )
                )}
              </div>
            ) : connectionsLoaded ? (
              <Link
                href="/connections"
                className={cn(
                  "flex items-center gap-2 rounded-md text-[12px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  sidebarCollapsed ? "mx-auto h-8 w-8 justify-center" : "px-2 py-1.5"
                )}
              >
                <Plus className="h-3.5 w-3.5 shrink-0" />
                {!sidebarCollapsed && <span>Connect a source</span>}
              </Link>
            ) : null}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-2">
          <div className={cn("flex items-center gap-1", sidebarCollapsed && "flex-col")}>
            <Link
              href="/settings"
              className={cn(
                "flex min-w-0 flex-1 items-center gap-2.5 rounded-md px-1.5 py-1.5 transition-colors hover:bg-muted",
                sidebarCollapsed && "flex-none justify-center px-0"
              )}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-medium text-foreground">
                {userInitial}
              </span>
              {!sidebarCollapsed && (
                <span className="min-w-0">
                  <span className="block truncate text-[12px] leading-tight">
                    {currentUser?.full_name || "Not signed in"}
                  </span>
                  <span className="block truncate text-[10px] text-muted-foreground">
                    {currentUser?.email || "Sign in to save work"}
                  </span>
                </span>
              )}
            </Link>

            {!sidebarCollapsed && (
              <div className="flex shrink-0 items-center">
                <Link
                  href="/settings"
                  aria-label="Settings"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Settings className="h-3.5 w-3.5" />
                </Link>
                {currentUser ? (
                  <button
                    type="button"
                    onClick={logoutUser}
                    aria-label="Sign out"
                    className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <Link
                    href="/login"
                    aria-label="Sign in"
                    className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <LogIn className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}
