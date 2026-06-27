"use client";

import { useState } from "react";
import { Search } from "lucide-react";

interface SearchResult {
  path: string;
  line: number;
  text: string;
}

interface SearchPanelProps {
  query: string;
  onQueryChange: (q: string) => void;
  results: SearchResult[];
  onOpenFile: (path: string) => void;
}

export function SearchPanel({ query, onQueryChange, results, onOpenFile }: SearchPanelProps) {
  const [replace, setReplace] = useState("");

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-[#30363D]">
        <span className="text-xs text-[#8B949E] uppercase tracking-wider font-semibold">Search</span>
      </div>
      <div className="p-2 space-y-2 border-b border-[#30363D]">
        <div className="flex items-center bg-[#0D1117] rounded px-2 py-1 border border-[#30363D]">
          <Search className="w-4 h-4 text-[#8B949E]" />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search in files..."
            className="flex-1 bg-transparent ml-2 text-sm text-[#C9D1D9] placeholder-[#8B949E] focus:outline-none"
          />
        </div>
        <input
          value={replace}
          onChange={(e) => setReplace(e.target.value)}
          placeholder="Replace (preview only)"
          className="w-full bg-[#0D1117] border border-[#30363D] rounded px-2 py-1 text-sm text-[#C9D1D9] placeholder-[#8B949E] focus:outline-none"
        />
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {query && results.length === 0 && (
          <p className="text-sm text-[#8B949E] px-2">No results found</p>
        )}
        {results.map((r, i) => (
          <button
            key={`${r.path}-${r.line}-${i}`}
            onClick={() => onOpenFile(r.path)}
            className="w-full text-left px-2 py-2 hover:bg-[#21262D] rounded text-sm"
          >
            <div className="text-[#58A6FF] truncate">{r.path}:{r.line}</div>
            <div className="text-[#8B949E] truncate text-xs mt-0.5">{r.text}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
