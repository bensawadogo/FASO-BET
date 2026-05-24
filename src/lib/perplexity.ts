import { readFileSync } from "fs";
import { join } from "path";

export function loadFootballSkill(): string {
  try {
    const path = join(process.cwd(), "src", "skills", "football-prediction.md");
    return readFileSync(path, "utf-8");
  } catch {
    return "Suivre value bet, consensus et combinés express.";
  }
}

const PERPLEXITY_TIMEOUT = 30_000; // 30 secondes

export async function callPerplexityJSON<T>(
  systemPrompt: string,
  userContent: string,
  model = "sonar-pro"
): Promise<T> {
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key) throw new Error("PERPLEXITY_API_KEY manquante");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PERPLEXITY_TIMEOUT);
  let res;
  try {
    res = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        return_citations: false,
        temperature: 0.2,
      }),
    });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Perplexity: ${res.status} — ${err}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Réponse Perplexity vide");

  const jsonMatch = content.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  const jsonStr = jsonMatch ? jsonMatch[0] : content;
  return JSON.parse(jsonStr) as T;
}
