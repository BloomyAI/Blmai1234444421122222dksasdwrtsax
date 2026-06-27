"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { FolderOpen, Plus, Search, ArrowLeft, Trash2, Download, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loadWorkspaces, saveWorkspaces, createWorkspace } from "@/lib/ide/storage";
import type { Workspace } from "@/lib/ide/types";
import { importWorkspaceZip, exportWorkspaceZip, downloadBlob } from "@/lib/ide/zip";
import { collectAllPaths } from "@/lib/ide/vfs";

export default function EditorListPage() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setWorkspaces(loadWorkspaces());
  }, []);

  const createNewWorkspace = () => {
    const ws = createWorkspace();
    const updated = [ws, ...workspaces];
    setWorkspaces(updated);
    saveWorkspaces(updated);
    router.push(`/editor/${ws.id}`);
  };

  const deleteWorkspace = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const updated = workspaces.filter((w) => w.id !== id);
    setWorkspaces(updated);
    saveWorkspaces(updated);
  };

  const exportWorkspace = async (ws: Workspace, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const blob = await exportWorkspaceZip(ws.name, ws.files, { includeDotfiles: true });
    downloadBlob(blob, `${ws.name}.zip`);
  };

  const handleImportZip = async (file: File) => {
    const imported = await importWorkspaceZip(file);
    const ws = createWorkspace(imported.name);
    ws.files = imported.files;
    const updated = [ws, ...workspaces];
    setWorkspaces(updated);
    saveWorkspaces(updated);
    router.push(`/editor/${ws.id}`);
  };

  const filteredWorkspaces = workspaces.filter((ws) =>
    ws.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const days = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-[#1E222B]">
      <input
        ref={importRef}
        type="file"
        accept=".zip"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleImportZip(f);
          e.target.value = "";
        }}
      />

      <nav className="bg-[#15171E] border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <ArrowLeft className="w-5 h-5 text-white/60 hover:text-white cursor-pointer" />
            </Link>
            <img src="/logo.png" alt="Bloomy AI" className="w-8 h-8 rounded-full" />
            <span className="text-xl font-bold gradient-text">Workspaces</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => importRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-[#15171E] hover:bg-[#252933] border border-white/10 rounded-lg text-white text-sm transition-colors"
            >
              <Upload className="w-4 h-4" />
              Import ZIP
            </button>
            <button
              onClick={createNewWorkspace}
              className="flex items-center gap-2 px-4 py-2 bg-[#1E222B] hover:bg-[#252933] rounded-lg text-white text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Workspace
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search workspaces..."
              className="w-full bg-[#15171E] border border-white/10 rounded-lg px-10 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-bloomy-purple/50"
            />
          </div>
        </div>

        <div className="space-y-2">
          {filteredWorkspaces.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="w-16 h-16 mx-auto mb-4 text-white/20" />
              <p className="text-white/40 mb-4">No workspaces yet</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => importRef.current?.click()}
                  className="px-6 py-3 bg-[#15171E] border border-white/10 hover:bg-[#252933] rounded-lg text-white transition-colors"
                >
                  Import ZIP Project
                </button>
                <button
                  onClick={createNewWorkspace}
                  className="px-6 py-3 bg-bloomy-purple hover:bg-bloomy-purple/80 rounded-lg text-white transition-colors"
                >
                  Create Workspace
                </button>
              </div>
            </div>
          ) : (
            filteredWorkspaces.map((workspace, index) => (
              <motion.div
                key={workspace.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Link
                  href={`/editor/${workspace.id}`}
                  className="block bg-[#15171E] hover:bg-[#1E222B] border border-white/10 rounded-lg p-4 transition-colors group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <FolderOpen className="w-4 h-4 text-bloomy-purple" />
                        <h3 className="text-white font-medium">{workspace.name}</h3>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-white/60">
                        <span>{collectAllPaths(workspace.files).length} files</span>
                        <span>{formatDate(workspace.timestamp)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => exportWorkspace(workspace, e)}
                        className="opacity-0 group-hover:opacity-100 p-2 hover:bg-white/10 rounded-lg transition-all"
                        title="Export ZIP"
                      >
                        <Download className="w-4 h-4 text-white/60" />
                      </button>
                      <button
                        onClick={(e) => deleteWorkspace(workspace.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-2 hover:bg-white/10 rounded-lg transition-all"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-white/60" />
                      </button>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
