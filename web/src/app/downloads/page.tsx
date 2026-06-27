"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Download, CheckCircle, Clock, Loader2, AlertCircle } from "lucide-react";

type DownloadPlatform = {
  id: string;
  name: string;
  fileName: string;
  url: string;
  size: string;
  hint: string;
  kind: "installer" | "portable";
  available?: boolean;
};

type DownloadsResponse = {
  available: boolean;
  version: string;
  message?: string;
  pending?: string[];
  platforms: DownloadPlatform[];
};

function detectOs(): string {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent.toLowerCase();
  const platform = (navigator.platform || "").toLowerCase();
  if (platform.includes("win") || ua.includes("windows")) return "windows";
  if (platform.includes("mac") || ua.includes("mac")) {
    // Apple Silicon vs Intel — rough check
    if (ua.includes("arm") || ua.includes("aarch64")) return "macos-arm64";
    return "macos-x64";
  }
  if (platform.includes("linux") || ua.includes("linux")) return "linux-appimage";
  return "unknown";
}

export default function DownloadsPage() {
  const [data, setData] = useState<DownloadsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [userOs] = useState(detectOs);

  useEffect(() => {
    fetch("/api/downloads")
      .then((r) => r.json())
      .then(setData)
      .catch(() =>
        setData({
          available: false,
          version: "1.0.0",
          platforms: [],
          message: "Failed to load download info.",
        })
      )
      .finally(() => setLoading(false));
  }, []);

  const recommended = useMemo(() => {
    if (!data?.platforms.length) return null;
    return (
      data.platforms.find((p) => p.id === userOs) ||
      data.platforms.find((p) => p.id.startsWith(userOs.split("-")[0])) ||
      data.platforms[0]
    );
  }, [data, userOs]);

  const comingSoon = [
    { name: "iOS", icon: "fa-brands fa-app-store-ios" },
    { name: "Android", icon: "fa-brands fa-android" },
  ];

  return (
    <div className="min-h-screen bg-[#1E222B]">
      <nav className="bg-[#15171E] border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Bloomy AI" className="w-10 h-10 rounded-full" />
            <span className="text-2xl font-bold gradient-text">Bloomy AI</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="/" className="text-white/80 hover:text-white transition-colors">Home</a>
            <a href="/chat" className="text-white/80 hover:text-white transition-colors">Chat</a>
            <a href="/editor" className="text-white/80 hover:text-white transition-colors">Editor</a>
            <a href="/downloads" className="text-white/80 hover:text-white transition-colors">Downloads</a>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <h1 className="text-4xl font-bold mb-4 gradient-text">Download Bloomy AI Desktop</h1>
          <p className="text-white/70 mb-2">
            Direct installers from our site — Windows .exe, macOS .dmg, Linux AppImage or tar.gz.
          </p>
          {data?.version && (
            <p className="text-white/50 text-sm mb-8">Version {data.version}</p>
          )}

          {loading && (
            <div className="flex items-center gap-2 text-white/60 mb-8">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading downloads…
            </div>
          )}

          {!loading && !data?.available && (
            <div className="glass-card p-6 mb-8 border border-yellow-500/30">
              <div className="flex gap-3">
                <AlertCircle className="w-6 h-6 text-yellow-400 shrink-0" />
                <div>
                  <p className="text-white/90 mb-2">
                    {data?.message || "Installers are not available yet. Check back soon."}
                  </p>
                  {data?.pending && data.pending.length > 0 && (
                    <p className="text-white/50 text-xs font-mono">
                      Expected files: {data.pending.join(", ")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {recommended && data?.available && (
            <div className="glass-card p-6 mb-8 border border-bloomy-purple/40">
              <p className="text-sm text-bloomy-purple mb-2 font-medium">Recommended for your device</p>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold">{recommended.name}</h2>
                  <p className="text-white/60 text-sm">
                    {recommended.fileName}
                    {recommended.size ? ` · ${recommended.size}` : ""}
                  </p>
                  <p className="text-white/40 text-xs font-mono mt-1">{recommended.hint}</p>
                </div>
                <a
                  href={recommended.url}
                  download={recommended.fileName}
                  className="btn-primary px-8 py-3 flex items-center justify-center gap-2 shrink-0"
                >
                  <Download className="w-4 h-4" />
                  Download installer
                </a>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(data?.platforms || []).map((platform, index) => (
              <motion.div
                key={platform.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                className={`glass-card p-6 ${platform.id === recommended?.id ? "ring-1 ring-bloomy-purple/50" : ""}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="text-4xl text-bloomy-purple">
                    <i
                      className={
                        platform.id.includes("windows")
                          ? "fa-brands fa-windows"
                          : platform.id.includes("mac")
                            ? "fa-brands fa-apple"
                            : "fa-brands fa-linux"
                      }
                    />
                  </div>
                  <div className="flex items-center gap-2 text-sm text-green-400">
                    <CheckCircle className="w-4 h-4" />
                    Available
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-1">{platform.name}</h3>
                <p className="text-white/60 text-sm mb-1 truncate" title={platform.fileName}>
                  {platform.fileName}
                </p>
                {platform.size && <p className="text-white/40 text-xs mb-2">{platform.size}</p>}
                <p className="text-white/40 text-xs mb-4 font-mono leading-relaxed">{platform.hint}</p>
                <a
                  href={platform.url}
                  download={platform.fileName}
                  className="w-full py-3 rounded-lg font-medium btn-primary hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  {platform.kind === "installer" ? "Download installer" : "Download"}
                </a>
              </motion.div>
            ))}

            {comingSoon.map((platform, index) => (
              <motion.div
                key={platform.name}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: (data?.platforms.length || 0) * 0.08 + index * 0.08 }}
                className="glass-card p-6 opacity-80"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="text-4xl text-bloomy-purple">
                    <i className={platform.icon} />
                  </div>
                  <div className="flex items-center gap-2 text-sm text-yellow-400">
                    <Clock className="w-4 h-4" />
                    Coming Soon
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-2">{platform.name}</h3>
                <button disabled className="w-full py-3 rounded-lg btn-secondary opacity-50 cursor-not-allowed">
                  Coming Soon
                </button>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
