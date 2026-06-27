import JSZip from "jszip";
import type { ExportOptions, WorkspaceFile } from "./types";
import { normalizePath } from "./languages";
import { stripPlaceholderFiles } from "./vfs";

const MANIFEST = "bloomy-workspace.json";

function shouldExclude(path: string, options: ExportOptions): boolean {
  const normalized = normalizePath(path);
  if (!options.includeNodeModules && (normalized.startsWith("node_modules/") || normalized.includes("/node_modules/"))) {
    return true;
  }
  if (options.includeDotfiles === false) {
    const parts = normalized.split("/");
    if (parts.some((p) => p.startsWith(".") && p !== ".bloomykeep")) return true;
  }
  if (normalized.startsWith(".git/")) return true;
  if (normalized.endsWith(".bloomykeep")) return true;
  return false;
}

export async function exportWorkspaceZip(
  name: string,
  files: WorkspaceFile[],
  options: ExportOptions = {}
): Promise<Blob> {
  const opts: Required<ExportOptions> = {
    includeNodeModules: options.includeNodeModules ?? false,
    includeDotfiles: options.includeDotfiles ?? true,
  };

  const zip = new JSZip();
  const cleaned = stripPlaceholderFiles(files);

  for (const file of cleaned) {
    const path = normalizePath(file.path);
    if (shouldExclude(path, opts)) continue;
    zip.file(path, file.content);
  }

  zip.file(
    MANIFEST,
    JSON.stringify({ version: 1, name, exportedAt: new Date().toISOString() }, null, 2)
  );

  return zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
}

function isPathTraversal(path: string): boolean {
  return path.split("/").some((p) => p === "..");
}

function detectRootPrefix(paths: string[]): string {
  if (paths.length === 0) return "";
  const parts = paths.map((p) => p.split("/"));
  const first = parts[0];
  if (parts.every((p) => p.length > 1 && p[0] === first[0])) {
    return first[0] + "/";
  }
  return "";
}

export async function importWorkspaceZip(file: File): Promise<{ name: string; files: WorkspaceFile[] }> {
  const zip = await JSZip.loadAsync(file);
  const entries: { path: string; content: string }[] = [];

  const paths: string[] = [];
  zip.forEach((relativePath) => {
    if (!relativePath.endsWith("/") && relativePath !== MANIFEST && !isPathTraversal(relativePath)) {
      paths.push(relativePath);
    }
  });

  const rootPrefix = detectRootPrefix(paths);

  for (const relativePath of paths) {
    let path = relativePath;
    if (rootPrefix && path.startsWith(rootPrefix)) {
      path = path.slice(rootPrefix.length);
    }
    path = normalizePath(path);
    if (!path || isPathTraversal(path)) continue;

    const entry = zip.file(relativePath);
    if (!entry) continue;

    const isBinary = /\.(png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot|pdf|zip|exe|dll|so|dylib)$/i.test(path);
    let content: string;
    if (isBinary) {
      const buf = await entry.async("base64");
      content = `__BINARY_BASE64__:${buf}`;
    } else {
      content = await entry.async("string");
    }
    entries.push({ path, content });
  }

  let name = file.name.replace(/\.zip$/i, "") || "Imported Workspace";
  const manifestEntry = zip.file(MANIFEST) || (rootPrefix ? zip.file(rootPrefix + MANIFEST) : null);
  if (manifestEntry) {
    try {
      const manifest = JSON.parse(await manifestEntry.async("string"));
      if (manifest.name) name = manifest.name;
    } catch {
      /* ignore */
    }
  }

  return {
    name,
    files: entries.map((e) => ({ path: e.path, content: e.content })),
  };
}

export function downloadBlob(blob: Blob, filename: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
