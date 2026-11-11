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
    name: "Enterprise Analytics",
    role: "admin",
  },
  workspaces: [
    { id: "ws-default", name: "Enterprise Analytics", role: "admin" },
    { id: "ws-finance", name: "Finance & Billing", role: "member" },
    { id: "ws-ecommerce", name: "E-Commerce Operations", role: "member" },
  ],

  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
  setActiveNav: (nav) => set({ activeNav: nav }),
  setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),
}));
