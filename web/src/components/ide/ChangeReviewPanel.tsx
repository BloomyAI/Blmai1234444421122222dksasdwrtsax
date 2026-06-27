"use client";

import type { PendingChange } from "@/lib/ide/types";
import { Check, Eye, X, FilePlus, FilePen, Trash2 } from "lucide-react";

interface ChangeReviewPanelProps {
  changes: PendingChange[];
  onApply: (id: string) => void;
  onReject: (id: string) => void;
  onApplyAll: () => void;
  onRejectAll: () => void;
  onPreview: (change: PendingChange) => void;
}

const iconFor = (type: PendingChange["type"]) => {
  switch (type) {
    case "create":
      return FilePlus;
    case "delete":
      return Trash2;
    default:
      return FilePen;
  }
};

export function ChangeReviewPanel({
  changes,
  onApply,
  onReject,
  onApplyAll,
  onRejectAll,
  onPreview,
}: ChangeReviewPanelProps) {
  const pending = changes.filter((c) => c.status === "pending");

  if (pending.length === 0) return null;

  return (
    <div className="border-t border-[#30363D] bg-[#161B22] max-h-48 overflow-y-auto shrink-0">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#30363D]">
        <span className="text-xs text-[#8B949E] uppercase font-semibold">
          Pending Changes ({pending.length})
        </span>
        <div className="flex gap-2">
          <button
            onClick={onApplyAll}
            className="text-xs px-2 py-1 bg-[#238636] hover:bg-[#2EA043] rounded text-[#C9D1D9]"
          >
            Apply All
          </button>
          <button
            onClick={onRejectAll}
            className="text-xs px-2 py-1 bg-[#21262D] hover:bg-[#30363D] rounded text-[#C9D1D9]"
          >
            Reject All
          </button>
        </div>
      </div>
      {pending.map((change) => {
        const Icon = iconFor(change.type);
        return (
          <div
            key={change.id}
            className="flex items-center gap-2 px-3 py-2 hover:bg-[#21262D] border-b border-[#30363D]/50 text-sm"
          >
            <Icon className="w-4 h-4 text-[#58A6FF] shrink-0" />
            <span className="flex-1 truncate text-[#C9D1D9]">
              {change.type}: {change.path}
              {change.newPath ? ` → ${change.newPath}` : ""}
            </span>
            <button
              onClick={() => onPreview(change)}
              className="p-1 hover:bg-[#30363D] rounded"
              title="Preview diff"
            >
              <Eye className="w-3.5 h-3.5 text-[#8B949E]" />
            </button>
            <button
              onClick={() => onApply(change.id)}
              className="p-1 hover:bg-[#30363D] rounded"
              title="Apply"
            >
              <Check className="w-3.5 h-3.5 text-[#7EE787]" />
            </button>
            <button
              onClick={() => onReject(change.id)}
              className="p-1 hover:bg-[#30363D] rounded"
              title="Reject"
            >
              <X className="w-3.5 h-3.5 text-[#F85149]" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
