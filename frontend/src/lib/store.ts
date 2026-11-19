import { create } from "zustand";

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
  
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setMobileSidebarOpen: (open: boolean) => void;
  setActiveNav: (nav: string) => void;
  setCurrentWorkspace: (workspace: Workspace) => void;
}

export const useShellStore = create<ShellState>((set) => ({
  sidebarCollapsed: false,
  mobileSidebarOpen: false,
  activeNav: "/chat",
  currentWorkspace: {
    id: "ws-default",
    name: "Nexus Query",
    role: "admin",
  },
  workspaces: [
    { id: "ws-default", name: "Nexus Query", role: "admin" },
  ],

  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
  setActiveNav: (nav) => set({ activeNav: nav }),
  setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),
}));
