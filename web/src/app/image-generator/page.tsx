"use client";

import { useState } from "react";
import { Image as ImageIcon, Download, Sparkles, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function ImageGenerator() {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    try {
      const response = await fetch('/api/image-generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await response.json();
      if (data.success) {
        setGeneratedImage(data.image);
      } else {
        alert(data.error || 'Failed to generate image');
      }
    } catch (error) {
      alert('Failed to generate image');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-screen flex bg-dark-bg">
      {/* Sidebar */}
      <div className="w-64 bg-dark-surface border-r border-dark-border flex flex-col">
        <div className="p-4 flex items-center gap-2">
          <Link href="/chat">
            <img src="/logo.png" alt="Bloomy AI" className="w-8 h-8" />
          </Link>
          <span className="font-semibold text-dark-text">Image Generator</span>
        </div>
        
        <div className="px-4 py-2">
          <div className="text-xs text-dark-text-secondary mb-2">Style Presets</div>
          <div className="space-y-1">
            {["Realistic", "Anime", "3D Render", "Oil Painting", "Digital Art"].map(style => (
              <button key={style} className="w-full text-left px-3 py-2 text-sm text-dark-text-secondary hover:bg-dark-card rounded-md transition-colors">
                {style}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 p-8 flex items-center justify-center">
          {generatedImage ? (
            <div className="relative">
              <img src={generatedImage} alt="Generated" className="max-w-2xl rounded-lg shadow-2xl" />
              <button className="absolute bottom-4 right-4 bg-dark-card border border-dark-border px-4 py-2 rounded-md flex items-center gap-2 hover:bg-dark-surface transition-colors">
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
          ) : (
            <div className="text-center">
              <ImageIcon className="w-16 h-16 text-dark-text-secondary mx-auto mb-4" />
              <p className="text-dark-text-secondary">Enter a prompt to generate an image</p>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="bg-dark-surface border-t border-dark-border p-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-2">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the image you want to generate..."
                className="flex-1 bg-dark-card border border-dark-border rounded-lg px-4 py-3 text-dark-text placeholder-dark-text-secondary focus:outline-none focus:border-dark-border"
                onKeyPress={(e) => e.key === 'Enter' && handleGenerate()}
              />
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="bg-gradient-to-r from-bloomy-blue to-bloomy-purple px-6 py-3 rounded-lg font-medium text-white flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                Generate
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
