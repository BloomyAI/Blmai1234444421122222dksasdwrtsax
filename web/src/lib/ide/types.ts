/** @deprecated Legacy tree format — migrated to path-based on load */
export interface LegacyFileNode {
  id: string;
  name: string;
  type: "file" | "folder";
  content?: string;
  children?: LegacyFileNode[];
}

export interface WorkspaceFile {
  path: string;
  content: string;
}

export interface Workspace {
  id: string;
  name: string;
  files: WorkspaceFile[];
  timestamp: string;
}

export interface WorkspaceSettings {
  autoApply: boolean;
  theme: "vs-dark" | "vs-light" | "hc-black";
  includeNodeModulesOnExport: boolean;
}

export interface EditorTab {
  id: string;
  path: string;
  content: string;
  language: string;
  modified: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
}

export type ChangeType = "create" | "edit" | "delete" | "rename" | "move";

export interface PendingChange {
  id: string;
  type: ChangeType;
  path: string;
  newPath?: string;
  oldContent?: string;
  newContent?: string;
  status: "pending" | "applied" | "rejected";
}

export interface TreeNode {
  name: string;
  path: string;
  type: "file" | "folder";
  children?: TreeNode[];
}

export interface CommandItem {
  id: string;
  label: string;
  category?: string;
  shortcut?: string;
  action: () => void;
}

export interface ExportOptions {
  includeNodeModules?: boolean;
  includeDotfiles?: boolean;
}

export const DEFAULT_SETTINGS: WorkspaceSettings = {
  autoApply: false,
  theme: "vs-dark",
  includeNodeModulesOnExport: false,
};

export const WORKSPACES_KEY = "bloomyai_workspaces";
export const settingsKey = (id: string) => `bloomyai_ws_settings_${id}`;
export const conversationsKey = (id: string) => `bloomyai_ws_${id}`;
