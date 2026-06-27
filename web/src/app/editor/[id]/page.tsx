"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Code2,
  Save,
  Download,
  Upload,
  ChevronDown,
} from "lucide-react";

import { ActivityBar, type SidebarView } from "@/components/ide/ActivityBar";
import { AiAgentPanel } from "@/components/ide/AiAgentPanel";
import { ChangeReviewPanel } from "@/components/ide/ChangeReviewPanel";
import { CommandPalette } from "@/components/ide/CommandPalette";
import { ContextMenu } from "@/components/ide/ContextMenu";
import { EditorPanel } from "@/components/ide/EditorPanel";
import { FileExplorer } from "@/components/ide/FileExplorer";
import { IntegratedTerminal } from "@/components/ide/IntegratedTerminal";
import { SearchPanel } from "@/components/ide/SearchPanel";

import {
  applyChange,
  buildWorkspaceContext,
  parseFilesFromContent,
  parsedFilesToChanges,
} from "@/lib/ide/ai";
import { getLanguage, joinPath, normalizePath, basename } from "@/lib/ide/languages";
import {
  loadConversations,
  loadSettings,
  loadWorkspace,
  saveConversations,
  saveSettings,
  upsertWorkspace,
} from "@/lib/ide/storage";
import type {
  CommandItem,
  Conversation,
  EditorTab,
  PendingChange,
  WorkspaceFile,
  WorkspaceSettings,
} from "@/lib/ide/types";
import {
  buildTree,
  createFile,
  createFolder,
  deletePath,
  duplicatePath,
  filterTree,
  genId,
  isFolderPath,
  movePath,
  renamePath,
  resolveParentDir,
  searchFiles,
  setFileContent,
  uniqueNameInDir,
} from "@/lib/ide/vfs";
import { downloadBlob, exportWorkspaceZip } from "@/lib/ide/zip";

export default function EditorDetailPage() {
  const params = useParams();
  const workspaceId = params.id as string;

  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [tabs, setTabs] = useState<EditorTab[]>([]);
  const [activeTabId, setActiveTabId] = useState("");
  const [workspaceName, setWorkspaceName] = useState("New Workspace");
  const [settings, setSettings] = useState<WorkspaceSettings>(loadSettings(workspaceId));
  const [sidebarView, setSidebarView] = useState<SidebarView>("explorer");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [explorerFilter, setExplorerFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [termLines, setTermLines] = useState<{ type: string; text: string }[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiOutput, setAiOutput] = useState("");
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
  const [diffMode, setDiffMode] = useState<{ original: string; modified: string; path: string } | null>(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; path: string | null } | null>(null);
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [draggedPath, setDraggedPath] = useState<string | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  const editorRef = useRef<{ getValue?: () => string } | null>(null);
  const aiAbortRef = useRef<AbortController | null>(null);
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const tree = useMemo(() => filterTree(buildTree(files), explorerFilter), [files, explorerFilter]);
  const searchResults = useMemo(() => searchFiles(files, searchQuery), [files, searchQuery]);
  const modifiedPaths = useMemo(() => new Set(tabs.filter((t) => t.modified).map((t) => t.path)), [tabs]);

  // Load workspace
  useEffect(() => {
    const ws = loadWorkspace(workspaceId);
    if (ws) {
      setFiles(ws.files);
      setWorkspaceName(ws.name);
    } else {
      upsertWorkspace({
        id: workspaceId,
        name: "New Workspace",
        files: [],
        timestamp: new Date().toISOString(),
      });
    }
    setConversations(loadConversations(workspaceId));
    setSettings(loadSettings(workspaceId));
  }, [workspaceId]);

  useEffect(() => {
    const onClick = () => {
      setContextMenu(null);
      setExportMenuOpen(false);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const syncFilesFromTabs = useCallback(
    (currentFiles: WorkspaceFile[], currentTabs: EditorTab[]): WorkspaceFile[] => {
      let updated = currentFiles;
      for (const tab of currentTabs) {
        updated = setFileContent(updated, tab.path, tab.content);
      }
      if (activeTabId && editorRef.current?.getValue) {
        const tab = currentTabs.find((t) => t.id === activeTabId);
        const live = editorRef.current.getValue();
        if (tab && typeof live === "string") {
          updated = setFileContent(updated, tab.path, live);
        }
      }
      return updated;
    },
    [activeTabId]
  );

  const persistWorkspace = useCallback(
    (nextFiles?: WorkspaceFile[]) => {
      const synced = nextFiles ?? syncFilesFromTabs(files, tabs);
      upsertWorkspace({
        id: workspaceId,
        name: workspaceName,
        files: synced,
        timestamp: new Date().toISOString(),
      });
      saveConversations(workspaceId, conversations, workspaceName, synced);
      saveSettings(workspaceId, settings);
    },
    [workspaceId, workspaceName, files, tabs, conversations, settings, syncFilesFromTabs]
  );

  useEffect(() => {
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => persistWorkspace(), 2000);
    return () => {
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    };
  }, [files, tabs, workspaceName, conversations, settings, persistWorkspace]);

  const openFile = useCallback(
    (path: string) => {
      const normalized = normalizePath(path);
      const existing = tabs.find((t) => t.path === normalized);
      if (existing) {
        setActiveTabId(existing.id);
        setDiffMode(null);
        return;
      }
      const content = files.find((f) => normalizePath(f.path) === normalized)?.content ?? "";
      const tab: EditorTab = {
        id: genId(),
        path: normalized,
        content,
        language: getLanguage(normalized),
        modified: false,
      };
      setTabs((prev) => [...prev, tab]);
      setActiveTabId(tab.id);
      setDiffMode(null);
    },
    [tabs, files]
  );

  const closeTab = (id: string) => {
    setTabs((prev) => prev.filter((t) => t.id !== id));
    if (activeTabId === id) {
      const remaining = tabs.filter((t) => t.id !== id);
      setActiveTabId(remaining[0]?.id ?? "");
    }
  };

  const onEditorChange = (value: string | undefined) => {
    if (!activeTab) return;
    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeTabId ? { ...t, content: value ?? "", modified: true } : t
      )
    );
  };

  const doSave = () => {
    const synced = syncFilesFromTabs(files, tabs);
    setFiles(synced);
    setTabs((prev) => prev.map((t) => ({ ...t, modified: false })));
    persistWorkspace(synced);
    setTermLines((p) => [...p, { type: "success", text: "Workspace saved" }]);
  };

  const doExport = async (includeNodeModules = false) => {
    const synced = syncFilesFromTabs(files, tabs);
    const blob = await exportWorkspaceZip(workspaceName, synced, {
      includeNodeModules,
      includeDotfiles: true,
    });
    downloadBlob(blob, `${workspaceName}.zip`);
  };

  const handleImportZip = async (file: File) => {
    const { importWorkspaceZip } = await import("@/lib/ide/zip");
    const imported = await importWorkspaceZip(file);
    setFiles(imported.files);
    setWorkspaceName(imported.name);
    setTabs([]);
    setActiveTabId("");
    persistWorkspace(imported.files);
  };

  const handleDropFiles = (e: React.DragEvent) => {
    e.preventDefault();
    const items = e.dataTransfer.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = () => {
            setFiles((prev) => createFile(prev, file.name, reader.result as string));
          };
          reader.readAsText(file);
        }
      }
    }
  };

  const ctxAction = (action: string, targetPath?: string) => {
    const parentDir = resolveParentDir(files, targetPath);

    if (action === "newFile") {
      const name = uniqueNameInDir(files, parentDir, "untitled.txt");
      const path = parentDir ? joinPath(parentDir, name) : name;
      setFiles((prev) => createFile(prev, path, ""));
      openFile(path);
    } else if (action === "newFolder") {
      const base = parentDir ? joinPath(parentDir, "new-folder") : "new-folder";
      const folderPath = dirPath(base);
      setFiles((prev) => createFolder(prev, folderPath));
    } else if (action === "rename" && targetPath) {
      setRenamingPath(targetPath);
      setRenameValue(basename(targetPath));
    } else if (action === "delete" && targetPath) {
      setFiles((prev) => deletePath(prev, targetPath));
      setTabs((prev) => prev.filter((t) => t.path !== targetPath && !t.path.startsWith(targetPath + "/")));
    } else if (action === "duplicate" && targetPath) {
      setFiles((prev) => duplicatePath(prev, targetPath));
    }
  };

  function dirPath(p: string) {
    if (!files.some((f) => f.path === p || f.path.startsWith(p + "/"))) return p;
    let i = 2;
    while (files.some((f) => f.path.startsWith(`${p}-${i}`))) i++;
    return `${p}-${i}`;
  }

  const commitRename = (oldPath: string) => {
    const newName = renameValue.trim();
    if (!newName) {
      setRenamingPath(null);
      return;
    }
    const dir = oldPath.includes("/") ? oldPath.split("/").slice(0, -1).join("/") : "";
    const newPath = dir ? joinPath(dir, newName) : newName;
    setFiles((prev) => renamePath(prev, oldPath, newPath));
    setTabs((prev) =>
      prev.map((t) =>
        t.path === oldPath
          ? { ...t, path: newPath, language: getLanguage(newPath) }
          : t.path.startsWith(oldPath + "/")
            ? { ...t, path: joinPath(newPath, t.path.slice(oldPath.length + 1)) }
            : t
      )
    );
    setRenamingPath(null);
    setRenameValue("");
  };

  const handleMove = (targetDir: string | null, fromPath: string) => {
    setFiles((prev) => movePath(prev, fromPath, targetDir ?? ""));
    setDraggedPath(null);
  };

  const applyPendingChange = (id: string) => {
    const change = pendingChanges.find((c) => c.id === id);
    if (!change) return;
    setFiles((prev) => applyChange(prev, change));
    if (change.newContent !== undefined && (change.type === "create" || change.type === "edit")) {
      openFile(change.path);
    }
    setPendingChanges((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "applied" as const } : c))
    );
    setDiffMode(null);
  };

  const rejectPendingChange = (id: string) => {
    setPendingChanges((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "rejected" as const } : c))
    );
    setDiffMode(null);
  };

  const applyAllPending = () => {
    pendingChanges
      .filter((c) => c.status === "pending")
      .forEach((c) => {
        setFiles((prev) => applyChange(prev, c));
      });
    setPendingChanges((prev) => prev.map((c) => ({ ...c, status: "applied" as const })));
    setDiffMode(null);
  };

  const rejectAllPending = () => {
    setPendingChanges((prev) => prev.map((c) => ({ ...c, status: "rejected" as const })));
    setDiffMode(null);
  };

  const previewChange = (change: PendingChange) => {
    setDiffMode({
      path: change.path,
      original: change.oldContent ?? "",
      modified: change.newContent ?? "",
    });
    openFile(change.path);
  };

  const queueOrApplyChanges = (changes: PendingChange[]) => {
    if (settings.autoApply) {
      let next = files;
      for (const c of changes) {
        next = applyChange(next, c);
      }
      setFiles(next);
      changes.forEach((c) => {
        if (c.newContent !== undefined) openFile(c.path);
      });
      setPendingChanges((prev) => [
        ...prev,
        ...changes.map((c) => ({ ...c, status: "applied" as const })),
      ]);
    } else {
      setPendingChanges((prev) => [...prev, ...changes]);
    }
  };

  const doAiGenerate = async () => {
    if (!aiPrompt.trim() || isAiGenerating) return;

    const promptToSend = aiPrompt;
    setAiPrompt("");
    setIsAiGenerating(true);
    setAiOutput("");

    const convId = activeConvId || genId();
    if (!activeConvId) {
      setActiveConvId(convId);
      setConversations((prev) => [
        ...prev,
        { id: convId, title: promptToSend.slice(0, 30), messages: [] },
      ]);
    }

    const userMsg = {
      id: genId(),
      role: "user" as const,
      content: promptToSend,
      timestamp: new Date().toISOString(),
    };
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, messages: [...c.messages, userMsg] } : c))
    );

    aiAbortRef.current = new AbortController();
    const synced = syncFilesFromTabs(files, tabs);
    const workspaceContext = buildWorkspaceContext(synced, tabs, activeTab?.path);

    try {
      const activeConv = conversations.find((c) => c.id === convId);
      const history = (activeConv?.messages || []).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/ide/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: promptToSend,
          workspaceContext,
          history,
        }),
        signal: aiAbortRef.current.signal,
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let output = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          for (const line of decoder.decode(value, { stream: true }).split("\n")) {
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === "chunk") {
                output += data.content;
                setAiOutput(output);
              } else if (data.type === "done") {
                const assistantMsg = {
                  id: genId(),
                  role: "assistant" as const,
                  content: output,
                  timestamp: new Date().toISOString(),
                };
                setConversations((prev) =>
                  prev.map((c) =>
                    c.id === convId ? { ...c, messages: [...c.messages, assistantMsg] } : c
                  )
                );
                const parsed = parseFilesFromContent(output);
                if (parsed.length) {
                  queueOrApplyChanges(parsedFilesToChanges(parsed, synced));
                }
              } else if (data.type === "error") {
                setAiOutput(data.content || "Error occurred");
              }
            } catch {
              /* skip malformed */
            }
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setAiOutput("Error: Failed to generate response.");
      }
    } finally {
      setIsAiGenerating(false);
      aiAbortRef.current = null;
    }
  };

  const runTerminalCommand = async (cmd: string) => {
    const parts = cmd.trim().split(/\s+/);
    const c = parts[0]?.toLowerCase();

    if (c === "ls") {
      return {
        output: files
          .filter((f) => !f.path.endsWith(".bloomykeep"))
          .map((f) => f.path)
          .join("\n") || "(empty workspace)",
      };
    }

    try {
      const res = await fetch("/api/terminal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: cmd }),
      });
      const data = await res.json();
      return { output: data.output || "", error: data.error };
    } catch (e) {
      return { output: "", error: String(e) };
    }
  };

  const commands: CommandItem[] = useMemo(
    () => [
      { id: "save", label: "Save Workspace", category: "File", shortcut: "Ctrl+S", action: doSave },
      { id: "new-file", label: "New File", category: "File", action: () => ctxAction("newFile") },
      { id: "new-folder", label: "New Folder", category: "File", action: () => ctxAction("newFolder") },
      { id: "export", label: "Export as ZIP", category: "File", action: () => doExport(false) },
      { id: "import", label: "Import ZIP", category: "File", action: () => importInputRef.current?.click() },
      { id: "palette", label: "Command Palette", category: "View", shortcut: "Ctrl+Shift+P", action: () => setCommandPaletteOpen(true) },
      { id: "terminal", label: "Toggle Terminal", category: "View", shortcut: "Ctrl+`", action: () => setTerminalOpen((v) => !v) },
      { id: "explorer", label: "Show Explorer", category: "View", action: () => { setSidebarView("explorer"); setSidebarOpen(true); } },
      { id: "search", label: "Search in Files", category: "View", action: () => { setSidebarView("search"); setSidebarOpen(true); } },
      { id: "ai", label: "Open AI Agent", category: "AI", action: () => { setSidebarView("ai"); setSidebarOpen(true); } },
      { id: "theme-dark", label: "Theme: Dark", category: "Preferences", action: () => setSettings((s) => ({ ...s, theme: "vs-dark" })) },
      { id: "theme-light", label: "Theme: Light", category: "Preferences", action: () => setSettings((s) => ({ ...s, theme: "vs-light" })) },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [files, tabs, workspaceName, settings]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        doSave();
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "`") {
        e.preventDefault();
        setTerminalOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const renderSidebar = () => {
    switch (sidebarView) {
      case "search":
        return (
          <SearchPanel
            query={searchQuery}
            onQueryChange={setSearchQuery}
            results={searchResults}
            onOpenFile={openFile}
          />
        );
      case "git":
        return (
          <div className="p-3">
            <span className="text-xs text-[#8B949E] uppercase font-semibold">Source Control</span>
            <div className="mt-3 space-y-1">
              {modifiedPaths.size === 0 ? (
                <p className="text-sm text-[#8B949E]">No modified files</p>
              ) : (
                Array.from(modifiedPaths).map((p) => (
                  <button
                    key={p}
                    onClick={() => openFile(p)}
                    className="w-full text-left text-sm text-[#C9D1D9] hover:bg-[#21262D] px-2 py-1 rounded truncate"
                  >
                    M {p}
                  </button>
                ))
              )}
            </div>
          </div>
        );
      case "ai":
        return (
          <AiAgentPanel
            conversations={conversations}
            activeConvId={activeConvId}
            aiOutput={aiOutput}
            aiPrompt={aiPrompt}
            isGenerating={isAiGenerating}
            autoApply={settings.autoApply}
            onAutoApplyChange={(v) => setSettings((s) => ({ ...s, autoApply: v }))}
            onPromptChange={setAiPrompt}
            onSend={doAiGenerate}
            onNewChat={() => {
              setActiveConvId(null);
              setAiOutput("");
            }}
            onCopy={() => {
              if (aiOutput) {
                navigator.clipboard.writeText(aiOutput);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }
            }}
            copied={copied}
          />
        );
      default:
        return (
          <FileExplorer
            tree={tree}
            searchQuery={explorerFilter}
            onSearchChange={setExplorerFilter}
            activePath={activeTab?.path ?? null}
            renamingPath={renamingPath}
            renameValue={renameValue}
            onRenameValueChange={setRenameValue}
            onOpenFile={openFile}
            onContextMenu={(e, path) => {
              e.preventDefault();
              setContextMenu({ x: e.clientX, y: e.clientY, path });
            }}
            onStartRename={(path, name) => {
              setRenamingPath(path);
              setRenameValue(name);
            }}
            onCommitRename={commitRename}
            onCancelRename={() => {
              setRenamingPath(null);
              setRenameValue("");
            }}
            onNewFile={(p) => ctxAction("newFile", p ?? undefined)}
            onNewFolder={(p) => ctxAction("newFolder", p ?? undefined)}
            onDrop={handleMove}
            draggedPath={draggedPath}
            onDragStart={setDraggedPath}
            onDragEnd={() => setDraggedPath(null)}
          />
        );
    }
  };

  return (
    <div
      className="h-screen flex flex-col bg-[#0D1117] overflow-hidden"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDropFiles}
    >
      <input
        ref={importInputRef}
        type="file"
        accept=".zip"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleImportZip(f);
          e.target.value = "";
        }}
      />

      {/* Header */}
      <div className="h-14 bg-[#161B22] flex items-center px-4 gap-4 border-b border-[#30363D] shrink-0">
        <Link href="/chat">
          <button className="p-1 hover:bg-[#21262D] rounded" title="Back">
            <ArrowLeft className="w-4 h-4 text-[#8B949E]" />
          </button>
        </Link>
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-[#58A6FF]" />
          <span className="text-sm text-[#C9D1D9]">Bloomy AI IDE</span>
          <span className="text-xs text-[#8B949E]">({workspaceName})</span>
        </div>
        <div className="flex-1" />
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="text-xs text-[#8B949E] hover:text-[#C9D1D9] px-2 py-1 bg-[#21262D] rounded hidden sm:block"
        >
          Ctrl+Shift+P
        </button>
        <button onClick={() => importInputRef.current?.click()} className="p-1 hover:bg-[#21262D] rounded" title="Import ZIP">
          <Upload className="w-4 h-4 text-[#8B949E]" />
        </button>
        <button onClick={doSave} className="p-1 hover:bg-[#21262D] rounded" title="Save">
          <Save className="w-4 h-4 text-[#8B949E]" />
        </button>
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExportMenuOpen((v) => !v);
            }}
            className="p-1 hover:bg-[#21262D] rounded flex items-center gap-0.5"
            title="Export ZIP"
          >
            <Download className="w-4 h-4 text-[#8B949E]" />
            <ChevronDown className="w-3 h-3 text-[#8B949E]" />
          </button>
          {exportMenuOpen && (
            <div className="absolute right-0 top-full mt-1 bg-[#161B22] border border-[#30363D] rounded-lg shadow-xl py-1 z-50 min-w-[200px]">
              <button
                onClick={() => doExport(false)}
                className="w-full px-3 py-2 text-left text-sm text-[#C9D1D9] hover:bg-[#21262D]"
              >
                Export ZIP (exclude node_modules)
              </button>
              <button
                onClick={() => doExport(true)}
                className="w-full px-3 py-2 text-left text-sm text-[#C9D1D9] hover:bg-[#21262D]"
              >
                Export ZIP (include node_modules)
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden min-h-0">
        <ActivityBar
          active={sidebarView}
          onChange={(v) => {
            setSidebarView(v);
            setSidebarOpen(true);
          }}
          terminalOpen={terminalOpen}
          onToggleTerminal={() => setTerminalOpen((v) => !v)}
        />

        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: sidebarView === "ai" ? 320 : 260 }}
              exit={{ width: 0 }}
              transition={{ duration: 0.15 }}
              className="bg-[#161B22] border-r border-[#30363D] flex flex-col overflow-hidden shrink-0"
            >
              {renderSidebar()}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <EditorPanel
            tabs={tabs}
            activeTabId={activeTabId}
            theme={settings.theme}
            diffMode={diffMode}
            onTabSelect={setActiveTabId}
            onTabClose={closeTab}
            onChange={onEditorChange}
            onMount={(editor) => {
              editorRef.current = editor as { getValue?: () => string };
            }}
            onNewFile={() => ctxAction("newFile")}
            onBreadcrumbClick={openFile}
          />

          <ChangeReviewPanel
            changes={pendingChanges}
            onApply={applyPendingChange}
            onReject={rejectPendingChange}
            onApplyAll={applyAllPending}
            onRejectAll={rejectAllPending}
            onPreview={previewChange}
          />

          <IntegratedTerminal
            open={terminalOpen}
            onClose={() => setTerminalOpen(false)}
            onCommand={runTerminalCommand}
            lines={termLines}
          />
        </div>

        {sidebarView !== "ai" && (
          <div className="w-80 bg-[#161B22] border-l border-[#30363D] flex flex-col shrink-0 hidden lg:flex">
            <AiAgentPanel
              conversations={conversations}
              activeConvId={activeConvId}
              aiOutput={aiOutput}
              aiPrompt={aiPrompt}
              isGenerating={isAiGenerating}
              autoApply={settings.autoApply}
              onAutoApplyChange={(v) => setSettings((s) => ({ ...s, autoApply: v }))}
              onPromptChange={setAiPrompt}
              onSend={doAiGenerate}
              onNewChat={() => {
                setActiveConvId(null);
                setAiOutput("");
              }}
              onCopy={() => {
                if (aiOutput) {
                  navigator.clipboard.writeText(aiOutput);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }
              }}
              copied={copied}
            />
          </div>
        )}
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          targetPath={contextMenu.path}
          onAction={ctxAction}
          onClose={() => setContextMenu(null)}
        />
      )}

      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        commands={commands}
      />
    </div>
  );
}
