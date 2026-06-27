"use client";

import { motion } from "framer-motion";
import { Sparkles, Zap, Shield, Code, Brain, Globe } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Background gradient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-bloomy-pink/20 rounded-full blur-3xl float-animation" />
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-bloomy-purple/20 rounded-full blur-3xl float-animation" style={{ animationDelay: "2s" }} />
        <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-bloomy-blue/20 rounded-full blur-3xl float-animation" style={{ animationDelay: "4s" }} />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 bg-[#1E222B] border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Bloomy AI" className="w-10 h-10 rounded-full" />
            <span className="text-2xl font-bold gradient-text">Bloomy AI</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="/login" className="text-white/80 hover:text-white transition-colors">Login</a>
            <a href="/chat" className="text-white/80 hover:text-white transition-colors">Chat</a>
            <a href="/editor" className="text-white/80 hover:text-white transition-colors">Editor</a>
            <a href="/agents" className="text-white/80 hover:text-white transition-colors">Agents</a>
            <a href="/workspaces" className="text-white/80 hover:text-white transition-colors">Workspaces</a>
            <a href="/settings" className="text-white/80 hover:text-white transition-colors">Settings</a>
            <a href="/chat" className="btn-primary">Start Chatting</a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="inline-block mb-6"
          >
            <div className="glass-card px-6 py-2 inline-flex items-center gap-2">
              <Zap className="w-4 h-4 text-bloomy-pink" />
              <span className="text-sm font-medium">Next-Generation AI Platform</span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-6xl md:text-7xl font-bold mb-6 leading-tight"
          >
            <span className="gradient-text">Complete AI Ecosystem</span>
            <br />
            <span className="text-white">for the Future</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-xl text-white/70 mb-10 max-w-3xl mx-auto"
          >
            Multi-model support, advanced memory system, integrated IDE, project generation, 
            and specialized AI agents - all in one powerful platform.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex items-center justify-center gap-4"
          >
            <a href="/downloads" className="btn-primary text-lg px-8 py-4 inline-flex items-center gap-2">
              Download Bloomy Desktop
            </a>
            <a href="/chat" className="btn-secondary text-lg px-8 py-4 inline-flex items-center gap-2">
              Start Chatting
            </a>
          </motion.div>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7 + index * 0.1 }}
              className="glass-card p-6"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-bloomy-purple/20 to-bloomy-blue/20 flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-bloomy-purple" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-white/70">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Model Tiers */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.2 }}
          className="mt-24"
        >
          <h2 className="text-4xl font-bold text-center mb-12 gradient-text">4-Model System</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {modelTiers.map((tier, index) => (
              <motion.div
                key={tier.name}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 1.3 + index * 0.1 }}
                className="glass-card p-6 text-center"
              >
                <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${tier.colorClass}`}>
                  <tier.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-2">{tier.name}</h3>
                <p className="text-white/70 mb-4">{tier.description}</p>
                <div className="text-sm text-bloomy-purple font-medium">{tier.useCase}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Downloads Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.6 }}
          className="mt-24"
        >
          <h2 className="text-4xl font-bold text-center mb-12 gradient-text">Download Bloomy AI</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { name: "Windows", icon: "fa-brands fa-microsoft", size: "Installer (.exe)", status: "Available" },
              { name: "macOS", icon: "fa-brands fa-apple", size: "Installer (.dmg)", status: "Available" },
              { name: "Linux", icon: "fa-brands fa-linux", size: "AppImage / tar.gz", status: "Available" },
              { name: "iOS", icon: "fa-brands fa-app-store-ios", size: "98 MB", status: "Coming Soon" },
              { name: "Android", icon: "fa-brands fa-android", size: "105 MB", status: "Coming Soon" },
            ].map((platform, index) => (
              <motion.div
                key={platform.name}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 1.7 + index * 0.1 }}
                className="glass-card p-6 text-center"
              >
                <div className="text-4xl mb-4"><i className={platform.icon}></i></div>
                <h3 className="text-xl font-bold mb-2">{platform.name}</h3>
                <p className="text-white/60 mb-4">{platform.size}</p>
                <button
                  onClick={() => platform.status === "Available" && (window.location.href = "/downloads")}
                  className={`w-full py-3 rounded-lg font-medium ${
                    platform.status === "Available"
                      ? "btn-primary"
                      : "btn-secondary opacity-50 cursor-not-allowed"
                  }`}
                  disabled={platform.status !== "Available"}
                >
                  {platform.status === "Available" ? "Download" : "Coming Soon"}
                </button>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 bg-[#1E222B] border-t border-white/10 mt-24">
        <div className="max-w-7xl mx-auto px-6 py-8 text-center text-white/60">
          <p>&copy; 2025 Bloomy AI. All rights reserved.                                                  <a href="https://discord.gg/UP5Njtc53z" target="_blank" rel="noopener noreferrer" className="text-bloomy-purple hover:underline">Join Discord for support</a></p>
        </div>
      </footer>
    </main>
  );
}

const features = [
  {
    icon: Brain,
    title: "Advanced Memory",
    description: "Intelligent memory system with user controls for personalized AI interactions.",
  },
  {
    icon: Code,
    title: "Integrated IDE",
    description: "Full-featured code editor with syntax highlighting and AI-assisted development.",
  },
  {
    icon: Shield,
    title: "Security First",
    description: "Enterprise-grade encryption, API key vault, and secure session management.",
  },
  {
    icon: Globe,
    title: "Multi-Provider",
    description: "Support for OpenAI, Anthropic, Google, DeepSeek, Mistral, Grok, Ollama, and more.",
  },
  {
    icon: Sparkles,
    title: "AI Agents",
    description: "Specialized agents for coding, research, writing, business, and more.",
  },
  {
    icon: Zap,
    title: "Project Generation",
    description: "Generate complete projects with ZIP export for various platforms.",
  },
];

const modelTiers = [
  {
    name: "Bloomy Flash",
    icon: Zap,
    description: "Fast, lightweight models for quick responses",
    useCase: "Quick tasks & simple queries",
    colorClass: "bg-gradient-to-br from-bloomy-pink to-bloomy-purple",
  },
  {
    name: "Bloomy Core",
    icon: Brain,
    description: "Balanced performance for general tasks",
    useCase: "Everyday AI assistance",
    colorClass: "bg-gradient-to-br from-bloomy-purple to-bloomy-blue",
  },
  {
    name: "Bloomy Pro",
    icon: Sparkles,
    description: "One of our best high-performance models for complex tasks",
    useCase: "Complex research & analysis",
    colorClass: "bg-gradient-to-br from-bloomy-blue to-bloomy-purple",
  },
  {
    name: "Bloomy Coder",
    icon: Code,
    description: "Specialized coding models for software development",
    useCase: "Software development",
    colorClass: "bg-gradient-to-br from-bloomy-pink to-bloomy-blue",
  },
];
