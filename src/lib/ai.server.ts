// Server-only helper for the Lovable AI Gateway.

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

export const SAFETY_RULES = `You are the AI engine of a private productivity workspace.
Absolute rules you must never break:
1. NEVER invent, fabricate or guess facts, names, dates, deadlines, statistics, quotations, authors, publications or references.
2. Only use information explicitly supplied in the user context below.
3. When a requested field is not supported by the supplied information, output exactly "Not specified".
4. Clearly distinguish confirmed decisions from suggestions/ideas, and facts from opinions or uncertainty.
5. Preserve the user's supplied wording and information; do not drop details.
6. Label anything you infer as a suggestion and encourage verification where it matters.
Return ONLY valid JSON matching the requested schema. No markdown fences, no commentary.`;

export type AiJsonResult<T> = { ok: true; data: T } | { ok: false; error: string; status?: number };

export async function callAiJson<T>(opts: {
  system?: string;
  prompt: string;
  model?: string;
}): Promise<AiJsonResult<T>> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) return { ok: false, error: "AI is not configured for this workspace." };

  let res: Response;
  try {
    res = await fetch(GATEWAY, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: opts.model ?? "google/gemini-3.7-flash",
        messages: [
          { role: "system", content: `${SAFETY_RULES}\n\n${opts.system ?? ""}`.trim() },
          { role: "user", content: opts.prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });
  } catch {
    return { ok: false, error: "Could not reach the AI service. Please try again." };
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    let message = body.slice(0, 400) || res.statusText;
    try {
      const parsed = JSON.parse(body) as { error?: { message?: string }; message?: string };
      message = parsed.error?.message ?? parsed.message ?? message;
    } catch {
      /* keep raw */
    }
    if (res.status === 429) message = "AI rate limit reached. Please wait a moment and retry.";
    if (res.status === 402) message = message || "AI credits exhausted for this workspace.";
    return { ok: false, error: message, status: res.status };
  }

  const payload = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = payload.choices?.[0]?.message?.content ?? "";
  try {
    return { ok: true, data: JSON.parse(stripFences(content)) as T };
  } catch {
    return { ok: false, error: "The AI returned an unreadable response. Please retry." };
  }
}

function stripFences(text: string) {
  const trimmed = text.trim();
  if (!trimmed.startsWith("```")) return trimmed;
  return trimmed
    .replace(/^```[a-zA-Z]*\s*/, "")
    .replace(/```$/, "")
    .trim();
}
