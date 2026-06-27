"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import type { CommandItem } from "@/lib/ide/types";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  commands: CommandItem[];
}

export function CommandPalette({ open, onClose, commands }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const q = query.toLowerCase();
  const filtered = commands.filter(
    (c) =>
      c.label.toLowerCase().includes(q) ||
      c.category?.toLowerCase().includes(q)
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-xl bg-[#161B22] border border-[#30363D] rounded-lg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-3 py-2 border-b border-[#30363D]">
          <Search className="w-4 h-4 text-[#8B949E]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command..."
            className="flex-1 bg-transparent text-sm text-[#C9D1D9] placeholder-[#8B949E] focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && filtered[0]) {
                filtered[0].action();
                onClose();
              }
            }}
          />
          <button onClick={onClose} className="p-1 hover:bg-[#21262D] rounded">
            <X className="w-4 h-4 text-[#8B949E]" />
          </button>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-sm text-[#8B949E] text-center">No matching commands</div>
          ) : (
            filtered.map((cmd) => (
              <button
                key={cmd.id}
                onClick={() => {
                  cmd.action();
                  onClose();
                }}
                className="w-full px-4 py-2 flex items-center justify-between text-left hover:bg-[#21262D] text-sm"
              >
                <span className="text-[#C9D1D9]">{cmd.label}</span>
                <span className="text-xs text-[#8B949E]">{cmd.shortcut || cmd.category}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
