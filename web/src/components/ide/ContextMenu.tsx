"use client";

import { FilePlus, FolderPlus, Trash2, Copy, Pencil } from "lucide-react";

interface ContextMenuProps {
  x: number;
  y: number;
  targetPath: string | null;
  onAction: (action: string, path?: string) => void;
  onClose: () => void;
}

export function ContextMenu({ x, y, targetPath, onAction, onClose }: ContextMenuProps) {
  return (
    <div
      className="fixed bg-[#161B22] border border-[#30363D] rounded-lg shadow-xl py-1 z-[90] min-w-[160px]"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={() => {
          onAction("newFile", targetPath ?? undefined);
          onClose();
        }}
        className="w-full px-3 py-2 text-left text-sm text-[#C9D1D9] hover:bg-[#21262D] flex items-center gap-2"
      >
        <FilePlus className="w-4 h-4" /> New File
      </button>
      <button
        onClick={() => {
          onAction("newFolder", targetPath ?? undefined);
          onClose();
        }}
        className="w-full px-3 py-2 text-left text-sm text-[#C9D1D9] hover:bg-[#21262D] flex items-center gap-2"
      >
        <FolderPlus className="w-4 h-4" /> New Folder
      </button>
      {targetPath && (
        <>
          <div className="h-px bg-[#30363D] my-1" />
          <button
            onClick={() => {
              onAction("rename", targetPath);
              onClose();
            }}
            className="w-full px-3 py-2 text-left text-sm text-[#C9D1D9] hover:bg-[#21262D] flex items-center gap-2"
          >
            <Pencil className="w-4 h-4" /> Rename
          </button>
          <button
            onClick={() => {
              onAction("duplicate", targetPath);
              onClose();
            }}
            className="w-full px-3 py-2 text-left text-sm text-[#C9D1D9] hover:bg-[#21262D] flex items-center gap-2"
          >
            <Copy className="w-4 h-4" /> Duplicate
          </button>
          <button
            onClick={() => {
              onAction("delete", targetPath);
              onClose();
            }}
            className="w-full px-3 py-2 text-left text-sm text-[#F85149] hover:bg-[#21262D] flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </>
      )}
    </div>
  );
}
