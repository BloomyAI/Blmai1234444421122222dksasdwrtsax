import { NextResponse } from "next/server";
import {
  APP_VERSION,
  buildPlatforms,
  fetchLatestRelease,
  githubToken,
  type GhAsset,
} from "@/lib/github-releases";

const GITHUB_REPO = process.env.GITHUB_REPO || "BloomyAI/BloomyAI";

export async function GET() {
  const hasToken = !!githubToken();

  if (!hasToken) {
    return NextResponse.json({
      available: false,
      version: APP_VERSION,
      privateRepo: true,
      releasePage: `https://github.com/${GITHUB_REPO}/releases`,
      actionsPage: `https://github.com/${GITHUB_REPO}/actions/workflows/build-desktop.yml`,
      platforms: [],
      message:
        "Private repo: add GITHUB_RELEASES_TOKEN to your server environment (Vercel) so the site can serve desktop installers.",
    });
  }

  try {
    const res = await fetchLatestRelease();

    if (res.status === 404) {
      return NextResponse.json({
        available: false,
        version: APP_VERSION,
        privateRepo: true,
        releasePage: `https://github.com/${GITHUB_REPO}/releases`,
        actionsPage: `https://github.com/${GITHUB_REPO}/actions/workflows/build-desktop.yml`,
        platforms: [],
        message: "No desktop release yet. Run the Build Desktop Apps workflow on GitHub.",
      });
    }

    if (!res.ok) {
      throw new Error(`GitHub API ${res.status}`);
    }

    const release = await res.json();
    const assets: GhAsset[] = release.assets || [];
    const platforms = buildPlatforms(assets);

    return NextResponse.json({
      available: platforms.length > 0,
      version: release.tag_name?.replace(/^desktop-v?/i, "") || APP_VERSION,
      tag: release.tag_name,
      privateRepo: true,
      releasePage: release.html_url,
      publishedAt: release.published_at,
      platforms,
    });
  } catch (error) {
    console.error("Downloads API error:", error);
    return NextResponse.json({
      available: false,
      version: APP_VERSION,
      privateRepo: true,
      releasePage: `https://github.com/${GITHUB_REPO}/releases`,
      platforms: [],
      message: "Could not load private release assets. Check GITHUB_RELEASES_TOKEN permissions.",
    });
  }
}
