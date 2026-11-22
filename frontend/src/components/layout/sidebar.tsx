"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Bookmark,
  ChevronDown,
  ChevronUp,
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
  Search,
  Settings,
  SquarePen,
  TableProperties,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useShellStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { StatusIndicator, type ConnectionStatus } from "@/components/ui/status-indicator";
import { NexusLogo } from "@/components/ui/nexus-logo";
import { authFetch } from "@/lib/auth-api";
import {
  listConversations,
  deleteConversation,
  type Conversation,
} from "@/lib/conversation-api";

interface SidebarConnection {
  id: string;
  name: string;
  status: ConnectionStatus;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

function SidebarContent() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentChatId = searchParams?.get("c") || null;

  const { sidebarCollapsed, toggleSidebar, currentWorkspace, currentUser, logoutUser } =
    useShellStore();

  const [connections, setConnections] = React.useState<SidebarConnection[]>([]);
  const [conversations, setConversations] = React.useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [accountMenuOpen, setAccountMenuOpen] = React.useState(false);
  const accountMenuRef = React.useRef<HTMLDivElement>(null);

  const handleNewChatClick = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("new-chat-requested"));
    }
    router.replace("/chat");
  };

  // Close account menu when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    }
    if (accountMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [accountMenuOpen]);

  // Load connections count/status
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
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, [currentWorkspace.id]);

  // Load chat history
  const loadConversations = React.useCallback(async () => {
    try {
      const data = await listConversations(currentWorkspace.id);
      if (Array.isArray(data)) {
        setConversations(data);
      }
    } catch {
      // ignore offline/unauthenticated
    }
  }, [currentWorkspace.id]);

  React.useEffect(() => {
    loadConversations();
    const handleUpdate = () => {
      loadConversations();
    };
    if (typeof window !== "undefined") {
      window.addEventListener("conversations-updated", handleUpdate);
      return () => {
        window.removeEventListener("conversations-updated", handleUpdate);
      };
    }
  }, [loadConversations, pathname, currentChatId]);

  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await deleteConversation(currentWorkspace.id, convId);
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      if (currentChatId === convId) {
        router.push("/chat");
      }
    } catch (err) {
      console.error("Failed to delete chat", err);
    }
  };

  const filteredConversations = React.useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const query = searchQuery.toLowerCase();
    return conversations.filter((c) => (c.title || "").toLowerCase().includes(query));
  }, [conversations, searchQuery]);

  const userInitial = currentUser?.full_name?.charAt(0).toUpperCase() || "A";

  return (
    <TooltipProvider delayDuration={150}>
      <aside
        data-testid="app-sidebar"
        className={cn(
          "relative z-30 flex select-none flex-col border-r border-sidebar-border bg-sidebar text-foreground transition-[width] duration-200 ease-out h-full",
          sidebarCollapsed ? "w-[60px]" : "w-[260px]"
        )}
      >
        {/* Brand & Collapse Header */}
        <div
          className={cn(
            "flex h-12 shrink-0 items-center border-b border-sidebar-border/60",
            sidebarCollapsed ? "justify-center px-2" : "justify-between px-3"
          )}
        >
          <Link href="/chat" onClick={handleNewChatClick} className="flex min-w-0 items-center gap-2">
            <NexusLogo size={26} />
            {!sidebarCollapsed && (
              <span className="truncate text-[13px] font-semibold tracking-tight text-foreground">
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

        {/* Primary Actions: New Chat & Core Navigation */}
        <div className={cn("pt-2.5 pb-2 space-y-1.5", sidebarCollapsed ? "px-2" : "px-3")}>
          {/* New Chat Button */}
          {sidebarCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleNewChatClick}
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 border-border bg-card/60 text-foreground hover:bg-muted"
                  aria-label="New chat"
                >
                  <SquarePen className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">New chat</TooltipContent>
            </Tooltip>
          ) : (
            <Button
              onClick={handleNewChatClick}
              variant="outline"
              className="h-9 w-full justify-between border-border/80 bg-card/40 text-[13px] font-medium text-foreground hover:bg-muted/80 shadow-xs"
            >
              <div className="flex items-center gap-2">
                <SquarePen className="h-4 w-4 text-foreground/80" />
                <span>New chat</span>
              </div>
            </Button>
          )}

          {/* Search Chats Input (ChatGPT style) */}
          {!sidebarCollapsed && (
            <div className="relative flex items-center">
              <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search chats..."
                className="h-8 pl-8 pr-7 text-xs bg-muted/40 border-border/50 focus-visible:ring-1 rounded-lg"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 text-muted-foreground hover:text-foreground p-0.5"
                  aria-label="Clear search"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          )}

          {/* Schema Explorer & Connections Navigation */}
          <div className="pt-1 space-y-0.5">
            {sidebarCollapsed ? (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href="/schema"
                      className={cn(
                        "mx-auto flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground",
                        pathname === "/schema" && "bg-accent text-foreground"
                      )}
                      aria-label="Schema"
                    >
                      <Network className="h-4 w-4" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">Schema</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href="/connections"
                      className={cn(
                        "mx-auto flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground",
                        pathname === "/connections" && "bg-accent text-foreground"
                      )}
                      aria-label="Connections"
                    >
                      <Database className="h-4 w-4" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">Connections</TooltipContent>
                </Tooltip>
              </>
            ) : (
              <>
                <Link
                  href="/schema"
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] transition-colors",
                    pathname === "/schema"
                      ? "bg-accent text-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  )}
                >
                  <Network className="h-4 w-4 shrink-0" />
                  <span>Schema</span>
                </Link>

                <Link
                  href="/connections"
                  className={cn(
                    "flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[13px] transition-colors",
                    pathname === "/connections"
                      ? "bg-accent text-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Database className="h-4 w-4 shrink-0" />
                    <span>Connections</span>
                  </div>
                  {connections.length > 0 && (
                    <span className="text-[11px] font-mono text-muted-foreground bg-muted px-1.5 py-0.2 rounded-full">
                      {connections.length}
                    </span>
                  )}
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Chat History Section (ChatGPT Style) */}
        <div className="flex-1 overflow-y-auto px-2 py-2 border-t border-sidebar-border/40">
          {!sidebarCollapsed && (
            <div className="flex items-center justify-between px-2 pb-1.5">
              <span className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                Chats
              </span>
            </div>
          )}

          {sidebarCollapsed ? (
            <div className="space-y-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/history"
                    className={cn(
                      "mx-auto flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground",
                      pathname === "/history" && "bg-accent text-foreground"
                    )}
                    aria-label="History"
                  >
                    <History className="h-4 w-4" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">Chat History</TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <div className="space-y-0.5">
              {filteredConversations.length === 0 ? (
                <div className="px-2 py-6 text-center text-xs text-muted-foreground">
                  {searchQuery ? "No matching chats" : "No recent chats"}
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const isCurrent = currentChatId === conv.id;
                  return (
                    <Link
                      key={conv.id}
                      href={`/chat?c=${conv.id}`}
                      className={cn(
                        "group flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[13px] transition-colors",
                        isCurrent
                          ? "bg-accent text-foreground font-medium shadow-2xs"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-1">
                        <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-70" />
                        <span className="truncate text-xs">{conv.title || "Untitled query"}</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteConversation(conv.id, e)}
                        className="opacity-0 group-hover:opacity-100 hover:text-red-400 p-1 rounded-sm transition-opacity"
                        aria-label="Delete chat"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </Link>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Footer: User Account Button with Dropdown (ChatGPT style) */}
        <div className="relative border-t border-sidebar-border/60 p-2" ref={accountMenuRef}>
          {/* Popover Menu (Pops upward) */}
          {accountMenuOpen && !sidebarCollapsed && (
            <div className="absolute bottom-14 left-2 right-2 rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-lg z-50 animate-in fade-in-0 zoom-in-95 duration-100">
              <div className="px-2 py-1.5 border-b border-border/50 mb-1">
                <p className="text-xs font-semibold truncate text-foreground">
                  {currentUser?.full_name || "Admin User"}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {currentUser?.email || "admin@example.com"}
                </p>
              </div>

              <div className="space-y-0.5">
                <Link
                  href="/settings"
                  onClick={() => setAccountMenuOpen(false)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <Settings className="h-3.5 w-3.5" />
                  <span>Settings</span>
                </Link>

                <Link
                  href="/audit"
                  onClick={() => setAccountMenuOpen(false)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <ScrollText className="h-3.5 w-3.5" />
                  <span>Audit log</span>
                </Link>

                <Link
                  href="/executions"
                  onClick={() => setAccountMenuOpen(false)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <TableProperties className="h-3.5 w-3.5" />
                  <span>Executions</span>
                </Link>

                <Link
                  href="/saved-queries"
                  onClick={() => setAccountMenuOpen(false)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <Bookmark className="h-3.5 w-3.5" />
                  <span>Saved queries</span>
                </Link>
              </div>

              <div className="border-t border-border/50 my-1 pt-1">
                {currentUser ? (
                  <button
                    type="button"
                    onClick={() => {
                      setAccountMenuOpen(false);
                      logoutUser();
                    }}
                    className="flex w-full items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Log out</span>
                  </button>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setAccountMenuOpen(false)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <LogIn className="h-3.5 w-3.5" />
                    <span>Sign in</span>
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Account Button Trigger */}
          {sidebarCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/settings"
                  className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground hover:bg-muted"
                  aria-label="Settings"
                >
                  {userInitial}
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Settings & Account</TooltipContent>
            </Tooltip>
          ) : (
            <button
              type="button"
              onClick={() => setAccountMenuOpen(!accountMenuOpen)}
              className={cn(
                "flex w-full items-center justify-between rounded-lg p-1.5 text-left transition-colors hover:bg-muted/70",
                accountMenuOpen && "bg-muted"
              )}
              aria-label="Account menu"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground shadow-2xs">
                  {userInitial}
                </span>
                <div className="min-w-0">
                  <span className="block truncate text-xs font-medium leading-tight text-foreground">
                    {currentUser?.full_name || "Demo Admin"}
                  </span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {currentUser?.email || "admin@example.com"}
                  </span>
                </div>
              </div>
              {accountMenuOpen ? (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              ) : (
                <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              )}
            </button>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}

export function Sidebar() {
  return (
    <React.Suspense fallback={<aside className="border-r border-border bg-sidebar shrink-0 md:w-64" />}>
      <SidebarContent />
    </React.Suspense>
  );
}
