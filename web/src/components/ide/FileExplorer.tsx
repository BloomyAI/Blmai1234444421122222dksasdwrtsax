"use client";

import { FileText, FolderOpen, FolderPlus, FilePlus } from "lucide-react";
import type { TreeNode } from "@/lib/ide/types";

interface FileExplorerProps {
  tree: TreeNode[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activePath: string | null;
  renamingPath: string | null;
  renameValue: string;
  onRenameValueChange: (v: string) => void;
  onOpenFile: (path: string) => void;
  onContextMenu: (e: React.MouseEvent, path: string | null) => void;
  onStartRename: (path: string, name: string) => void;
  onCommitRename: (path: string) => void;
  onCancelRename: () => void;
  onNewFile: (parentPath: string | null) => void;
  onNewFolder: (parentPath: string | null) => void;
  onDrop: (targetPath: string | null, draggedPath: string) => void;
  draggedPath: string | null;
  onDragStart: (path: string) => void;
  onDragEnd: () => void;
}

function TreeItem({
  node,
  depth,
  activePath,
  renamingPath,
  renameValue,
  onRenameValueChange,
  onOpenFile,
  onContextMenu,
  onStartRename,
  onCommitRename,
  onCancelRename,
  onDrop,
  draggedPath,
  onDragStart,
  onDragEnd,
}: {
  node: TreeNode;
  depth: number;
} & Omit<FileExplorerProps, "tree" | "searchQuery" | "onSearchChange" | "onNewFile" | "onNewFolder">) {
  const isRenaming = renamingPath === node.path;
  const isActive = activePath === node.path;
  const isDragging = draggedPath === node.path;

  return (
    <div>
      <div
        draggable={node.type === "file" || node.type === "folder"}
        onDragStart={(e) => {
          e.stopPropagation();
          onDragStart(node.path);
        }}
        onDragEnd={onDragEnd}
        onDragOver={(e) => {
          if (node.type === "folder") e.preventDefault();
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (draggedPath && draggedPath !== node.path) {
            onDrop(node.type === "folder" ? node.path : null, draggedPath);
          }
        }}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        className={`flex items-center gap-2 py-1 pr-2 rounded cursor-pointer group ${
          isActive ? "bg-[#1F2937]" : "hover:bg-[#21262D]"
        } ${isDragging ? "opacity-50" : ""}`}
        onClick={() => {
          if (isRenaming) return;
          if (node.type === "file") onOpenFile(node.path);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          onContextMenu(e, node.path);
        }}
        onDoubleClick={() => onStartRename(node.path, node.name)}
      >
        {node.type === "folder" ? (
          <FolderOpen className="w-4 h-4 text-[#54AEFF] shrink-0" />
        ) : (
          <FileText className="w-4 h-4 text-[#8B949E] shrink-0" />
        )}
        {isRenaming ? (
          <input
            autoFocus
            value={renameValue}
            onChange={(e) => onRenameValueChange(e.target.value)}
            onBlur={() => onCommitRename(node.path)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onCommitRename(node.path);
              if (e.key === "Escape") onCancelRename();
            }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 bg-[#0D1117] border border-[#58A6FF] rounded px-1 text-sm text-[#C9D1D9] focus:outline-none"
          />
        ) : (
          <span className="text-sm text-[#C9D1D9] truncate">{node.name}</span>
        )}
      </div>
      {node.children?.map((child) => (
        <TreeItem
          key={child.path}
          node={child}
          depth={depth + 1}
          activePath={activePath}
          renamingPath={renamingPath}
          renameValue={renameValue}
          onRenameValueChange={onRenameValueChange}
          onOpenFile={onOpenFile}
          onContextMenu={onContextMenu}
          onStartRename={onStartRename}
          onCommitRename={onCommitRename}
          onCancelRename={onCancelRename}
          onDrop={onDrop}
          draggedPath={draggedPath}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        />
      ))}
    </div>
  );
}

export function FileExplorer(props: FileExplorerProps) {
  const {
    tree,
    searchQuery,
    onSearchChange,
    onNewFile,
    onNewFolder,
    onContextMenu,
    onDrop,
    draggedPath,
    onDragEnd,
  } = props;

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 flex items-center justify-between border-b border-[#30363D]">
        <span className="text-xs text-[#8B949E] uppercase tracking-wider font-semibold">Explorer</span>
        <div className="flex gap-1">
          <button onClick={() => onNewFile(null)} className="p-1 hover:bg-[#21262D] rounded" title="New File">
            <FilePlus className="w-4 h-4 text-[#8B949E]" />
          </button>
          <button onClick={() => onNewFolder(null)} className="p-1 hover:bg-[#21262D] rounded" title="New Folder">
            <FolderPlus className="w-4 h-4 text-[#8B949E]" />
          </button>
        </div>
      </div>
      <div className="p-2 border-b border-[#30363D]">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Filter files..."
          className="w-full bg-[#0D1117] border border-[#30363D] rounded px-2 py-1 text-sm text-[#C9D1D9] placeholder-[#8B949E] focus:outline-none focus:ring-1 focus:ring-[#58A6FF]/50"
        />
      </div>
      <div
        className="flex-1 overflow-y-auto p-1 relative"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (draggedPath) onDrop(null, draggedPath);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          onContextMenu(e, null);
        }}
      >
        {tree.length === 0 ? (
          <div className="p-4 text-center text-[#8B949E]">
            <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No files</p>
            <p className="text-xs mt-1">Right-click or drag files here</p>
          </div>
        ) : (
          tree.map((node) => (
            <TreeItem key={node.path} node={node} depth={0} {...props} />
          ))
        )}
      </div>
    </div>
  );
}
