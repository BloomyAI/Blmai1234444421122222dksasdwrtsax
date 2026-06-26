"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Code2, Play, Save, Download, Terminal, Plus, X, ArrowLeft, FileText, FolderPlus, FilePlus, Search, Trash2, Copy, Check, Zap, FolderOpen } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Editor from "@monaco-editor/react";
import JSZip from "jszip";

interface FileNode {
  id: string;
  name: string;
  type: "file" | "folder";
  content?: string;
  children?: FileNode[];
}

interface Tab {
  id: string;
  fileId: string;
  name: string;
  content: string;
  language: string;
  modified: boolean;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
}

export default function EditorDetailPage() {
  const params = useParams();
  const workspaceId = params.id as string;

  const [files, setFiles] = useState<FileNode[]>([]);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>("");
  const [workspaceName, setWorkspaceName] = useState("New Workspace");
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [termLines, setTermLines] = useState<{ type: string; text: string }[]>([]);
  const [termInput, setTermInput] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiOutput, setAiOutput] = useState("");
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string | null } | null>(null);
  const [renamingNodeId, setRenamingNodeId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const aiAbortRef = useRef<AbortController | null>(null);
  const editorRef = useRef<any>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const genId = () => Math.random().toString(36).substr(2, 9);

  const getLanguage = (filename: string): string => {
    const ext = filename.split(".").pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      js: "javascript",
      jsx: "javascript",
      ts: "typescript",
      tsx: "typescript",
      py: "python",
      rb: "ruby",
      go: "go",
      rs: "rust",
      java: "java",
      cpp: "cpp",
      c: "c",
      cs: "csharp",
      php: "php",
      html: "html",
      css: "css",
      scss: "scss",
      json: "json",
      xml: "xml",
      yaml: "yaml",
      yml: "yaml",
      md: "markdown",
      txt: "plaintext",
      sh: "shell",
      sql: "sql",
      // x64dbg / ASM / RE tools
      asm: "assembly",
      s: "assembly",
      nasm: "assembly",
      masm: "assembly",
      dp64: "plaintext",
      dp32: "plaintext",
      dd64: "plaintext",
      dd32: "plaintext",
      script: "plaintext",
      lua: "lua",
      yara: "plaintext",
      idc: "plaintext",
      jython: "python",
    };
    return langMap[ext || ""] || "plaintext";
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedWorkspaces = localStorage.getItem('bloomyai_workspaces');
      if (savedWorkspaces) {
        try {
          const parsed = JSON.parse(savedWorkspaces);
          const workspace = parsed?.find((w: any) => w.id === workspaceId);
          if (workspace) {
            setFiles(workspace.files || []);
            setWorkspaceName(workspace.name || "New Workspace");
          } else {
            const newWorkspace = {
              id: workspaceId,
              name: "New Workspace",
              files: [],
              timestamp: new Date().toISOString(),
            };
            const updated = [newWorkspace, ...parsed];
            localStorage.setItem('bloomyai_workspaces', JSON.stringify(updated));
          }
        } catch (e) {
          console.error('Failed to load workspace:', e);
        }
      } else {
        const newWorkspace = {
          id: workspaceId,
          name: "New Workspace",
          files: [],
          timestamp: new Date().toISOString(),
        };
        localStorage.setItem('bloomyai_workspaces', JSON.stringify([newWorkspace]));
      }
    }
  }, [workspaceId]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`bloomyai_ws_${workspaceId}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setConversations(parsed.conversations || []);
        } catch (e) {
          console.error('Failed to load conversations:', e);
        }
      }
    }
  }, [workspaceId]);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const activeTab = tabs.find(t => t.id === activeTabId);

  const onEditorChange = (value: string | undefined) => {
    if (activeTab) {
      setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, content: value || "", modified: true } : t));
    }
  };

  const onEditorMount = (editor: any) => {
    editorRef.current = editor;
  };

  const saveWorkspace = () => {
    // Update files with current tab contents
    const updateNode = (nodes: FileNode[], tab: Tab): FileNode[] => {
      return nodes.map(node => {
        if (node.id === tab.fileId) {
          return { ...node, content: tab.content };
        }
        if (node.children) {
          return { ...node, children: updateNode(node.children, tab) };
        }
        return node;
      });
    };

    const updatedFiles = tabs.reduce((acc, tab) => updateNode(acc, tab), files);

    // Save to localStorage without triggering state updates
    try {
      const savedWorkspaces = localStorage.getItem('bloomyai_workspaces');
      if (savedWorkspaces) {
        const parsed = JSON.parse(savedWorkspaces);
        const updated = parsed.map((w: any) => w.id === workspaceId ? { ...w, files: updatedFiles, name: workspaceName } : w);
        localStorage.setItem('bloomyai_workspaces', JSON.stringify(updated));
        localStorage.setItem(`bloomyai_ws_${workspaceId}`, JSON.stringify({ name: workspaceName, files: updatedFiles, conversations }));
      }
    } catch (e) {
      console.error('Failed to save workspace:', e);
    }
  };

  // Auto-save when files or tabs change
  useEffect(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      saveWorkspace();
    }, 2000); // Save after 2 seconds of inactivity

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [files, tabs, workspaceName, workspaceId, conversations]);

  // Auto-scroll to bottom of AI messages when new messages arrive
  useEffect(() => {
    const messagesContainer = document.getElementById('ai-messages');
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }, [conversations, aiOutput, isAiGenerating]);

  const closeTab = (id: string) => {
    setTabs(prev => prev.filter(t => t.id !== id));
    if (activeTabId === id) {
      const remaining = tabs.filter(t => t.id !== id);
      setActiveTabId(remaining.length > 0 ? remaining[0].id : "");
    }
  };

  const addNode = (nodes: FileNode[], parentId: string | null, newNode: FileNode): FileNode[] => {
    if (!parentId) return [...nodes, newNode];
    return nodes.map(node => {
      if (node.id === parentId) {
        return { ...node, children: [...(node.children || []), newNode] };
      }
      if (node.children) {
        return { ...node, children: addNode(node.children, parentId, newNode) };
      }
      return node;
    });
  };

  const removeNode = (nodes: FileNode[], id: string): FileNode[] => {
    return nodes.filter(node => node.id !== id).map(node => {
      if (node.children) {
        return { ...node, children: removeNode(node.children, id) };
      }
      return node;
    });
  };

  const findNode = (nodes: FileNode[], id: string): FileNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findNode(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const ctxAction = (action: string, nodeId?: string) => {
    setContextMenu(null);
    if (action === "newFile") {
      const newFile: FileNode = { id: genId(), name: "untitled.txt", type: "file", content: "" };
      setFiles(prev => addNode(prev, nodeId || null, newFile));
      const newTab: Tab = { id: genId(), fileId: newFile.id, name: newFile.name, content: "", language: "plaintext", modified: false };
      setTabs(prev => [...prev, newTab]);
      setActiveTabId(newTab.id);
    } else if (action === "newFolder") {
      const newFolder: FileNode = { id: genId(), name: "new-folder", type: "folder", children: [] };
      setFiles(prev => addNode(prev, nodeId || null, newFolder));
    } else if (action === "rename" && nodeId) {
      const node = findNode(files, nodeId);
      if (node) {
        setRenameValue(node.name);
        setRenamingNodeId(nodeId);
      }
    } else if (action === "delete" && nodeId) {
      setFiles(prev => removeNode(prev, nodeId));
      setTabs(prev => prev.filter(t => t.fileId !== nodeId));
    } else if (action === "copy" && nodeId) {
      const node = findNode(files, nodeId);
      if (node) {
        const copyNode = (nodes: FileNode[], source: FileNode, parentId: string | null): FileNode[] => {
          const newNode = { ...source, id: genId(), name: `${source.name}-copy` };
          return addNode(nodes, parentId, newNode);
        };
        setFiles(prev => copyNode(prev, node, null));
      }
    }
  };

  const commitRename = (nodeId: string) => {
    const newName = renameValue.trim();
    if (!newName) { setRenamingNodeId(null); return; }
    const renameNode = (nodes: FileNode[]): FileNode[] =>
      nodes.map(n => {
        if (n.id === nodeId) return { ...n, name: newName };
        if (n.children) return { ...n, children: renameNode(n.children) };
        return n;
      });
    setFiles(renameNode(files));
    setTabs(prev => prev.map(t => t.fileId === nodeId ? { ...t, name: newName } : t));
    setRenamingNodeId(null);
    setRenameValue("");
  };

  const renderTree = (nodes: FileNode[], depth: number = 0) => {
    return nodes.map(node => (
      <div key={node.id} style={{ paddingLeft: `${depth * 12}px` }}>
        <div
          className="flex items-center gap-2 py-1 px-2 hover:bg-[#21262D] rounded cursor-pointer"
          onClick={() => {
            if (renamingNodeId === node.id) return; // don't open file while renaming
            if (node.type === "file") {
              const existingTab = tabs.find(t => t.fileId === node.id);
              if (existingTab) {
                setActiveTabId(existingTab.id);
              } else {
                const newTab: Tab = {
                  id: genId(),
                  fileId: node.id,
                  name: node.name,
                  content: node.content || "",
                  language: getLanguage(node.name),
                  modified: false,
                };
                setTabs(prev => [...prev, newTab]);
                setActiveTabId(newTab.id);
              }
            }
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            setContextMenu({ x: e.clientX, y: e.clientY, nodeId: node.id });
          }}
          onDoubleClick={() => {
            setRenameValue(node.name);
            setRenamingNodeId(node.id);
          }}
        >
          {node.type === "folder" ? (
            <FolderOpen className="w-4 h-4 text-[#54AEFF] shrink-0" />
          ) : (
            <FileText className="w-4 h-4 text-[#8B949E] shrink-0" />
          )}
          {renamingNodeId === node.id ? (
            <input
              autoFocus
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onBlur={() => commitRename(node.id)}
              onKeyDown={e => {
                if (e.key === "Enter") commitRename(node.id);
                if (e.key === "Escape") { setRenamingNodeId(null); setRenameValue(""); }
              }}
              onClick={e => e.stopPropagation()}
              className="flex-1 bg-[#0D1117] border border-[#58A6FF] rounded px-1 text-sm text-[#C9D1D9] focus:outline-none"
            />
          ) : (
            <span className="text-sm text-[#C9D1D9] truncate">{node.name}</span>
          )}
        </div>
        {node.type === "folder" && node.children && renderTree(node.children, depth + 1)}
      </div>
    ));
  };

  const addTerm = (type: string, text: string) => {
    setTermLines((p) => [...p, { type, text }]);
  };

  const runCmd = async (cmd: string) => {
    addTerm("command", `$ ${cmd}`);
    
    // Handle built-in commands
    const parts = cmd.trim().split(/\s+/);
    const c = parts[0]?.toLowerCase();
    const a = parts.slice(1);

    switch (c) {
      case "help": ["help - Show commands", "clear - Clear terminal", "ls - List files", "cat <f> - Show file", "mkdir <n> - Create folder", "touch <n> - Create file", "rm <n> - Delete", "build <type> - Build project", "run - Run project"].forEach((l) => addTerm("info", "  " + l)); return;
      case "clear": setTermLines([]); return;
      case "ls": files.forEach(f => addTerm("info", f.name)); return;
      case "cat": if (a[0]) { const f = findNode(files, a[0]); addTerm("output", f?.content || "Not found"); } return;
      case "mkdir": if (a[0]) { setFiles(p => addNode(p, null, { id: genId(), name: a[0], type: "folder", children: [] })); addTerm("success", `Created: ${a[0]}`); } return;
      case "touch": if (a[0]) { setFiles(p => addNode(p, null, { id: genId(), name: a[0], type: "file", content: "" })); addTerm("success", `Created: ${a[0]}`); } return;
      case "rm": if (a[0]) { setFiles(p => removeNode(p, findNode(p, a[0])?.id || "")); addTerm("success", `Deleted: ${a[0]}`); } return;
    }

    // Execute real commands via API
    try {
      const response = await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd }),
      });

      const data = await response.json();
      
      if (data.success) {
        addTerm("output", data.output);
        if (data.error) {
          addTerm("error", data.error);
        }
      } else {
        addTerm("error", data.error || 'Command failed');
      }
    } catch (error) {
      addTerm("error", `Failed to execute command: ${error}`);
    }
  };

  const doSave = () => {
    const updatedFiles = tabs.map(tab => {
      const updateNode = (nodes: FileNode[]): FileNode[] => {
        return nodes.map(node => {
          if (node.id === tab.fileId) {
            return { ...node, content: tab.content };
          }
          if (node.children) {
            return { ...node, children: updateNode(node.children) };
          }
          return node;
        });
      };
      return updateNode(files);
    })[0];

    setFiles(updatedFiles);
    setTabs(prev => prev.map(t => ({ ...t, modified: false })));

    const savedWorkspaces = localStorage.getItem('bloomyai_workspaces');
    if (savedWorkspaces) {
      try {
        const parsed = JSON.parse(savedWorkspaces);
        const updated = parsed.map((w: any) => w.id === workspaceId ? { ...w, files: updatedFiles, name: workspaceName } : w);
        localStorage.setItem('bloomyai_workspaces', JSON.stringify(updated));
        localStorage.setItem(`bloomyai_ws_${workspaceId}`, JSON.stringify({ name: workspaceName, files: updatedFiles, conversations }));
        addTerm("success", "Workspace saved");
      } catch (e) {
        console.error('Failed to save workspace:', e);
      }
    }
  };

  const doDownload = async () => {
    const zip = new JSZip();

    // Build a content map: fileId → latest content
    // Priority: active Monaco editor (for current file) > tab state > node.content from files tree
    const contentMap = new Map<string, string>();

    // 1. Seed from the files tree (persisted content)
    const seedContent = (nodes: FileNode[]) => {
      for (const node of nodes) {
        if (node.type === "file") contentMap.set(node.id, node.content ?? "");
        if (node.children) seedContent(node.children);
      }
    };
    seedContent(files);

    // 2. Override with tab state (in-memory edits not yet auto-saved)
    for (const tab of tabs) {
      contentMap.set(tab.fileId, tab.content);
    }

    // 3. Override active tab with live Monaco editor content (unsaved keystrokes)
    if (activeTabId && editorRef.current) {
      const liveContent = editorRef.current.getValue?.();
      const activeTab = tabs.find(t => t.id === activeTabId);
      if (activeTab && typeof liveContent === "string") {
        contentMap.set(activeTab.fileId, liveContent);
      }
    }

    const addToZip = (nodes: FileNode[], folder: JSZip) => {
      for (const node of nodes) {
        if (node.type === "file") {
          folder.file(node.name, contentMap.get(node.id) ?? "");
        } else if (node.type === "folder") {
          const sub = folder.folder(node.name)!;
          if (node.children) addToZip(node.children, sub);
        }
      }
    };

    addToZip(files, zip);

    // Fallback: if files tree is empty but tabs exist, zip tabs directly
    if (files.length === 0 && tabs.length > 0) {
      for (const tab of tabs) {
        const liveContent = (activeTabId === tab.id && editorRef.current?.getValue)
          ? editorRef.current.getValue()
          : tab.content;
        zip.file(tab.name, liveContent);
      }
    }

    const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${workspaceName}.zip`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const parseFilesFromContent = (content: string): { name: string; content: string }[] => {
    const files: { name: string; content: string }[] = [];
    const fileRegex = /FILE: (\S+)\n```([\s\S]*?)```/g;
    let match;
    
    while ((match = fileRegex.exec(content)) !== null) {
      files.push({
        name: match[1],
        content: match[2].trim(),
      });
    }
    
    return files;
  };

  const doCopy = () => {
    if (!aiOutput) return;
    navigator.clipboard.writeText(aiOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
      setConversations(prev => [...prev, { id: convId, title: promptToSend.slice(0, 30), messages: [] }]);
    }

    const userMsg: ChatMessage = { id: genId(), role: "user", content: promptToSend, timestamp: new Date().toISOString() };
    setConversations(prev => prev.map(c => c.id === convId ? { ...c, messages: [...c.messages, userMsg] } : c));

    aiAbortRef.current = new AbortController();

    try {
      // Build history from prior messages in the active conversation
      const activeConv = conversations.find(c => c.id === convId);
      const historyMessages = (activeConv?.messages || [])
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: promptToSend, model: "code", conversationId: convId, history: historyMessages }),
        signal: aiAbortRef.current.signal,
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('API response error:', errorText);
        throw new Error(`Failed to get response: ${res.status}`);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let output = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value, { stream: true });
          for (const line of text.split("\n")) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === "chunk") { output += data.content; setAiOutput(output); }
                else if (data.type === "done") {
                  const finalContent = data.content || output;
                  setAiOutput(finalContent);
                  const assistantMsg: ChatMessage = { id: genId(), role: "assistant", content: finalContent, timestamp: new Date().toISOString() };
                  setConversations(prev => prev.map(c => c.id === convId ? { ...c, messages: [...c.messages, assistantMsg] } : c));
                  
                  // Parse and create files from the response
                  const parsedFiles = parseFilesFromContent(finalContent);
                  if (parsedFiles.length > 0) {
                    parsedFiles.forEach(file => {
                      const newFile: FileNode = { id: genId(), name: file.name, type: "file", content: file.content };
                      setFiles(prev => addNode(prev, null, newFile));
                      const newTab: Tab = { id: genId(), fileId: newFile.id, name: newFile.name, content: newFile.content, language: getLanguage(newFile.name), modified: false };
                      setTabs(prev => [...prev, newTab]);
                      setActiveTabId(newTab.id);
                    });
                  }
                }
                else if (data.type === "error") {
                  output = data.content || "Error occurred";
                  setAiOutput(output);
                }
              } catch (e) {
                console.error('Error parsing SSE data:', e);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Error generating AI response:', err);
      if ((err as Error).name !== "AbortError") {
        const errMsg: ChatMessage = { id: genId(), role: "assistant", content: "Error: Failed to generate response. Please try again.", timestamp: new Date().toISOString() };
        setConversations(prev => prev.map(c => c.id === convId ? { ...c, messages: [...c.messages, errMsg] } : c));
        setAiOutput("Error: Failed to generate response. Please try again.");
      }
    } finally {
      setIsAiGenerating(false);
      aiAbortRef.current = null;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#0D1117] overflow-hidden">
      {/* Header */}
      <div className="h-14 bg-[#161B22] flex items-center px-4 gap-4 border-b border-[#30363D] shrink-0">
        <Link href="/chat">
          <button className="p-1 hover:bg-[#21262D] rounded" title="Back to Chat">
            <ArrowLeft className="w-4 h-4 text-[#8B949E]" />
          </button>
        </Link>
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-[#58A6FF]" />
          <span className="text-sm text-[#C9D1D9]">Bloomy AI Editor</span>
          <span className="text-xs text-[#8B949E]">({workspaceName})</span>
        </div>
        <div className="flex-1" />
        <button onClick={doSave} className="p-1 hover:bg-[#21262D] rounded" title="Save (Ctrl+S)">
          <Save className="w-4 h-4 text-[#8B949E]" />
        </button>
        <button onClick={doDownload} className="p-1 hover:bg-[#21262D] rounded" title="Download">
          <Download className="w-4 h-4 text-[#8B949E]" />
        </button>
      </div>

      {/* Main */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: 250 }}
              exit={{ width: 0 }}
              transition={{ duration: 0.15 }}
              className="bg-[#161B22] border-r border-[#30363D] flex flex-col overflow-hidden shrink-0"
            >
              <div className="p-3 flex items-center justify-between border-b border-[#30363D]">
                <span className="text-xs text-[#8B949E] uppercase tracking-wider font-semibold">Explorer</span>
                <div className="flex gap-1">
                  <button onClick={() => ctxAction("newFile")} className="p-1 hover:bg-[#21262D] rounded" title="New File">
                    <FilePlus className="w-4 h-4 text-[#8B949E]" />
                  </button>
                  <button onClick={() => ctxAction("newFolder")} className="p-1 hover:bg-[#21262D] rounded" title="New Folder">
                    <FolderPlus className="w-4 h-4 text-[#8B949E]" />
                  </button>
                </div>
              </div>
              <div className="p-2 border-b border-[#30363D]">
                <div className="flex items-center bg-[#0D1117] rounded px-2 py-1 border border-[#30363D]">
                  <Search className="w-4 h-4 text-[#8B949E]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search..."
                    className="flex-1 bg-transparent ml-2 text-sm text-[#C9D1D9] placeholder-[#8B949E] focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-2 relative">
                {files.length === 0 ? (
                  <div className="p-4 text-center text-[#8B949E]">
                    <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No files</p>
                    <p className="text-xs mt-1">Right-click to create</p>
                  </div>
                ) : renderTree(files)}

                {/* Context Menu */}
                {contextMenu && (
                  <div
                    className="absolute bg-[#161B22] border border-[#30363D] rounded-lg shadow-xl py-1 z-50 min-w-[150px]"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => ctxAction("newFile", contextMenu.nodeId)}
                      className="w-full px-3 py-2 text-left text-sm text-[#C9D1D9] hover:bg-[#21262D] flex items-center gap-2"
                    >
                      <FilePlus className="w-4 h-4" />
                      New File
                    </button>
                    <button
                      onClick={() => ctxAction("newFolder", contextMenu.nodeId)}
                      className="w-full px-3 py-2 text-left text-sm text-[#C9D1D9] hover:bg-[#21262D] flex items-center gap-2"
                    >
                      <FolderPlus className="w-4 h-4" />
                      New Folder
                    </button>
                    {contextMenu.nodeId && (
                      <>
                        <div className="h-px bg-[#30363D] my-1" />
                        <button
                          onClick={() => ctxAction("rename", contextMenu.nodeId)}
                          className="w-full px-3 py-2 text-left text-sm text-[#C9D1D9] hover:bg-[#21262D]"
                        >
                          Rename
                        </button>
                        <button
                          onClick={() => ctxAction("copy", contextMenu.nodeId)}
                          className="w-full px-3 py-2 text-left text-sm text-[#C9D1D9] hover:bg-[#21262D]"
                        >
                          Copy
                        </button>
                        <button
                          onClick={() => ctxAction("delete", contextMenu.nodeId)}
                          className="w-full px-3 py-2 text-left text-sm text-[#F85149] hover:bg-[#21262D]"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Tabs */}
          <div className="h-9 bg-[#161B22] flex items-center border-b border-[#30363D] overflow-x-auto shrink-0">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={`flex items-center gap-2 px-3 py-1 text-sm cursor-pointer border-r border-[#30363D] min-w-0 shrink-0 ${
                  activeTabId === tab.id ? "bg-[#0D1117] text-[#C9D1D9] border-t-2 border-t-[#F78166]" : "text-[#8B949E] hover:bg-[#21262D]"
                }`}
              >
                <FileText className="w-4 h-4 shrink-0" />
                <span className="truncate">{tab.name}</span>
                {tab.modified && <div className="w-2 h-2 rounded-full bg-[#F78166] shrink-0" />}
                <button onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }} className="p-0.5 hover:bg-[#21262D] rounded shrink-0">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            <button
              onClick={() => ctxAction("newFile")}
              className="p-2 text-[#8B949E] hover:text-[#C9D1D9] hover:bg-[#21262D]"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Editor */}
          <div className="flex-1 overflow-hidden">
            {activeTab ? (
              <Editor
                height="100%"
                language={activeTab.language}
                value={activeTab.content}
                onChange={onEditorChange}
                onMount={onEditorMount}
                theme="vs-dark"
                options={{
                  fontSize: 14,
                  fontFamily: "'Fira Code', Consolas, monospace",
                  minimap: { enabled: true },
                  scrollBeyondLastLine: false,
                  smoothScrolling: true,
                  cursorBlinking: "smooth",
                  renderLineHighlight: "all",
                  bracketPairColorization: { enabled: true },
                  autoClosingBrackets: "always",
                  autoClosingQuotes: "always",
                  autoIndent: "full",
                  tabSize: 2,
                  wordWrap: "on",
                  lineNumbers: "on",
                  folding: true,
                }}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-[#8B949E]">
                <div className="text-center">
                  <Code2 className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg">Bloomy AI Editor</p>
                  <p className="text-sm mt-2">Create a file or open from explorer</p>
                  <div className="flex gap-2 mt-4 justify-center">
                    <button onClick={() => ctxAction("newFile")} className="px-4 py-2 bg-[#238636] hover:bg-[#2EA043] rounded-lg text-sm text-[#C9D1D9] transition-colors">
                      New File
                    </button>
                    <button onClick={() => ctxAction("newFolder")} className="px-4 py-2 bg-[#21262D] hover:bg-[#30363D] rounded-lg text-sm text-[#C9D1D9] transition-colors">
                      New Folder
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* AI Panel - Right Side */}
        <div className="w-80 bg-[#161B22] border-l border-[#30363D] flex flex-col shrink-0">
          <div className="h-8 flex items-center px-4 gap-3 border-b border-[#30363D]">
            <Zap className="w-4 h-4 text-[#58A6FF]" />
            <span className="text-sm text-[#C9D1D9] font-medium">Bloomy Coder</span>
            <div className="flex-1" />
            <button onClick={() => { setActiveConvId(null); setAiOutput(""); }} className="p-1 hover:bg-[#21262D] rounded" title="New Chat">
              <Plus className="w-4 h-4 text-[#8B949E]" />
            </button>
            <button onClick={doCopy} className="p-1 hover:bg-[#21262D] rounded" title="Copy">
              {copied ? <Check className="w-4 h-4 text-[#238636]" /> : <Copy className="w-4 h-4 text-[#8B949E]" />}
            </button>
            <button onClick={() => setTerminalOpen(!terminalOpen)} className="p-1 hover:bg-[#21262D] rounded" title="Terminal">
              <Terminal className="w-4 h-4 text-[#8B949E]" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <pre className="text-sm text-[#7EE787] whitespace-pre-wrap">{aiOutput || "Ask Bloomy Coder to help with your code..."}</pre>
          </div>
          <div className="p-3 border-t border-[#30363D]">
            <div className="flex gap-2">
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !isAiGenerating) {
                    e.preventDefault();
                    doAiGenerate();
                  }
                }}
                placeholder="Ask Bloomy Coder... (Cmd+Enter to send)"
                rows={3}
                className="flex-1 bg-[#0D1117] border border-[#30363D] rounded-lg px-3 py-2 text-sm text-[#C9D1D9] placeholder-[#8B949E] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]/50 resize-none"
              />
              <button onClick={doAiGenerate} disabled={isAiGenerating || !aiPrompt.trim()} className="px-4 py-2 bg-[#238636] hover:bg-[#2EA043] rounded-lg flex items-center gap-2 text-sm text-[#C9D1D9] disabled:opacity-50 transition-colors self-end">
                {isAiGenerating ? "..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Terminal */}
      {terminalOpen && (
        <div className="h-48 bg-[#0D1117] border-t border-[#30363D] flex flex-col shrink-0">
          <div className="h-8 flex items-center px-4 gap-3 border-b border-[#30363D]">
            <Terminal className="w-4 h-4 text-[#8B949E]" />
            <span className="text-sm text-[#C9D1D9]">Terminal</span>
            <button onClick={() => setTerminalOpen(false)} className="ml-auto p-1 hover:bg-[#21262D] rounded">
              <X className="w-4 h-4 text-[#8B949E]" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 font-mono text-sm">
            {termLines.map((line, i) => (
              <div key={i} className={`mb-1 ${line.type === "error" ? "text-[#F85149]" : line.type === "success" ? "text-[#7EE787]" : line.type === "command" ? "text-[#8B949E]" : "text-[#C9D1D9]"}`}>
                {line.text}
              </div>
            ))}
          </div>
          <div className="p-2 border-t border-[#30363D]">
            <div className="flex items-center gap-2">
              <span className="text-[#7EE787]">$</span>
              <input
                type="text"
                value={termInput}
                onChange={(e) => setTermInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { runCmd(termInput); setTermInput(""); } }}
                placeholder="Type a command..."
                className="flex-1 bg-transparent text-[#C9D1D9] placeholder-[#8B949E] focus:outline-none text-sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
