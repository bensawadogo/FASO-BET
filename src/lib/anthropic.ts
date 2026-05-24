import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "fs";
import { join } from "path";

let client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic | null {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  if (!client) client = new Anthropic({ apiKey: key });
  return client;
}

export function loadFootballSkill(): string {
  try {
    const path = join(process.cwd(), "src", "skills", "football-prediction.md");
    return readFileSync(path, "utf-8");
  } catch {
    return "Suivre la méthodologie Poisson, score composite et value bet.";
  }
}

export async function callClaudeJSON<T>(
  systemPrompt: string,
  userContent: string,
  model = "claude-sonnet-4-20250514"
): Promise<T> {
  const anthropic = getAnthropicClient();
  if (!anthropic) throw new Error("ANTHROPIC_API_KEY manquante");

  const response = await anthropic.messages.create({
    model,
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: userContent }],
  });

  const block = response.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") throw new Error("Réponse Claude vide");

  const raw = block.text.trim();
  const jsonMatch = raw.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  const jsonStr = jsonMatch ? jsonMatch[0] : raw;
  return JSON.parse(jsonStr) as T;
}
