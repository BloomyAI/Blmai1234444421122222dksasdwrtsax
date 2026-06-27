"use client";

import { useState } from "react";
import { Download, FolderPlus, FilePlus, Save, Upload, Menu } from "lucide-react";

interface GitHubHeaderProps {
  workspaceName: string;
  onAction: (action: string) => void;
}

export function GitHubHeader({ workspaceName, onAction }: GitHubHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const actions = [
    { id: "newFile", icon: FilePlus, label: "New file" },
    { id: "newFolder", icon: FolderPlus, label: "New folder" },
    { id: "save", icon: Save, label: "Save" },
    { id: "import", icon: Upload, label: "Import ZIP" },
    { id: "export", icon: Download, label: "Export ZIP" },
  ];

  return (
    <header className="h-12 bg-[#010409] border-b border-[#30363d] flex items-center px-3 shrink-0 select-none">
      <button
        onClick={() => setMenuOpen((v) => !v)}
        className="md:hidden p-2 rounded-md hover:bg-[#21262d] text-[#8b949e]"
        aria-label="Menu"
      >
        <Menu className="w-4 h-4" />
      </button>

      <img src="/logo.png" alt="" className="w-7 h-7 rounded-full mr-2" />
      <div className="flex items-center gap-1.5 min-w-0 text-sm">
        <span className="text-[#58a6ff] font-semibold truncate">BloomyAI</span>
        <span className="text-[#484f58]">/</span>
        <span className="text-[#c9d1d9] truncate">{workspaceName}</span>
      </div>
      <span className="ml-2 hidden sm:inline px-2 py-0.5 text-[11px] rounded-full border border-[#30363d] text-[#8b949e] bg-[#161b22]">
        IDE
      </span>

      <div className="flex-1" />

      <div className={`${menuOpen ? "flex" : "hidden"} md:flex items-center gap-1 absolute md:relative top-12 md:top-0 left-0 right-0 md:left-auto md:right-auto bg-[#010409] md:bg-transparent border-b md:border-0 border-[#30363d] p-2 md:p-0 z-50`}>
        {actions.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => {
              onAction(id);
              setMenuOpen(false);
            }}
            title={label}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[#c9d1d9] hover:bg-[#21262d] border border-transparent hover:border-[#30363d] rounded-md"
          >
            <Icon className="w-3.5 h-3.5 text-[#8b949e]" />
            <span className="hidden lg:inline">{label}</span>
          </button>
        ))}
      </div>
    </header>
  );
}
