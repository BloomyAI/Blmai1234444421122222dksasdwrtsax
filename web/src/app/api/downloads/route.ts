import { NextResponse } from "next/server";

const GITHUB_REPO = "BloomyAI/BloomyAI";
const APP_VERSION = "1.0.0";

type GhAsset = { name: string; browser_download_url: string; size: number };

export type DownloadPlatform = {
  id: string;
  name: string;
  fileName: string;
  url: string;
  size: string;
  hint: string;
  kind: "installer" | "portable";
};

function formatSize(bytes: number): string {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(0)} MB`;
}

function pickAsset(assets: GhAsset[], patterns: RegExp[]): GhAsset | undefined {
  for (const pattern of patterns) {
    const match = assets.find((a) => pattern.test(a.name));
    if (match) return match;
  }
  return undefined;
}

function buildPlatforms(assets: GhAsset[], releasePage: string): DownloadPlatform[] {
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
      url: win.browser_download_url,
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
      url: mac.browser_download_url,
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
      url: appImage.browser_download_url,
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
      url: tarball.browser_download_url,
      size: formatSize(tarball.size),
      hint: "tar -xzf archive.tar.gz then run the app inside",
      kind: "portable",
    });
  }

  if (!platforms.length && releasePage) {
    return [];
  }

  return platforms;
}

export async function GET() {
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "BloomyAI-Downloads" },
      next: { revalidate: 300 },
    });

    if (res.status === 404) {
      return NextResponse.json({
        available: false,
        version: APP_VERSION,
        releasePage: `https://github.com/${GITHUB_REPO}/releases`,
        actionsPage: `https://github.com/${GITHUB_REPO}/actions/workflows/build-desktop.yml`,
        platforms: [],
        message: "No desktop release yet. Run the Build Desktop Apps workflow on GitHub to publish installers.",
      });
    }

    if (!res.ok) {
      throw new Error(`GitHub API ${res.status}`);
    }

    const release = await res.json();
    const assets: GhAsset[] = release.assets || [];
    const platforms = buildPlatforms(assets, release.html_url);

    return NextResponse.json({
      available: platforms.length > 0,
      version: release.tag_name?.replace(/^desktop-v?/i, "") || APP_VERSION,
      tag: release.tag_name,
      releasePage: release.html_url,
      publishedAt: release.published_at,
      platforms,
    });
  } catch (error) {
    console.error("Downloads API error:", error);
    return NextResponse.json({
      available: false,
      version: APP_VERSION,
      releasePage: `https://github.com/${GITHUB_REPO}/releases`,
      actionsPage: `https://github.com/${GITHUB_REPO}/actions/workflows/build-desktop.yml`,
      platforms: [],
      message: "Could not load releases. Download directly from GitHub Releases.",
    });
  }
}
