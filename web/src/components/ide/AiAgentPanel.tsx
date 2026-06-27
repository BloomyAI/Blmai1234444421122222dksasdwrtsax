"use client";

import { useEffect, useRef } from "react";
import { Zap, Plus, Copy, Check, ToggleLeft, ToggleRight } from "lucide-react";
import type { ChatMessage, Conversation } from "@/lib/ide/types";

interface AiAgentPanelProps {
  conversations: Conversation[];
  activeConvId: string | null;
  aiOutput: string;
  aiPrompt: string;
  isGenerating: boolean;
  autoApply: boolean;
  onAutoApplyChange: (v: boolean) => void;
  onPromptChange: (v: string) => void;
  onSend: () => void;
  onNewChat: () => void;
  onCopy: () => void;
  copied: boolean;
}

export function AiAgentPanel({
  conversations,
  activeConvId,
  aiOutput,
  aiPrompt,
  isGenerating,
  autoApply,
  onAutoApplyChange,
  onPromptChange,
  onSend,
  onNewChat,
  onCopy,
  copied,
}: AiAgentPanelProps) {
  const messagesRef = useRef<HTMLDivElement>(null);
  const activeConv = conversations.find((c) => c.id === activeConvId);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [activeConv?.messages, aiOutput, isGenerating]);

  return (
    <div className="flex flex-col h-full">
      <div className="h-9 flex items-center px-3 gap-2 border-b border-[#30363D] shrink-0">
        <Zap className="w-4 h-4 text-[#58A6FF]" />
        <span className="text-sm text-[#C9D1D9] font-medium">Bloomy Coder</span>
        <div className="flex-1" />
        <button
          onClick={() => onAutoApplyChange(!autoApply)}
          className="flex items-center gap-1 text-xs text-[#8B949E] hover:text-[#C9D1D9]"
          title="Auto Apply AI changes"
        >
          {autoApply ? (
            <ToggleRight className="w-4 h-4 text-[#238636]" />
          ) : (
            <ToggleLeft className="w-4 h-4" />
          )}
          Auto Apply
        </button>
        <button onClick={onNewChat} className="p-1 hover:bg-[#21262D] rounded" title="New Chat">
          <Plus className="w-4 h-4 text-[#8B949E]" />
        </button>
        <button onClick={onCopy} className="p-1 hover:bg-[#21262D] rounded" title="Copy">
          {copied ? <Check className="w-4 h-4 text-[#238636]" /> : <Copy className="w-4 h-4 text-[#8B949E]" />}
        </button>
      </div>

      <div ref={messagesRef} id="ai-messages" className="flex-1 overflow-y-auto p-3 space-y-3">
        {activeConv?.messages.map((msg: ChatMessage) => (
          <div
            key={msg.id}
            className={`text-sm rounded-lg p-2 ${
              msg.role === "user"
                ? "bg-[#21262D] text-[#C9D1D9] ml-4"
                : "bg-[#0D1117] text-[#7EE787] mr-4 border border-[#30363D]"
            }`}
          >
            <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
          </div>
        ))}
        {isGenerating && aiOutput && (
          <div className="text-sm bg-[#0D1117] text-[#7EE787] mr-4 border border-[#30363D] rounded-lg p-2">
            <pre className="whitespace-pre-wrap font-sans">{aiOutput}</pre>
          </div>
        )}
        {!activeConv?.messages.length && !aiOutput && (
          <p className="text-sm text-[#8B949E]">
            Ask Bloomy Coder to create, edit, refactor, or explain your project. Changes are previewed before applying unless Auto Apply is on.
          </p>
        )}
      </div>

      <div className="p-3 border-t border-[#30363D] shrink-0">
        <div className="flex gap-2">
          <textarea
            value={aiPrompt}
            onChange={(e) => onPromptChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !isGenerating) {
                e.preventDefault();
                onSend();
              }
            }}
            placeholder="Ask Bloomy Coder... (Ctrl+Enter)"
            rows={3}
            className="flex-1 bg-[#0D1117] border border-[#30363D] rounded-lg px-3 py-2 text-sm text-[#C9D1D9] placeholder-[#8B949E] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]/50 resize-none"
          />
          <button
            onClick={onSend}
            disabled={isGenerating || !aiPrompt.trim()}
            className="px-4 py-2 bg-[#238636] hover:bg-[#2EA043] rounded-lg text-sm text-[#C9D1D9] disabled:opacity-50 transition-colors self-end"
          >
            {isGenerating ? "..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
