"use client";

import * as React from "react";
import { Menu, Terminal, ShieldCheck, Database, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useShellStore } from "@/lib/store";

export function Topbar() {
  const { currentWorkspace, setMobileSidebarOpen, mobileSidebarOpen } = useShellStore();

  return (
    <header className="flex h-12 items-center justify-between border-b border-[#2d2d2d] bg-[#212121]/95 px-4 backdrop-blur-md z-20">
      <div className="flex items-center gap-3">
        {/* Mobile menu trigger */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-8 w-8 text-[#ececec] hover:bg-[#2f2f2f]"
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          aria-label="Toggle navigation menu"
        >
          <Menu className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#10a37f] text-white font-bold text-xs">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <span className="text-sm font-medium text-[#ececec] tracking-tight">
            Query Engine
          </span>
          <span className="text-[#737373] text-xs">/</span>
          <span className="text-xs text-[#b4b4b4] font-normal">
            {currentWorkspace.name}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#10a37f]/10 border border-[#10a37f]/30 text-[#10a37f] text-[11px] font-medium">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Read-Only Guard</span>
        </div>

        <a
          href="http://localhost:8000/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden md:inline-flex"
        >
          <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-[#b4b4b4] hover:text-[#ececec] hover:bg-[#2f2f2f]">
            <Terminal className="h-3.5 w-3.5" />
            <span>API Docs</span>
          </Button>
        </a>
      </div>
    </header>
  );
}
