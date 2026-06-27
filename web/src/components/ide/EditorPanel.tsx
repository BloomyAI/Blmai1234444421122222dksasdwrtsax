"use client";

import type { EditorTab } from "@/lib/ide/types";
import { getBreadcrumbs } from "@/lib/ide/vfs";
import { ChevronRight, FileCode, X } from "lucide-react";
import Editor, { DiffEditor, type Monaco } from "@monaco-editor/react";

const EDITOR_OPTIONS = {
  fontSize: 13,
  fontFamily: "'ui-monospace', 'SFMono-Regular', 'Consolas', monospace",
  fontLigatures: true,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  smoothScrolling: true,
  cursorBlinking: "smooth" as const,
  renderLineHighlight: "gutter" as const,
  bracketPairColorization: { enabled: true },
  guides: { bracketPairs: true, indentation: true },
  autoClosingBrackets: "always" as const,
  autoClosingQuotes: "always" as const,
  autoIndent: "full" as const,
  tabSize: 2,
  wordWrap: "off" as const,
  lineNumbers: "on" as const,
  folding: true,
  formatOnPaste: true,
  suggestOnTriggerCharacters: true,
  quickSuggestions: { other: true, comments: false, strings: true },
  padding: { top: 12 },
  scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
};

function defineGitHubTheme(monaco: Monaco) {
  monaco.editor.defineTheme("github-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#0d1117",
      "editor.foreground": "#c9d1d9",
      "editorLineNumber.foreground": "#484f58",
      "editorLineNumber.activeForeground": "#c9d1d9",
      "editor.selectionBackground": "#264f78",
      "editor.inactiveSelectionBackground": "#264f7844",
      "editorCursor.foreground": "#58a6ff",
      "editor.lineHighlightBackground": "#161b22",
      "editorGutter.background": "#0d1117",
      "editorIndentGuide.background": "#21262d",
      "editorIndentGuide.activeBackground": "#30363d",
    },
  });
}

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
  diffMode,
  onTabSelect,
  onTabClose,
  onChange,
  onMount,
  onBreadcrumbClick,
}: EditorPanelProps) {
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const breadcrumbs = activeTab ? getBreadcrumbs(activeTab.path) : [];
  const monacoTheme = "github-dark";

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#0d1117]">
      <div className="h-9 bg-[#010409] flex items-end overflow-x-auto shrink-0 border-b border-[#30363d]">
        {tabs.map((tab) => {
          const isActive = activeTabId === tab.id;
          const name = tab.path.split("/").pop() || tab.path;
          return (
            <div
              key={tab.id}
              onClick={() => onTabSelect(tab.id)}
              className={`group flex items-center gap-1.5 h-9 px-3 text-xs cursor-pointer border-r border-[#30363d] min-w-0 shrink-0 max-w-[180px] ${
                isActive
                  ? "bg-[#0d1117] text-[#f0f6fc]"
                  : "bg-[#010409] text-[#8b949e] hover:bg-[#161b22] hover:text-[#c9d1d9]"
              }`}
            >
              <FileCode className="w-3.5 h-3.5 shrink-0 opacity-70" />
              <span className="truncate">{name}</span>
              {tab.modified && <span className="text-[#f0883e]">●</span>}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose(tab.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[#30363d] shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>

      {activeTab && !diffMode && (
        <div className="h-7 flex items-center px-3 gap-0.5 bg-[#0d1117] text-[11px] text-[#8b949e] shrink-0 border-b border-[#21262d]">
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.path} className="flex items-center gap-0.5 shrink-0">
              {i > 0 && <ChevronRight className="w-3 h-3" />}
              <button
                onClick={() => onBreadcrumbClick(crumb.path)}
                className="hover:text-[#58a6ff] truncate max-w-[120px]"
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
            theme={monacoTheme}
            beforeMount={defineGitHubTheme}
            options={{ ...EDITOR_OPTIONS, renderSideBySide: true }}
          />
        ) : activeTab ? (
          <Editor
            height="100%"
            path={activeTab.path}
            language={activeTab.language}
            value={activeTab.content}
            onChange={onChange}
            onMount={onMount}
            theme={monacoTheme}
            beforeMount={defineGitHubTheme}
            options={EDITOR_OPTIONS}
          />
        ) : (
          <div className="h-full flex items-center justify-center bg-[#0d1117] text-[#8b949e]">
            <div className="text-center max-w-sm px-6">
              <FileCode className="w-12 h-12 mx-auto mb-3 text-[#484f58]" />
              <p className="text-[#c9d1d9] text-base mb-1">No file selected</p>
              <p className="text-xs leading-relaxed">
                Pick a file from the sidebar or press{" "}
                <kbd className="px-1.5 py-0.5 bg-[#161b22] border border-[#30363d] rounded text-[#c9d1d9]">Ctrl+N</kbd>{" "}
                to create one.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
