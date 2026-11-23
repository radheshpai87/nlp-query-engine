import { create } from "zustand";
import { AuthUser, getStoredUser, logout as clearAuth } from "./auth-api";

export interface Workspace {
  id: string;
  name: string;
  role: "admin" | "member" | "viewer";
}

export interface ShellState {
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  activeNav: string;
  currentWorkspace: Workspace;
  workspaces: Workspace[];
  currentUser: AuthUser | null;
  
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setMobileSidebarOpen: (open: boolean) => void;
  setActiveNav: (nav: string) => void;
  setCurrentWorkspace: (workspace: Workspace) => void;
  setCurrentUser: (user: AuthUser | null) => void;
  logoutUser: () => void;
}

export const useShellStore = create<ShellState>((set) => ({
  sidebarCollapsed: false,
  mobileSidebarOpen: false,
  activeNav: "/chat",
  currentWorkspace: {
    id: "ws_default",
    name: "Nexus Query",
    role: "admin",
  },
  workspaces: [
    { id: "ws_default", name: "Nexus Query", role: "admin" },
  ],
  currentUser: typeof window !== "undefined" ? getStoredUser() : null,

  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
  setActiveNav: (nav) => set({ activeNav: nav }),
  setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),
  setCurrentUser: (user) => set({ currentUser: user }),
  logoutUser: () => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("stored-user");
        localStorage.removeItem("nlp_query_auth_token");
        localStorage.removeItem("nlp_query_auth_refresh_token");
        localStorage.removeItem("nlp_query_auth_user");
        sessionStorage.clear();
      } catch {
        // Best-effort
      }
    }
    try {
      clearAuth();
    } catch {
      // Best-effort
    }
    set({ currentUser: null });
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  },
}));
