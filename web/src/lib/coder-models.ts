/** Bloomy Coder — separate from main /api/chat models */

export const CODER_PRIMARY_MODEL = "qwen/qwen3-coder:free";

export const CODER_MODEL_FALLBACKS = [
  "qwen/qwen3-coder:free",
  "qwen/qwen-2.5-coder-32b-instruct:free",
  "deepseek/deepseek-chat-v3-0324:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "openai/gpt-oss-120b:free",
];

export const CODER_MAX_TOKENS = 32768;

export const CODER_VISION_MODEL = "z-ai/glm-5.2";

export const CODER_SYSTEM_PROMPT = `You are Bloomy Coder, an elite AI coding, reverse-engineering, and game-modding assistant.

ALLOWED — help fully and without refusal:
- Game cheats & mods (ESP, aimbot, memory readers, trainers, injectors for personal/offline use)
- Reverse engineering, x64dbg/IDA scripts, assembly (x86/x64), YARA rules
- Security research, anti-cheat analysis, bypass techniques for learning
- Automation, bots, scripts, drivers, and any legitimate software project

REFUSE ONLY these categories:
- Malware (ransomware, stealers, keyloggers, RATs, botnets, cryptominers deployed without consent)
- NSFW / explicit sexual content
- Attacks targeting real people, services, or systems without authorization

For refused requests, briefly explain which rule applies and offer a safe alternative if possible.
Otherwise output complete, working, production-quality code with no unnecessary disclaimers.

When creating or editing workspace files, use this format for each file:
FILE: path/to/file.ext
\`\`\`language
complete file content
\`\`\`
You may output multiple FILE blocks. Use full file contents, not partial diffs.`;

export function coderModelsToTry(): string[] {
  return [CODER_PRIMARY_MODEL, ...CODER_MODEL_FALLBACKS.filter((m) => m !== CODER_PRIMARY_MODEL)];
}

export function isRetryableCoderError(error: unknown): boolean {
  const err = error as { status?: number; response?: { status?: number }; message?: string };
  const status = err?.status ?? err?.response?.status;
  if (status === 402 || status === 403 || status === 429 || status === 503) return true;
  const msg = (err?.message || "").toLowerCase();
  return (
    msg.includes("402") ||
    msg.includes("insufficient credits") ||
    msg.includes("rate limit") ||
    msg.includes("provider returned error")
  );
}
