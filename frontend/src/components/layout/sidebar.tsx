"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageSquare,
  Plus,
  Search,
  Database,
  Network,
  History,
  BookmarkCheck,
  Activity,
  ShieldCheck,
  Settings,
  ChevronLeft,
  ChevronRight,
  Layers,
  ChevronDown,
  User,
  Check,
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

  const navLinks = [
    {
      group: "AI Assistant",
      items: [
        { label: "New Conversation", href: "/chat", icon: MessageSquare, badge: undefined },
        { label: "Saved Queries", href: "/saved-queries", icon: BookmarkCheck },
        { label: "Query History", href: "/history", icon: History },
      ],
    },
    {
      group: "Data Sources",
      items: [
        { label: "Connections", href: "/connections", icon: Database },
        { label: "Schema Explorer", href: "/schema", icon: Network },
      ],
    },
    {
      group: "Workspace Tools",
      items: [
        { label: "Executions", href: "/executions", icon: Activity },
        { label: "Audit Log", href: "/audit", icon: ShieldCheck },
        { label: "Settings", href: "/settings", icon: Settings },
      ],
    },
  ];

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        data-testid="app-sidebar"
        className={cn(
          "relative flex flex-col border-r border-[#262626] bg-[#171717] text-[#ececec] transition-all duration-300 ease-in-out z-30 select-none",
          sidebarCollapsed ? "w-16" : "w-64"
        )}
      >
        {/* Workspace Switcher Header */}
        <div className="flex h-14 items-center justify-between border-b border-[#262626] px-3">
          {!sidebarCollapsed ? (
            <div className="relative w-full">
              <button
                type="button"
                onClick={() => setWorkspaceDropdownOpen(!workspaceDropdownOpen)}
                className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm font-semibold text-[#ececec] hover:bg-[#212121] transition-colors"
                aria-expanded={workspaceDropdownOpen}
                aria-label="Switch workspace"
              >
                <div className="flex items-center gap-2 truncate">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-[#212121] text-[#10a37f] border border-[#2f2f2f]">
                    <Layers className="h-4 w-4" />
                  </div>
                  <span className="truncate">{currentWorkspace.name}</span>
                </div>
                <ChevronDown className="h-4 w-4 shrink-0 text-[#8e8e8e]" />
              </button>

              {/* Workspace Dropdown */}
              {workspaceDropdownOpen && (
                <div className="absolute left-0 top-12 z-50 w-56 rounded-md border border-[#303030] bg-[#1e1e1e] p-1 shadow-lg animate-in fade-in-50">
                  <div className="px-2 py-1 text-xs font-medium text-[#8e8e8e]">
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
                        "flex w-full items-center justify-between rounded px-2 py-1.5 text-xs text-left transition-colors",
                        ws.id === currentWorkspace.id
                          ? "bg-[#2f2f2f] text-white font-medium"
                          : "text-[#b4b4b4] hover:bg-[#262626] hover:text-white"
                      )}
                    >
                      <span>{ws.name}</span>
                      {ws.id === currentWorkspace.id && <Check className="h-3.5 w-3.5 text-[#10a37f]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="mx-auto flex h-8 w-8 items-center justify-center rounded bg-[#212121] text-[#10a37f] border border-[#2f2f2f]">
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

        {/* Quick Action: New Chat & Search */}
        <div className="p-3 space-y-2 border-b border-[#262626]">
          {!sidebarCollapsed ? (
            <>
              <Link href="/chat" className="w-full block">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2.5 border-[#303030] bg-[#212121] text-[#ececec] hover:bg-[#2f2f2f] hover:text-white text-xs h-9 font-medium shadow-none"
                >
                  <Plus className="h-4 w-4 text-[#10a37f]" />
                  <span>New Chat</span>
                </Button>
              </Link>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg border border-[#262626] bg-[#212121] px-2.5 py-1.5 text-xs text-[#8e8e8e] hover:bg-[#2f2f2f] hover:text-[#ececec] transition-colors"
              >
                <Search className="h-3.5 w-3.5" />
                <span className="flex-1 text-left">Search chats...</span>
                <kbd className="rounded bg-[#171717] border border-[#2f2f2f] px-1.5 py-0.5 text-[10px] font-mono text-[#8e8e8e]">⌘K</kbd>
              </button>
            </>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/chat">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 border-[#303030] bg-[#212121] text-[#ececec] hover:bg-[#2f2f2f]"
                  >
                    <Plus className="h-4 w-4 text-[#10a37f]" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">New Chat</TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
          {navLinks.map((section) => (
            <div key={section.group}>
              {!sidebarCollapsed && (
                <div className="px-2 pb-1 text-[10px] font-semibold tracking-wider text-[#737373] uppercase">
                  {section.group}
                </div>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
                  const Icon = item.icon;

                  if (sidebarCollapsed) {
                    return (
                      <Tooltip key={item.href}>
                        <TooltipTrigger asChild>
                          <Link
                            href={item.href}
                            className={cn(
                              "flex h-9 w-9 mx-auto items-center justify-center rounded-lg transition-colors",
                              isActive
                                ? "bg-[#2f2f2f] text-white"
                                : "text-[#b4b4b4] hover:bg-[#212121] hover:text-white"
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
                        "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-normal transition-colors",
                        isActive
                          ? "bg-[#2f2f2f] text-white font-medium"
                          : "text-[#b4b4b4] hover:bg-[#212121] hover:text-white"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0 text-[#8e8e8e]" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Connected Data Sources List */}
          {!sidebarCollapsed && (
            <div className="pt-2 border-t border-[#262626]">
              <div className="flex items-center justify-between px-2 pb-1 text-[10px] font-semibold tracking-wider text-[#737373] uppercase">
                <span>Active Targets</span>
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
                    className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-[#b4b4b4] hover:bg-[#212121] hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Database className="h-3.5 w-3.5 text-[#8e8e8e] shrink-0" />
                      <span className="truncate text-[11px]">{conn.name}</span>
                    </div>
                    <StatusIndicator status={conn.status} showPing={false} className="text-[10px]" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Footer: User Profile & Collapse Toggle */}
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
            className="h-7 w-7 text-[#8e8e8e] hover:bg-[#212121] hover:text-[#ececec]"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
