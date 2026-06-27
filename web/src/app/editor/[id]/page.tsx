"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { ActivityBar, type SidebarView } from "@/components/ide/ActivityBar";
import { AiAgentPanel } from "@/components/ide/AiAgentPanel";
import { ChangeReviewPanel } from "@/components/ide/ChangeReviewPanel";
import { CommandPalette } from "@/components/ide/CommandPalette";
import { ContextMenu } from "@/components/ide/ContextMenu";
import { EditorPanel } from "@/components/ide/EditorPanel";
import { FileExplorer } from "@/components/ide/FileExplorer";
import { IntegratedTerminal } from "@/components/ide/IntegratedTerminal";
import { MenuBar } from "@/components/ide/MenuBar";
import { SearchPanel } from "@/components/ide/SearchPanel";
import { StatusBar } from "@/components/ide/StatusBar";

import {
  applyChange,
  buildWorkspaceContext,
  parseFilesFromContent,
  parsedFilesToChanges,
} from "@/lib/ide/ai";
import { getLanguage, joinPath, normalizePath, basename } from "@/lib/ide/languages";
import { readSSEStream } from "@/lib/ide/sse";
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
  movePath,
  renamePath,
  resolveParentDir,
  searchFiles,
  setFileContent,
  uniqueNameInDir,
} from "@/lib/ide/vfs";
import { downloadBlob, exportWorkspaceZip, importWorkspaceZip } from "@/lib/ide/zip";

export default function EditorDetailPage() {
  const params = useParams();
  const workspaceId = params.id as string;

  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [tabs, setTabs] = useState<EditorTab[]>([]);
  const [activeTabId, setActiveTabId] = useState("");
  const [workspaceName, setWorkspaceName] = useState("New Workspace");
  const [settings, setSettings] = useState<WorkspaceSettings>(() => ({
    autoApply: true,
    theme: "vs-dark",
    includeNodeModulesOnExport: false,
  }));
  const [loaded, setLoaded] = useState(false);
  const [sidebarView, setSidebarView] = useState<SidebarView>("explorer");
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
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState("Ready");

  const editorRef = useRef<{ getValue?: () => string } | null>(null);
  const aiAbortRef = useRef<AbortController | null>(null);
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef(files);
  const tabsRef = useRef(tabs);

  filesRef.current = files;
  tabsRef.current = tabs;

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const tree = useMemo(() => filterTree(buildTree(files), explorerFilter), [files, explorerFilter]);
  const searchResults = useMemo(() => searchFiles(files, searchQuery), [files, searchQuery]);
  const modifiedPaths = useMemo(() => new Set(tabs.filter((t) => t.modified).map((t) => t.path)), [tabs]);

  const showStatus = useCallback((msg: string, ms = 3000) => {
    setStatusMsg(msg);
    if (ms > 0) setTimeout(() => setStatusMsg("Ready"), ms);
  }, []);

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
    setLoaded(true);
  }, [workspaceId]);

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
      const synced = nextFiles ?? syncFilesFromTabs(filesRef.current, tabsRef.current);
      upsertWorkspace({
        id: workspaceId,
        name: workspaceName,
        files: synced,
        timestamp: new Date().toISOString(),
      });
      saveConversations(workspaceId, conversations, workspaceName, synced);
      saveSettings(workspaceId, settings);
      return synced;
    },
    [workspaceId, workspaceName, conversations, settings, syncFilesFromTabs]
  );

  useEffect(() => {
    if (!loaded) return;
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => persistWorkspace(), 2000);
    return () => {
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    };
  }, [files, tabs, workspaceName, conversations, settings, loaded, persistWorkspace]);

  const openFile = useCallback(
    (path: string) => {
      const normalized = normalizePath(path);
      if (normalized.endsWith(".bloomykeep")) return;
      setSelectedPath(normalized);
      const existing = tabs.find((t) => t.path === normalized);
      if (existing) {
        setActiveTabId(existing.id);
        setDiffMode(null);
        return;
      }
      const content = filesRef.current.find((f) => normalizePath(f.path) === normalized)?.content ?? "";
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
    [tabs]
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
    try {
      const synced = syncFilesFromTabs(files, tabs);
      setFiles(synced);
      setTabs((prev) => prev.map((t) => ({ ...t, modified: false })));
      persistWorkspace(synced);
      showStatus("Saved successfully");
    } catch (e) {
      showStatus(`Save failed: ${e}`);
    }
  };

  const doExport = async (includeNodeModules = false) => {
    try {
      showStatus("Preparing export...", 0);
      const synced = syncFilesFromTabs(files, tabs);
      const blob = await exportWorkspaceZip(workspaceName, synced, {
        includeNodeModules,
        includeDotfiles: true,
      });
      const ok = await downloadBlob(blob, `${workspaceName.replace(/[^\w.-]/g, "_")}.zip`);
      showStatus(ok ? "Export complete" : "Export cancelled");
    } catch (e) {
      showStatus(`Export failed: ${e}`);
    }
  };

  const handleImportZip = async (file: File) => {
    try {
      showStatus("Importing...", 0);
      const imported = await importWorkspaceZip(file);
      setFiles(imported.files);
      setWorkspaceName(imported.name);
      setTabs([]);
      setActiveTabId("");
      persistWorkspace(imported.files);
      showStatus(`Imported ${imported.files.length} files`);
    } catch (e) {
      showStatus(`Import failed: ${e}`);
    }
  };

  const deleteSelected = useCallback((targetPath?: string) => {
    const path = targetPath ?? selectedPath ?? activeTab?.path;
    if (!path) {
      showStatus("Select a file to delete");
      return;
    }
    const normalized = normalizePath(path);
    setFiles((prev) => deletePath(prev, normalized));
    setTabs((prev) =>
      prev.filter((t) => t.path !== normalized && !t.path.startsWith(normalized + "/"))
    );
    if (activeTab?.path === normalized || activeTab?.path.startsWith(normalized + "/")) {
      setActiveTabId("");
    }
    setSelectedPath(null);
    showStatus(`Deleted ${basename(normalized)}`);
  }, [selectedPath, activeTab, showStatus]);

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
      showStatus(`Created folder ${basename(folderPath)}`);
    } else if (action === "rename" && targetPath) {
      setRenamingPath(targetPath);
      setRenameValue(basename(targetPath));
    } else if (action === "delete") {
      deleteSelected(targetPath);
    } else if (action === "duplicate" && targetPath) {
      setFiles((prev) => duplicatePath(prev, targetPath));
      showStatus("Duplicated");
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

  const applyFilesFromAI = useCallback(
    (output: string, synced: WorkspaceFile[]) => {
      const parsed = parseFilesFromContent(output);
      if (!parsed.length) return;

      const changes = parsedFilesToChanges(parsed, synced);
      if (settings.autoApply) {
        const next = changes.reduce((acc, c) => applyChange(acc, c), synced);
        setFiles(next);
        parsed.forEach((f) => openFile(f.path));
        setPendingChanges((prev) => [
          ...prev,
          ...changes.map((c) => ({ ...c, status: "applied" as const })),
        ]);
        showStatus(`Applied ${parsed.length} file(s) from AI`);
      } else {
        setPendingChanges((prev) => [...prev, ...changes]);
        showStatus(`${parsed.length} change(s) pending review`);
      }
    },
    [settings.autoApply, openFile, showStatus]
  );

  const applyPendingChange = (id: string) => {
    const change = pendingChanges.find((c) => c.id === id);
    if (!change) return;
    setFiles((prev) => applyChange(prev, change));
    if (change.newContent !== undefined) openFile(change.path);
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
    const pending = pendingChanges.filter((c) => c.status === "pending");
    setFiles((prev) => pending.reduce((acc, c) => applyChange(acc, c), prev));
    pending.forEach((c) => {
      if (c.newContent !== undefined) openFile(c.path);
    });
    setPendingChanges((prev) =>
      prev.map((c) => (c.status === "pending" ? { ...c, status: "applied" as const } : c))
    );
    setDiffMode(null);
    showStatus("All changes applied");
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
    const fullMessage = `[Workspace Context]\n${workspaceContext}\n\n[User Request]\n${promptToSend}`;

    try {
      const activeConv = conversations.find((c) => c.id === convId);
      const history = (activeConv?.messages || [])
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/coder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: fullMessage,
          history,
        }),
        signal: aiAbortRef.current.signal,
      });

      const contentType = res.headers.get("content-type") || "";

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `HTTP ${res.status}`);
      }

      if (contentType.includes("application/json")) {
        const data = await res.json();
        const errMsg = data.content || data.detail || data.error || "AI returned an error";
        setAiOutput(errMsg);
        showStatus("AI error — check API key");
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      let output = "";
      output = await readSSEStream(reader, (event) => {
        if (event.type === "chunk" && event.content) {
          output = event.content;
          setAiOutput(output);
        } else if (event.type === "error") {
          setAiOutput(event.content || "Error");
          showStatus("AI error");
        }
      });

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

      applyFilesFromAI(output, synced);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        const msg = (err as Error).message || "Failed to generate response";
        setAiOutput(`Error: ${msg}`);
        showStatus("AI request failed");
      }
    } finally {
      setIsAiGenerating(false);
      aiAbortRef.current = null;
    }
  };

  const runTerminalCommand = async (cmd: string) => {
    const c = cmd.trim().split(/\s+/)[0]?.toLowerCase();
    if (c === "ls") {
      return {
        output:
          files
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

  const handleMenuAction = (action: string) => {
    switch (action) {
      case "newFile": ctxAction("newFile"); break;
      case "newFolder": ctxAction("newFolder"); break;
      case "save": doSave(); break;
      case "import": importInputRef.current?.click(); break;
      case "export": doExport(false); break;
      case "delete": deleteSelected(); break;
      case "palette": setCommandPaletteOpen(true); break;
      case "explorer": setSidebarView("explorer"); break;
      case "search": setSidebarView("search"); break;
      case "terminal": setTerminalOpen((v) => !v); break;
      case "about": showStatus("Bloomy IDE — VS Code-style editor with AI"); break;
    }
  };

  const commands: CommandItem[] = useMemo(
    () => [
      { id: "save", label: "Save", category: "File", shortcut: "Ctrl+S", action: doSave },
      { id: "new-file", label: "New File", category: "File", shortcut: "Ctrl+N", action: () => ctxAction("newFile") },
      { id: "delete", label: "Delete", category: "Edit", shortcut: "Delete", action: () => deleteSelected() },
      { id: "export", label: "Export ZIP", category: "File", action: () => doExport(false) },
      { id: "import", label: "Import ZIP", category: "File", action: () => importInputRef.current?.click() },
      { id: "palette", label: "Command Palette", category: "View", shortcut: "Ctrl+Shift+P", action: () => setCommandPaletteOpen(true) },
      { id: "terminal", label: "Toggle Terminal", category: "View", shortcut: "Ctrl+`", action: () => setTerminalOpen((v) => !v) },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [files, tabs, selectedPath]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        doSave();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        ctxAction("newFile");
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "`") {
        e.preventDefault();
        setTerminalOpen((v) => !v);
      }
      if (e.key === "Delete" && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        deleteSelected();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const aiPanel = (
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

  return (
    <div className="h-screen flex flex-col bg-[#1e1e1e] overflow-hidden text-[#cccccc]">
      <input
        ref={importInputRef}
        type="file"
        accept=".zip,application/zip"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleImportZip(f);
          e.target.value = "";
        }}
      />

      {/* Title bar */}
      <div className="h-[30px] bg-[#3c3c3c] flex items-center px-3 text-[12px] text-[#cccccc] shrink-0">
        <Link href="/chat" className="mr-3 hover:text-white">
          <ArrowLeft className="w-3.5 h-3.5 inline" />
        </Link>
        <span className="opacity-80">{workspaceName} — Bloomy IDE</span>
      </div>

      <MenuBar onAction={handleMenuAction} />

      <div className="flex-1 flex overflow-hidden min-h-0">
        <ActivityBar
          active={sidebarView}
          onChange={setSidebarView}
          terminalOpen={terminalOpen}
          onToggleTerminal={() => setTerminalOpen((v) => !v)}
        />

        <div className="w-[260px] bg-[#252526] border-r border-[#2b2b2b] flex flex-col shrink-0 overflow-hidden">
          {sidebarView === "search" ? (
            <SearchPanel query={searchQuery} onQueryChange={setSearchQuery} results={searchResults} onOpenFile={openFile} />
          ) : sidebarView === "git" ? (
            <div className="p-3">
              <div className="text-[11px] uppercase text-[#bbbbbb] font-semibold mb-2">Source Control</div>
              {modifiedPaths.size === 0 ? (
                <p className="text-[13px] text-[#858585]">No changes</p>
              ) : (
                Array.from(modifiedPaths).map((p) => (
                  <button key={p} onClick={() => openFile(p)} className="w-full text-left text-[13px] hover:bg-[#2a2d2e] px-2 py-1 rounded truncate">
                    M {p}
                  </button>
                ))
              )}
            </div>
          ) : sidebarView === "ai" ? (
            aiPanel
          ) : (
            <FileExplorer
              tree={tree}
              searchQuery={explorerFilter}
              onSearchChange={setExplorerFilter}
              activePath={selectedPath ?? activeTab?.path ?? null}
              renamingPath={renamingPath}
              renameValue={renameValue}
              onRenameValueChange={setRenameValue}
              onOpenFile={openFile}
              onContextMenu={(e, path) => {
                e.preventDefault();
                e.stopPropagation();
                if (path) setSelectedPath(path);
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
              onSelect={setSelectedPath}
            />
          )}
        </div>

        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <div className="flex-1 flex min-h-0">
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

            {sidebarView !== "ai" && (
              <div className="w-[340px] bg-[#252526] border-l border-[#2b2b2b] flex flex-col shrink-0">
                {aiPanel}
              </div>
            )}
          </div>

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
      </div>

      <StatusBar
        message={statusMsg}
        language={activeTab?.language}
        lineCol={activeTab ? "Ln 1, Col 1" : undefined}
      />

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          targetPath={contextMenu.path}
          onAction={ctxAction}
          onClose={() => setContextMenu(null)}
        />
      )}

      <CommandPalette open={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} commands={commands} />
    </div>
  );
}
