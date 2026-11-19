"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageSquare,
  Plus,
  Database,
  Network,
  History,
  ShieldCheck,
  Settings,
  ChevronLeft,
  ChevronRight,
  Layers,
  ChevronDown,
  Check,
  Home,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useShellStore, type Workspace } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { StatusIndicator, type ConnectionStatus } from "@/components/ui/status-indicator";
import { authFetch } from "@/lib/auth-api";

interface SidebarConnection {
  id: string;
  name: string;
  status: ConnectionStatus;
}

const defaultConnections: SidebarConnection[] = [
  { id: "conn-pg", name: "PostgreSQL Orders", status: "online" },
  { id: "conn-mongo", name: "MongoDB Events", status: "online" },
  { id: "conn-es", name: "Elasticsearch Logs", status: "online" },
];

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export function Sidebar() {
  const pathname = usePathname();
  const {
    sidebarCollapsed,
    toggleSidebar,
    currentWorkspace,
    workspaces,
    setCurrentWorkspace,
  } = useShellStore();

  const [workspaceDropdownOpen, setWorkspaceDropdownOpen] = React.useState(false);
  const [connections, setConnections] = React.useState<SidebarConnection[]>(defaultConnections);

  React.useEffect(() => {
    let ignore = false;
    authFetch(`${API_BASE}/workspaces/${currentWorkspace.id}/connections`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!ignore && Array.isArray(data) && data.length > 0) {
          setConnections(
            data.map((c) => ({
              id: c.id,
              name: c.name,
              status: (c.status || (c.is_enabled ? "online" : "offline")) as ConnectionStatus,
            }))
          );
        }
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, [currentWorkspace.id]);

  const navItems = [
    { label: "Overview", href: "/", icon: Home },
    { label: "New Conversation", href: "/chat", icon: MessageSquare },
    { label: "Schema Explorer", href: "/schema", icon: Network },
    { label: "Connections", href: "/connections", icon: Database },
    { label: "Audit & History", href: "/audit", icon: ShieldCheck },
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        data-testid="app-sidebar"
        className={cn(
          "relative flex flex-col border-r border-[#2d2d2d] bg-[#171717] text-[#ececec] transition-all duration-300 ease-in-out z-30 select-none",
          sidebarCollapsed ? "w-16" : "w-60"
        )}
      >
        {/* Workspace Switcher Header */}
        <div className="flex h-14 items-center justify-between border-b border-[#262626] px-3">
          {!sidebarCollapsed ? (
            <div className="relative w-full">
              <button
                type="button"
                onClick={() => setWorkspaceDropdownOpen(!workspaceDropdownOpen)}
                className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs font-semibold text-[#ececec] hover:bg-[#212121] transition-colors"
                aria-expanded={workspaceDropdownOpen}
                aria-label="Switch workspace"
              >
                <div className="flex items-center gap-2 truncate">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#212121] text-[#10a37f] border border-[#303030]">
                    <Layers className="h-3.5 w-3.5" />
                  </div>
                  <span className="truncate">{currentWorkspace.name}</span>
                </div>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[#8e8e8e]" />
              </button>

              {/* Workspace Dropdown */}
              {workspaceDropdownOpen && (
                <div className="absolute left-0 top-12 z-50 w-52 rounded-lg border border-[#303030] bg-[#1e1e1e] p-1 shadow-xl animate-in fade-in-50">
                  <div className="px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-[#8e8e8e]">
                    Workspaces
                  </div>
                  {workspaces.map((ws: Workspace) => (
                    <button
                      key={ws.id}
                      onClick={() => {
                        setCurrentWorkspace(ws);
                        setWorkspaceDropdownOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs text-left transition-colors",
                        ws.id === currentWorkspace.id
                          ? "bg-[#2f2f2f] text-white font-medium"
                          : "text-[#b4b4b4] hover:bg-[#262626] hover:text-white"
                      )}
                    >
                      <span className="truncate">{ws.name}</span>
                      {ws.id === currentWorkspace.id && <Check className="h-3.5 w-3.5 text-[#10a37f]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-md bg-[#212121] text-[#10a37f] border border-[#303030]">
                  <Layers className="h-4 w-4" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p className="font-semibold">{currentWorkspace.name}</p>
                <p className="text-xs text-[#8e8e8e]">Role: {currentWorkspace.role}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* ChatGPT Style New Chat Button */}
        <div className="p-2.5">
          {!sidebarCollapsed ? (
            <Link href="/chat" className="w-full block">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2.5 border-[#303030] bg-[#212121] text-[#ececec] hover:bg-[#2b2b2b] hover:text-white hover:border-[#424242] text-xs h-9 font-medium shadow-none rounded-xl transition-all"
              >
                <Plus className="h-4 w-4 text-[#10a37f]" />
                <span>New Chat</span>
              </Button>
            </Link>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/chat">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 border-[#303030] bg-[#212121] text-[#ececec] hover:bg-[#2f2f2f] rounded-xl"
                  >
                    <Plus className="h-4 w-4 text-[#10a37f]" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">New Chat</TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Simplified Navigation List (Clean ChatGPT Style) */}
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname?.startsWith(`${item.href}/`);
            const Icon = item.icon;

            if (sidebarCollapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex h-9 w-9 mx-auto items-center justify-center rounded-xl transition-colors",
                        isActive
                          ? "bg-[#2f2f2f] text-white"
                          : "text-[#8e8e8e] hover:bg-[#212121] hover:text-white"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-normal transition-colors",
                  isActive
                    ? "bg-[#262626] text-white font-medium"
                    : "text-[#a3a3a3] hover:bg-[#212121] hover:text-white"
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-[#10a37f]" : "text-[#737373]")} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}

          {/* Minimalist Data Sources Status */}
          {!sidebarCollapsed && (
            <div className="pt-4 mt-2 border-t border-[#262626]">
              <div className="flex items-center justify-between px-2 pb-1.5 text-[10px] font-medium tracking-wider text-[#737373] uppercase">
                <span>Data Sources</span>
                <Link
                  href="/connections"
                  className="text-[10px] text-[#10a37f] hover:underline normal-case font-normal"
                >
                  Manage
                </Link>
              </div>
              <div className="space-y-0.5">
                {connections.map((conn) => (
                  <Link
                    key={conn.id}
                    href={`/connections?id=${conn.id}`}
                    className="flex items-center justify-between rounded-lg px-2.5 py-1 text-xs text-[#8e8e8e] hover:bg-[#212121] hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Database className="h-3 w-3 text-[#737373] shrink-0" />
                      <span className="truncate text-[11px]">{conn.name}</span>
                    </div>
                    <StatusIndicator status={conn.status} showPing={false} className="text-[10px]" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Footer: Profile & Toggle Button */}
        <div className="border-t border-[#262626] p-2 flex items-center justify-between">
          {!sidebarCollapsed ? (
            <div className="flex items-center gap-2.5 px-2 py-1 truncate flex-1">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2f2f2f] text-[#ececec] shrink-0 text-xs font-semibold">
                R
              </div>
              <div className="truncate">
                <div className="text-xs font-medium text-[#ececec] truncate leading-tight">Radhesh Pai</div>
                <div className="text-[10px] text-[#737373] truncate">Workspace Admin</div>
              </div>
            </div>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-[#2f2f2f] text-[#ececec] text-xs font-semibold">
                  R
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">Radhesh Pai (Admin)</TooltipContent>
            </Tooltip>
          )}

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            data-testid="sidebar-toggle-btn"
            className="h-7 w-7 text-[#8e8e8e] hover:bg-[#212121] hover:text-[#ececec] rounded-lg"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
