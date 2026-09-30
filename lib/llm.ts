// Provider-agnostic chat client for any OpenAI-compatible HTTP API.
// Configure via environment variables:
//   LLM_BASE_URL  e.g. https://api.deepseek.com            (default)
//   LLM_API_KEY   your provider API key                    (required)
//   LLM_MODEL     e.g. deepseek-chat                       (default)
//
// To switch providers later, just change these three variables — no code
// changes needed. Examples:
//   OpenAI:      LLM_BASE_URL=https://api.openai.com/v1        LLM_MODEL=gpt-4o-mini
//   DeepSeek:    LLM_BASE_URL=https://api.deepseek.com         LLM_MODEL=deepseek-chat

export type LlmMessage = {
  role: string;
  content: string;
};

export async function chatCompletion(messages: LlmMessage[]): Promise<string> {
  const baseUrl = (process.env.LLM_BASE_URL || "https://api.deepseek.com").replace(
    /\/+$/,
    ""
  );
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL || "deepseek-chat";

  if (!apiKey) {
    throw new Error(
      "LLM_API_KEY is not set. Add it to .env.local (server-side only) to enable chat."
    );
  }

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages }),
  });

  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    throw new Error(`LLM request failed (HTTP ${res.status}): ${detail}`);
  }

  const data = await res.json();
  const reply: unknown =
    data?.choices?.[0]?.message?.content ??
    data?.choices?.[0]?.message?.reasoning_content;

  if (typeof reply !== "string" || reply.trim() === "") {
    throw new Error("LLM returned an empty response.");
  }

  return reply;
}
