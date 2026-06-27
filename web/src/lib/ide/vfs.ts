import type { LegacyFileNode, TreeNode, WorkspaceFile } from "./types";
import { basename, dirname, getFileName, joinPath, normalizePath } from "./languages";

export function genId(): string {
  return Math.random().toString(36).slice(2, 11);
}

/** Migrate legacy nested tree to flat path-based files */
export function migrateLegacyTree(nodes: LegacyFileNode[], prefix = ""): WorkspaceFile[] {
  const result: WorkspaceFile[] = [];
  for (const node of nodes) {
    const path = prefix ? joinPath(prefix, node.name) : node.name;
    if (node.type === "file") {
      result.push({ path, content: node.content ?? "" });
    } else if (node.children?.length) {
      result.push(...migrateLegacyTree(node.children, path));
    }
  }
  return result;
}

export function filesToMap(files: WorkspaceFile[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const f of files) {
    map.set(normalizePath(f.path), f.content);
  }
  return map;
}

export function mapToFiles(map: Map<string, string>): WorkspaceFile[] {
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([path, content]) => ({ path, content }));
}

export function buildTree(files: WorkspaceFile[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const file of files) {
    const parts = normalizePath(file.path).split("/");
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      const isFile = i === parts.length - 1;
      const path = parts.slice(0, i + 1).join("/");

      if (isFile) {
        current.push({ name, path, type: "file" });
      } else {
        let folder = current.find((n) => n.type === "folder" && n.name === name);
        if (!folder) {
          folder = { name, path, type: "folder", children: [] };
          current.push(folder);
        }
        current = folder.children!;
      }
    }
  }

  const sortNodes = (nodes: TreeNode[]): TreeNode[] =>
    nodes
      .map((n) => (n.children ? { ...n, children: sortNodes(n.children) } : n))
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

  return sortNodes(root);
}

export function getFileContent(files: WorkspaceFile[], path: string): string | undefined {
  const normalized = normalizePath(path);
  return files.find((f) => normalizePath(f.path) === normalized)?.content;
}

export function setFileContent(files: WorkspaceFile[], path: string, content: string): WorkspaceFile[] {
  const normalized = normalizePath(path);
  const idx = files.findIndex((f) => normalizePath(f.path) === normalized);
  if (idx >= 0) {
    const next = [...files];
    next[idx] = { path: normalized, content };
    return next;
  }
  return [...files, { path: normalized, content }];
}

export function createFile(files: WorkspaceFile[], path: string, content = ""): WorkspaceFile[] {
  const normalized = normalizePath(path);
  if (files.some((f) => normalizePath(f.path) === normalized)) return files;
  return [...files, { path: normalized, content }];
}

export function deletePath(files: WorkspaceFile[], path: string): WorkspaceFile[] {
  const normalized = normalizePath(path);
  return files.filter((f) => {
    const fp = normalizePath(f.path);
    return fp !== normalized && !fp.startsWith(normalized + "/");
  });
}

export function renamePath(files: WorkspaceFile[], oldPath: string, newPath: string): WorkspaceFile[] {
  const oldNorm = normalizePath(oldPath);
  const newNorm = normalizePath(newPath);
  return files.map((f) => {
    const fp = normalizePath(f.path);
    if (fp === oldNorm) return { path: newNorm, content: f.content };
    if (fp.startsWith(oldNorm + "/")) {
      return { path: joinPath(newNorm, fp.slice(oldNorm.length + 1)), content: f.content };
    }
    return f;
  });
}

export function movePath(files: WorkspaceFile[], from: string, toDir: string): WorkspaceFile[] {
  const fromNorm = normalizePath(from);
  const toDirNorm = normalizePath(toDir);
  const name = basename(fromNorm);
  const newPath = toDirNorm ? joinPath(toDirNorm, name) : name;
  return renamePath(files, fromNorm, newPath);
}

export function duplicatePath(files: WorkspaceFile[], path: string): WorkspaceFile[] {
  const normalized = normalizePath(path);
  const file = files.find((f) => normalizePath(f.path) === normalized);
  if (!file) return files;

  const ext = file.path.includes(".") ? file.path.slice(file.path.lastIndexOf(".")) : "";
  const base = ext ? file.path.slice(0, -ext.length) : file.path;
  let copyPath = `${base}-copy${ext}`;
  let i = 2;
  while (files.some((f) => normalizePath(f.path) === copyPath)) {
    copyPath = `${base}-copy-${i}${ext}`;
    i++;
  }
  return [...files, { path: copyPath, content: file.content }];
}

export function createFolder(files: WorkspaceFile[], folderPath: string): WorkspaceFile[] {
  const normalized = normalizePath(folderPath);
  const placeholder = joinPath(normalized, ".bloomykeep");
  if (files.some((f) => normalizePath(f.path) === placeholder)) return files;
  return [...files, { path: placeholder, content: "" }];
}

export function searchFiles(files: WorkspaceFile[], query: string): { path: string; line: number; text: string }[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  const results: { path: string; line: number; text: string }[] = [];

  for (const file of files) {
    if (file.path.endsWith(".bloomykeep")) continue;
    const lines = file.content.split("\n");
    lines.forEach((text, i) => {
      if (text.toLowerCase().includes(q)) {
        results.push({ path: file.path, line: i + 1, text: text.trim() });
      }
    });
  }
  return results.slice(0, 100);
}

export function filterTree(nodes: TreeNode[], query: string): TreeNode[] {
  if (!query.trim()) return nodes;
  const q = query.toLowerCase();

  const filter = (node: TreeNode): TreeNode | null => {
    if (node.name.toLowerCase().includes(q)) return node;
    if (node.children) {
      const children = node.children.map(filter).filter(Boolean) as TreeNode[];
      if (children.length) return { ...node, children };
    }
    return null;
  };

  return nodes.map(filter).filter(Boolean) as TreeNode[];
}

export function collectAllPaths(files: WorkspaceFile[]): string[] {
  return files
    .filter((f) => !f.path.endsWith(".bloomykeep"))
    .map((f) => normalizePath(f.path))
    .sort();
}

export function getBreadcrumbs(path: string): { name: string; path: string }[] {
  const parts = normalizePath(path).split("/");
  const crumbs: { name: string; path: string }[] = [];
  for (let i = 0; i < parts.length; i++) {
    crumbs.push({ name: parts[i], path: parts.slice(0, i + 1).join("/") });
  }
  return crumbs;
}

export function parentFolderPath(path: string | null): string {
  if (!path) return "";
  const node = normalizePath(path);
  if (!node.includes("/")) return "";
  return dirname(node);
}

/** Strip .bloomykeep placeholder files from export */
export function stripPlaceholderFiles(files: WorkspaceFile[]): WorkspaceFile[] {
  return files.filter((f) => !f.path.endsWith(".bloomykeep"));
}

export function isFolderPath(files: WorkspaceFile[], path: string): boolean {
  const normalized = normalizePath(path);
  if (normalized.endsWith(".bloomykeep")) return true;
  return files.some(
    (f) => f.path.startsWith(normalized + "/") || f.path === joinPath(normalized, ".bloomykeep")
  );
}

export function resolveParentDir(files: WorkspaceFile[], targetPath?: string): string {
  if (!targetPath) return "";
  const normalized = normalizePath(targetPath);
  if (isFolderPath(files, normalized)) {
    return normalized.replace(/\/\.bloomykeep$/, "");
  }
  if (normalized.includes("/")) {
    return normalized.split("/").slice(0, -1).join("/");
  }
  return "";
}

export function uniqueNameInDir(files: WorkspaceFile[], dir: string, name: string): string {
  const dirNorm = normalizePath(dir);
  let candidate = dirNorm ? joinPath(dirNorm, name) : name;
  if (!files.some((f) => normalizePath(f.path) === candidate)) return getFileName(candidate);

  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")) : "";
  const base = ext ? name.slice(0, -ext.length) : name;
  let i = 2;
  while (files.some((f) => normalizePath(f.path) === (dirNorm ? joinPath(dirNorm, `${base}-${i}${ext}`) : `${base}-${i}${ext}`))) {
    i++;
  }
  return `${base}-${i}${ext}`;
}
