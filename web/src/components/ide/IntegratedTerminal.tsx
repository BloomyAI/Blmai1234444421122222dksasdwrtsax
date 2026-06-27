"use client";

import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

interface IntegratedTerminalProps {
  open: boolean;
  onClose: () => void;
  onCommand: (cmd: string) => Promise<{ output: string; error?: string }>;
  lines: { type: string; text: string }[];
}

export function IntegratedTerminal({ open, onClose, onCommand, lines }: IntegratedTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const inputRef = useRef("");

  useEffect(() => {
    if (!open || !containerRef.current) return;

    const term = new Terminal({
      theme: {
        background: "#0D1117",
        foreground: "#C9D1D9",
        cursor: "#58A6FF",
        selectionBackground: "#264F78",
      },
      fontFamily: "'Fira Code', Consolas, monospace",
      fontSize: 13,
      cursorBlink: true,
    });

    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(containerRef.current);
    fit.fit();

    term.writeln("\x1b[32mBloomy IDE Terminal\x1b[0m — type \x1b[33mhelp\x1b[0m for commands");
    term.write("$ ");

    term.onData(async (data) => {
      const code = data.charCodeAt(0);
      if (code === 13) {
        const cmd = inputRef.current.trim();
        term.writeln("");
        inputRef.current = "";

        if (cmd) {
          if (cmd === "clear") {
            term.clear();
          } else if (cmd === "help") {
            term.writeln("  help  — Show commands");
            term.writeln("  clear — Clear terminal");
            term.writeln("  ls    — List workspace files");
            term.writeln("  Other commands run via workspace shell (limited in browser)");
          } else {
            try {
              const result = await onCommand(cmd);
              if (result.output) term.writeln(result.output);
              if (result.error) term.writeln(`\x1b[31m${result.error}\x1b[0m`);
            } catch (e) {
              term.writeln(`\x1b[31m${e}\x1b[0m`);
            }
          }
        }
        term.write("$ ");
      } else if (code === 127) {
        if (inputRef.current.length > 0) {
          inputRef.current = inputRef.current.slice(0, -1);
          term.write("\b \b");
        }
      } else {
        inputRef.current += data;
        term.write(data);
      }
    });

    termRef.current = term;
    fitRef.current = fit;

    const onResize = () => fit.fit();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      term.dispose();
      termRef.current = null;
    };
  }, [open, onCommand]);

  useEffect(() => {
    if (termRef.current && lines.length) {
      const last = lines[lines.length - 1];
      if (last.type === "success" || last.type === "info") {
        termRef.current.writeln(`\x1b[32m${last.text}\x1b[0m`);
      }
    }
  }, [lines]);

  if (!open) return null;

  return (
    <div className="h-52 bg-[#0D1117] border-t border-[#30363D] flex flex-col shrink-0">
      <div className="h-8 flex items-center px-4 gap-3 border-b border-[#30363D] shrink-0">
        <span className="text-sm text-[#C9D1D9]">Terminal</span>
        <button onClick={onClose} className="ml-auto text-[#8B949E] hover:text-[#C9D1D9] text-xs">
          Close
        </button>
      </div>
      <div ref={containerRef} className="flex-1 p-1" />
    </div>
  );
}
