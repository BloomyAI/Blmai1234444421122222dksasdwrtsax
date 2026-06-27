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
  const items: { id: SidebarView; icon: typeof Files; title: string }[] = [
    { id: "explorer", icon: Files, title: "Explorer" },
    { id: "search", icon: Search, title: "Search" },
    { id: "git", icon: GitBranch, title: "Source Control" },
    { id: "ai", icon: Sparkles, title: "Bloomy Coder" },
  ];

  return (
    <div className="w-12 bg-[#010409] border-r border-[#30363d] flex flex-col items-center shrink-0">
      {items.map(({ id, icon: Icon, title }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          title={title}
          className={`w-full h-12 flex items-center justify-center relative border-l-2 ${
            active === id
              ? "text-[#f0f6fc] border-[#f78166] bg-[#161b22]"
              : "text-[#7d8590] border-transparent hover:text-[#c9d1d9] hover:bg-[#161b22]"
          }`}
        >
          <Icon className="w-5 h-5" strokeWidth={1.75} />
        </button>
      ))}
      <div className="flex-1" />
      <button
        onClick={onToggleTerminal}
        title="Terminal"
        className={`w-full h-12 flex items-center justify-center border-l-2 ${
          terminalOpen
            ? "text-[#f0f6fc] border-[#f78166] bg-[#161b22]"
            : "text-[#7d8590] border-transparent hover:text-[#c9d1d9] hover:bg-[#161b22]"
        }`}
      >
        <Terminal className="w-5 h-5" strokeWidth={1.75} />
      </button>
    </div>
  );
}
