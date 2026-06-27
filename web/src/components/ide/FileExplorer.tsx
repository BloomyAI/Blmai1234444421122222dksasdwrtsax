"use client";

import { useState } from "react";
import { FileText, Folder, FolderOpen, FolderPlus, FilePlus, ChevronRight, ChevronDown } from "lucide-react";
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
  onSelect?: (path: string) => void;
}

function TreeItem({
  node,
  depth,
  expanded,
  onToggle,
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
  onSelect,
}: {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (path: string) => void;
} & Omit<FileExplorerProps, "tree" | "searchQuery" | "onSearchChange" | "onNewFile" | "onNewFolder">) {
  const isRenaming = renamingPath === node.path;
  const isActive = activePath === node.path;
  const isDragging = draggedPath === node.path;
  const isFolder = node.type === "folder";
  const isExpanded = isFolder && expanded.has(node.path);

  return (
    <div>
      <div
        draggable
        onDragStart={(e) => {
          e.stopPropagation();
          onDragStart(node.path);
        }}
        onDragEnd={onDragEnd}
        onDragOver={(e) => {
          if (isFolder) e.preventDefault();
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (draggedPath && draggedPath !== node.path) {
            onDrop(isFolder ? node.path : null, draggedPath);
          }
        }}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
        className={`flex items-center gap-0.5 py-[3px] pr-2 cursor-pointer group text-[13px] ${
          isActive ? "bg-[#1f6feb33] text-[#f0f6fc]" : "text-[#c9d1d9] hover:bg-[#21262d]"
        } ${isDragging ? "opacity-50" : ""}`}
        onClick={() => {
          if (isRenaming) return;
          onSelect?.(node.path);
          if (isFolder) {
            onToggle(node.path);
          } else {
            onOpenFile(node.path);
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          onContextMenu(e, node.path);
        }}
        onDoubleClick={() => {
          if (node.type === "file") onStartRename(node.path, node.name);
        }}
      >
        {isFolder ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node.path);
            }}
            className="p-0.5 shrink-0 text-[#7d8590] hover:text-[#c9d1d9]"
          >
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}
        {isFolder ? (
          isExpanded ? (
            <FolderOpen className="w-4 h-4 text-[#7d8590] shrink-0" />
          ) : (
            <Folder className="w-4 h-4 text-[#7d8590] shrink-0" />
          )
        ) : (
          <FileText className="w-4 h-4 text-[#7d8590] shrink-0" />
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
            className="flex-1 bg-[#0d1117] border border-[#58a6ff] rounded px-1 text-[13px] text-[#c9d1d9] focus:outline-none"
          />
        ) : (
          <span className="truncate">{node.name}</span>
        )}
      </div>
      {isFolder && isExpanded &&
        node.children?.map((child) => (
          <TreeItem
            key={child.path}
            node={child}
            depth={depth + 1}
            expanded={expanded}
            onToggle={onToggle}
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
            onSelect={onSelect}
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

  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const toggleFolder = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#010409]">
      <div className="h-10 flex items-center justify-between px-3 text-xs font-semibold text-[#c9d1d9] shrink-0 border-b border-[#21262d]">
        <span>Files</span>
        <div className="flex gap-0.5">
          <button onClick={() => onNewFile(null)} title="New file" className="p-1 hover:bg-[#21262d] rounded text-[#8b949e]">
            <FilePlus className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onNewFolder(null)} title="New folder" className="p-1 hover:bg-[#21262d] rounded text-[#8b949e]">
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="px-2 py-2 shrink-0">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Go to file..."
          className="w-full bg-[#0d1117] border border-[#30363d] focus:border-[#58a6ff] rounded-md px-2 py-1 text-xs text-[#c9d1d9] placeholder-[#484f58] focus:outline-none"
        />
      </div>
      <div
        className="flex-1 overflow-y-auto px-1 pb-2"
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
          <div className="p-4 text-center text-[#8b949e] text-xs">
            <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p>This workspace is empty</p>
            <p className="mt-1 text-[#484f58]">Create a file or import a ZIP</p>
          </div>
        ) : (
          tree.map((node) => (
            <TreeItem
              key={node.path}
              node={node}
              depth={0}
              expanded={expanded}
              onToggle={toggleFolder}
              {...props}
            />
          ))
        )}
      </div>
    </div>
  );
}
