const GITHUB_REPO = process.env.GITHUB_REPO || "BloomyAI/BloomyAI";
export const APP_VERSION = "1.0.0";

export type GhAsset = {
  id: number;
  name: string;
  browser_download_url: string;
  size: number;
};

export type DownloadPlatform = {
  id: string;
  name: string;
  fileName: string;
  url: string;
  assetId: number;
  size: string;
  hint: string;
  kind: "installer" | "portable";
};

export function githubToken(): string | undefined {
  return process.env.GITHUB_RELEASES_TOKEN || process.env.GITHUB_TOKEN;
}

export function githubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "BloomyAI-Downloads",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const token = githubToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export function proxyDownloadUrl(assetId: number): string {
  return `/api/downloads/file?id=${assetId}`;
}

function formatSize(bytes: number): string {
  if (!bytes) return "";
  return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
}

function pickAsset(assets: GhAsset[], patterns: RegExp[]): GhAsset | undefined {
  for (const pattern of patterns) {
    const match = assets.find((a) => pattern.test(a.name));
    if (match) return match;
  }
  return undefined;
}

export function buildPlatforms(assets: GhAsset[]): DownloadPlatform[] {
  const win = pickAsset(assets, [/Setup.*\.exe$/i, /\.exe$/i]);
  const macArm = pickAsset(assets, [/macOS-arm64.*\.dmg$/i, /arm64.*\.dmg$/i]);
  const macX64 = pickAsset(assets, [/macOS-x64.*\.dmg$/i]);
  const mac = macArm || macX64;
  const appImage = pickAsset(assets, [/\.AppImage$/i]);
  const tarball = pickAsset(assets, [/\.tar\.gz$/i]);

  const platforms: DownloadPlatform[] = [];

  if (win) {
    platforms.push({
      id: "windows",
      name: "Windows",
      fileName: win.name,
      url: proxyDownloadUrl(win.id),
      assetId: win.id,
      size: formatSize(win.size),
      hint: "Run the installer (.exe) — do not extract it",
      kind: "installer",
    });
  }

  if (mac) {
    platforms.push({
      id: "macos",
      name: "macOS",
      fileName: mac.name,
      url: proxyDownloadUrl(mac.id),
      assetId: mac.id,
      size: formatSize(mac.size),
      hint: "Open the .dmg and drag Bloomy AI to Applications",
      kind: "installer",
    });
  }

  if (appImage) {
    platforms.push({
      id: "linux-appimage",
      name: "Linux",
      fileName: appImage.name,
      url: proxyDownloadUrl(appImage.id),
      assetId: appImage.id,
      size: formatSize(appImage.size),
      hint: "chmod +x file.AppImage && ./file.AppImage",
      kind: "installer",
    });
  }

  if (tarball) {
    platforms.push({
      id: "linux-tarball",
      name: "Linux (tar.gz)",
      fileName: tarball.name,
      url: proxyDownloadUrl(tarball.id),
      assetId: tarball.id,
      size: formatSize(tarball.size),
      hint: "tar -xzf archive.tar.gz then run the app inside",
      kind: "portable",
    });
  }

  return platforms;
}

export async function fetchLatestRelease() {
  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
    headers: githubHeaders(),
    next: { revalidate: 300 },
  });
  return res;
}

export async function resolveAssetDownloadUrl(assetId: string): Promise<string | null> {
  const token = githubToken();
  if (!token) return null;

  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/releases/assets/${assetId}`,
    {
      headers: {
        ...githubHeaders(),
        Accept: "application/octet-stream",
      },
      redirect: "manual",
    }
  );

  if (res.status === 302 || res.status === 307) {
    return res.headers.get("location");
  }

  return null;
}
