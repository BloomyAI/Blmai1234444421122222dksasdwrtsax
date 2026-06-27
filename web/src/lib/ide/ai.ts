import type { EditorTab, PendingChange, WorkspaceFile } from "./types";
import { collectAllPaths, getFileContent } from "./vfs";
import { getFileName } from "./languages";

export function buildWorkspaceContext(
  files: WorkspaceFile[],
  tabs: EditorTab[],
  activePath?: string
): string {
  const paths = collectAllPaths(files);
  const configFiles = paths.filter((p) =>
    /^(package\.json|tsconfig\.json|\.env|\.gitignore|README\.md|next\.config|vite\.config)/i.test(getFileName(p)) ||
    p.endsWith(".json") && p.split("/").length <= 2
  );

  const lines: string[] = [
    "## Workspace file tree",
    paths.length ? paths.map((p) => `- ${p}`).join("\n") : "(empty)",
    "",
  ];

  if (activePath) {
    const content = tabs.find((t) => t.path === activePath)?.content ?? getFileContent(files, activePath);
    if (content !== undefined) {
      lines.push(`## Active file: ${activePath}`, "```", content.slice(0, 8000), "```", "");
    }
  }

  const openTabs = tabs.filter((t) => t.modified || t.path === activePath);
  if (openTabs.length) {
    lines.push("## Open tabs");
    for (const tab of openTabs.slice(0, 5)) {
      lines.push(`### ${tab.path}${tab.modified ? " (modified)" : ""}`, "```", tab.content.slice(0, 4000), "```");
    }
  }

  for (const cfg of configFiles.slice(0, 8)) {
    const content = getFileContent(files, cfg);
    if (content) {
      lines.push(`## ${cfg}`, "```", content.slice(0, 4000), "```", "");
    }
  }

  return lines.join("\n");
}

export function parseFilesFromContent(content: string): { path: string; content: string }[] {
  const files: { path: string; content: string }[] = [];
  const fileRegex = /FILE:\s*([^\n\r]+)\s*\n```[\w]*\n?([\s\S]*?)```/g;
  let match;
  while ((match = fileRegex.exec(content)) !== null) {
    files.push({ path: match[1].trim(), content: match[2].trimEnd() });
  }
  return files;
}

export function parsedFilesToChanges(
  parsed: { path: string; content: string }[],
  existingFiles: WorkspaceFile[]
): PendingChange[] {
  return parsed.map((file) => {
    const oldContent = getFileContent(existingFiles, file.path);
    return {
      id: Math.random().toString(36).slice(2, 11),
      type: oldContent === undefined ? "create" : "edit",
      path: file.path,
      oldContent,
      newContent: file.content,
      status: "pending" as const,
    };
  });
}

export function applyChange(files: WorkspaceFile[], change: PendingChange): WorkspaceFile[] {
  switch (change.type) {
    case "create":
    case "edit":
      if (change.newContent === undefined) return files;
      return upsertFile(files, change.path, change.newContent);
    case "delete":
      return files.filter((f) => f.path !== change.path);
    case "rename":
    case "move":
      if (!change.newPath) return files;
      return files.map((f) => {
        if (f.path === change.path) return { path: change.newPath!, content: f.content };
        if (f.path.startsWith(change.path + "/")) {
          return { path: change.newPath + f.path.slice(change.path.length), content: f.content };
        }
        return f;
      });
    default:
      return files;
  }
}

function upsertFile(files: WorkspaceFile[], path: string, content: string): WorkspaceFile[] {
  const idx = files.findIndex((f) => f.path === path);
  if (idx >= 0) {
    const next = [...files];
    next[idx] = { path, content };
    return next;
  }
  return [...files, { path, content }];
}

export function applyAllChanges(files: WorkspaceFile[], changes: PendingChange[]): WorkspaceFile[] {
  return changes.reduce((acc, c) => applyChange(acc, { ...c, status: "applied" }), files);
}
