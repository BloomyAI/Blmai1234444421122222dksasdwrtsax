"use client";

import { Files, Search, GitBranch, Terminal, Sparkles } from "lucide-react";

export type SidebarView = "explorer" | "search" | "git" | "ai";

interface ActivityBarProps {
  active: SidebarView;
  onChange: (view: SidebarView) => void;
  terminalOpen: boolean;
  onToggleTerminal: () => void;
}

export function ActivityBar({ active, onChange, terminalOpen, onToggleTerminal }: ActivityBarProps) {
  const items: { id: SidebarView | "terminal"; icon: typeof Files; title: string }[] = [
    { id: "explorer", icon: Files, title: "Explorer" },
    { id: "search", icon: Search, title: "Search" },
    { id: "git", icon: GitBranch, title: "Source Control" },
    { id: "ai", icon: Sparkles, title: "AI Agent" },
  ];

  return (
    <div className="w-12 bg-[#010409] border-r border-[#30363D] flex flex-col items-center py-2 gap-1 shrink-0">
      {items.map(({ id, icon: Icon, title }) => (
        <button
          key={id}
          onClick={() => onChange(id as SidebarView)}
          title={title}
          className={`p-2 rounded-lg transition-colors ${
            active === id ? "text-[#C9D1D9] border-l-2 border-[#F78166] bg-[#161B22]" : "text-[#8B949E] hover:text-[#C9D1D9]"
          }`}
        >
          <Icon className="w-5 h-5" />
        </button>
      ))}
      <div className="flex-1" />
      <button
        onClick={onToggleTerminal}
        title="Terminal"
        className={`p-2 rounded-lg transition-colors ${terminalOpen ? "text-[#C9D1D9]" : "text-[#8B949E] hover:text-[#C9D1D9]"}`}
      >
        <Terminal className="w-5 h-5" />
      </button>
    </div>
  );
}
