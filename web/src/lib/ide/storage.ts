import type { Workspace, WorkspaceSettings, LegacyFileNode } from "./types";
import { DEFAULT_SETTINGS, WORKSPACES_KEY, settingsKey, conversationsKey } from "./types";
import { migrateLegacyTree } from "./vfs";

export function loadWorkspaces(): Workspace[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(WORKSPACES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<Workspace & { files?: unknown }>;
    return parsed.map(normalizeWorkspace);
  } catch {
    return [];
  }
}

export function saveWorkspaces(workspaces: Workspace[]) {
  localStorage.setItem(WORKSPACES_KEY, JSON.stringify(workspaces));
}

export function loadWorkspace(id: string): Workspace | null {
  return loadWorkspaces().find((w) => w.id === id) ?? null;
}

export function upsertWorkspace(workspace: Workspace) {
  const all = loadWorkspaces();
  const idx = all.findIndex((w) => w.id === workspace.id);
  if (idx >= 0) all[idx] = workspace;
  else all.unshift(workspace);
  saveWorkspaces(all);
}

export function loadSettings(id: string): WorkspaceSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(settingsKey(id));
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(id: string, settings: WorkspaceSettings) {
  localStorage.setItem(settingsKey(id), JSON.stringify(settings));
}

export function loadConversations(id: string) {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(conversationsKey(id));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return parsed.conversations || [];
  } catch {
    return [];
  }
}

export function saveConversations(id: string, conversations: unknown[], name: string, files: unknown[]) {
  localStorage.setItem(
    conversationsKey(id),
    JSON.stringify({ name, files, conversations })
  );
}

function normalizeWorkspace(w: Workspace & { files?: unknown }): Workspace {
  if (Array.isArray(w.files) && w.files.length > 0) {
    const first = w.files[0] as Record<string, unknown>;
    if ("path" in first && typeof first.path === "string") {
      return w as Workspace;
    }
    if ("id" in first && "type" in first) {
      return {
        ...w,
        files: migrateLegacyTree(w.files as LegacyFileNode[]),
      };
    }
  }
  return { ...w, files: (w.files as Workspace["files"]) || [] };
}

export function createWorkspace(name = "New Workspace"): Workspace {
  return {
    id: Date.now().toString(),
    name,
    files: [],
    timestamp: new Date().toISOString(),
  };
}
