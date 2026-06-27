import { NextRequest, NextResponse } from "next/server";
import { resolveAssetDownloadUrl, githubToken } from "@/lib/github-releases";

export async function GET(request: NextRequest) {
  const assetId = request.nextUrl.searchParams.get("id");

  if (!assetId || !/^\d+$/.test(assetId)) {
    return NextResponse.json({ error: "Missing or invalid asset id" }, { status: 400 });
  }

  if (!githubToken()) {
    return NextResponse.json(
      { error: "Downloads not configured. Set GITHUB_RELEASES_TOKEN on the server." },
      { status: 503 }
    );
  }

  try {
    const downloadUrl = await resolveAssetDownloadUrl(assetId);

    if (!downloadUrl) {
      return NextResponse.json({ error: "Asset not found or access denied" }, { status: 404 });
    }

    // GitHub returns a temporary signed URL — redirect the browser there (works for large files)
    return NextResponse.redirect(downloadUrl, 302);
  } catch (error) {
    console.error("Download redirect error:", error);
    return NextResponse.json({ error: "Failed to start download" }, { status: 500 });
  }
}
