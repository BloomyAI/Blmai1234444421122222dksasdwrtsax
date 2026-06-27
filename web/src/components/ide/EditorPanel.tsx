"use client";

import type { EditorTab } from "@/lib/ide/types";
import { getBreadcrumbs } from "@/lib/ide/vfs";
import { ChevronRight, Code2, FileText, Plus, X } from "lucide-react";
import Editor, { DiffEditor } from "@monaco-editor/react";

const EDITOR_OPTIONS = {
  fontSize: 14,
  fontFamily: "'Fira Code', Consolas, monospace",
  minimap: { enabled: true },
  scrollBeyondLastLine: false,
  smoothScrolling: true,
  cursorBlinking: "smooth" as const,
  renderLineHighlight: "all" as const,
  bracketPairColorization: { enabled: true },
  guides: { bracketPairs: true, indentation: true },
  autoClosingBrackets: "always" as const,
  autoClosingQuotes: "always" as const,
  autoIndent: "full" as const,
  tabSize: 2,
  wordWrap: "on" as const,
  lineNumbers: "on" as const,
  folding: true,
  formatOnPaste: true,
  formatOnType: true,
  suggestOnTriggerCharacters: true,
  quickSuggestions: true,
  multiCursorModifier: "alt" as const,
  snippetSuggestions: "top" as const,
};

interface EditorPanelProps {
  tabs: EditorTab[];
  activeTabId: string;
  theme: string;
  diffMode?: { original: string; modified: string; path: string } | null;
  onTabSelect: (id: string) => void;
  onTabClose: (id: string) => void;
  onChange: (value: string | undefined) => void;
  onMount: (editor: unknown) => void;
  onNewFile: () => void;
  onBreadcrumbClick: (path: string) => void;
}

export function EditorPanel({
  tabs,
  activeTabId,
  theme,
  diffMode,
  onTabSelect,
  onTabClose,
  onChange,
  onMount,
  onNewFile,
  onBreadcrumbClick,
}: EditorPanelProps) {
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const breadcrumbs = activeTab ? getBreadcrumbs(activeTab.path) : [];

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="h-9 bg-[#161B22] flex items-center border-b border-[#30363D] overflow-x-auto shrink-0">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => onTabSelect(tab.id)}
            className={`flex items-center gap-2 px-3 py-1 text-sm cursor-pointer border-r border-[#30363D] min-w-0 shrink-0 ${
              activeTabId === tab.id
                ? "bg-[#0D1117] text-[#C9D1D9] border-t-2 border-t-[#F78166]"
                : "text-[#8B949E] hover:bg-[#21262D]"
            }`}
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span className="truncate">{tab.path.split("/").pop()}</span>
            {tab.modified && <div className="w-2 h-2 rounded-full bg-[#F78166] shrink-0" />}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(tab.id);
              }}
              className="p-0.5 hover:bg-[#21262D] rounded shrink-0"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        <button onClick={onNewFile} className="p-2 text-[#8B949E] hover:text-[#C9D1D9] hover:bg-[#21262D]">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {activeTab && !diffMode && (
        <div className="h-7 flex items-center px-3 gap-1 bg-[#0D1117] border-b border-[#30363D] text-xs text-[#8B949E] shrink-0 overflow-x-auto">
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.path} className="flex items-center gap-1 shrink-0">
              {i > 0 && <ChevronRight className="w-3 h-3" />}
              <button
                onClick={() => onBreadcrumbClick(crumb.path)}
                className="hover:text-[#58A6FF] truncate max-w-[120px]"
              >
                {crumb.name}
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        {diffMode ? (
          <DiffEditor
            height="100%"
            language={activeTab?.language || "plaintext"}
            original={diffMode.original}
            modified={diffMode.modified}
            theme={theme}
            options={{ ...EDITOR_OPTIONS, readOnly: false, renderSideBySide: true }}
          />
        ) : activeTab ? (
          <Editor
            height="100%"
            path={activeTab.path}
            language={activeTab.language}
            value={activeTab.content}
            onChange={onChange}
            onMount={onMount}
            theme={theme}
            options={EDITOR_OPTIONS}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-[#8B949E]">
            <div className="text-center">
              <Code2 className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg">Bloomy AI IDE</p>
              <p className="text-sm mt-2">Open a file from the explorer or press Ctrl+P</p>
              <button
                onClick={onNewFile}
                className="mt-4 px-4 py-2 bg-[#238636] hover:bg-[#2EA043] rounded-lg text-sm text-[#C9D1D9] transition-colors"
              >
                New File
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
