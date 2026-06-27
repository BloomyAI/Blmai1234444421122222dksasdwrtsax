const LANG_MAP: Record<string, string> = {
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  ts: "typescript",
  tsx: "typescript",
  py: "python",
  rb: "ruby",
  go: "go",
  rs: "rust",
  java: "java",
  cpp: "cpp",
  cc: "cpp",
  c: "c",
  h: "c",
  hpp: "cpp",
  cs: "csharp",
  php: "php",
  html: "html",
  htm: "html",
  css: "css",
  scss: "scss",
  sass: "scss",
  less: "less",
  json: "json",
  jsonc: "json",
  xml: "xml",
  yaml: "yaml",
  yml: "yaml",
  md: "markdown",
  mdx: "markdown",
  txt: "plaintext",
  sh: "shell",
  bash: "shell",
  zsh: "shell",
  ps1: "powershell",
  sql: "sql",
  asm: "assembly",
  s: "assembly",
  nasm: "assembly",
  masm: "assembly",
  dp64: "plaintext",
  dp32: "plaintext",
  dd64: "plaintext",
  dd32: "plaintext",
  script: "plaintext",
  lua: "lua",
  yara: "plaintext",
  idc: "plaintext",
  jython: "python",
  vue: "html",
  svelte: "html",
  toml: "plaintext",
  ini: "ini",
  env: "plaintext",
  gitignore: "plaintext",
  dockerfile: "dockerfile",
};

export function getLanguage(filename: string): string {
  const base = filename.split("/").pop() || filename;
  const lower = base.toLowerCase();
  if (lower === "dockerfile") return "dockerfile";
  if (lower.startsWith(".env")) return "plaintext";
  const ext = lower.split(".").pop()?.toLowerCase() || "";
  return LANG_MAP[ext] || "plaintext";
}

export function getFileName(path: string): string {
  return path.split("/").pop() || path;
}

export function normalizePath(path: string): string {
  return path
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+/g, "/")
    .split("/")
    .filter((p) => p && p !== ".")
    .join("/");
}

export function joinPath(...parts: string[]): string {
  return normalizePath(parts.filter(Boolean).join("/"));
}

export function dirname(path: string): string {
  const parts = normalizePath(path).split("/");
  parts.pop();
  return parts.join("/");
}

export function basename(path: string): string {
  return getFileName(normalizePath(path));
}
