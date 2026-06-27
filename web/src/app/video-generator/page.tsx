"use client";

import { useState } from "react";
import { Video, Download, Sparkles, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function VideoGenerator() {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    try {
      const response = await fetch('/api/video-generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await response.json();
      if (data.success) {
        setGeneratedVideo(data.video);
        setDescription(data.provider ? `${data.description} (${data.provider})` : data.description);
        if (data.note) console.info(data.note);
      } else {
        alert(data.error || 'Failed to generate video');
      }
    } catch (error) {
      alert('Failed to generate video');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!generatedVideo) return;
    try {
      if (generatedVideo.startsWith('data:') || generatedVideo.startsWith('/')) {
        const res = await fetch(generatedVideo);
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `bloomy-video-${Date.now()}.mp4`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const a = document.createElement("a");
        a.href = generatedVideo;
        a.download = `bloomy-video-${Date.now()}.mp4`;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err) {
      window.open(generatedVideo, "_blank");
    }
  };

  return (
    <div className="h-screen flex bg-dark-bg">
      <div className="w-64 bg-dark-surface border-r border-dark-border flex flex-col">
        <div className="p-4 flex items-center gap-2">
          <Link href="/chat">
            <img src="/logo.png" alt="Bloomy AI" className="w-8 h-8" />
          </Link>
          <span className="font-semibold text-dark-text">Video Generator</span>
          <span className="text-xs text-dark-text-secondary block mt-1">Wan 2.2 Fast (free via Pollinations)</span>
        </div>
        
        <div className="px-4 py-2">
          <div className="text-xs text-dark-text-secondary mb-2">Duration</div>
          <div className="space-y-1">
            {["5 seconds", "10 seconds", "30 seconds", "1 minute"].map(duration => (
              <button key={duration} className="w-full text-left px-3 py-2 text-sm text-dark-text-secondary hover:bg-dark-card rounded-md transition-colors">
                {duration}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="flex-1 p-8 flex items-center justify-center">
          {generatedVideo ? (
            <div className="relative">
              <div className="max-w-3xl rounded-lg shadow-2xl bg-dark-card overflow-hidden flex items-center justify-center">
                <video src={generatedVideo} autoPlay loop muted playsInline controls className="w-full h-auto max-h-[60vh] object-contain" />
              </div>
              <button 
                onClick={handleDownload}
                className="absolute bottom-4 right-4 bg-dark-card border border-dark-border px-4 py-2 rounded-md flex items-center gap-2 hover:bg-dark-surface transition-colors"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
          ) : (
            <div className="text-center">
              <Video className="w-16 h-16 text-dark-text-secondary mx-auto mb-4" />
              <p className="text-dark-text-secondary">
                {isGenerating ? 'Generating video… this may take a minute' : 'Enter a prompt to generate a video'}
              </p>
            </div>
          )}
        </div>

        <div className="bg-dark-surface border-t border-dark-border p-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-2">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the video you want to generate..."
                className="flex-1 bg-dark-card border border-dark-border rounded-lg px-4 py-3 text-dark-text placeholder-dark-text-secondary focus:outline-none focus:border-dark-border"
                onKeyPress={(e) => e.key === 'Enter' && handleGenerate()}
              />
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="bg-gradient-to-r from-bloomy-blue to-bloomy-purple px-6 py-3 rounded-lg font-medium text-white flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
