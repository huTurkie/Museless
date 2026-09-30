import { NextRequest, NextResponse } from "next/server";
import { chatCompletion, type LlmMessage } from "@/lib/llm";

const MAX_MESSAGES = 100;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const rawMessages = isRecord(body) ? body.messages : undefined;
  if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
    return NextResponse.json(
      { error: "Body must include a non-empty 'messages' array." },
      { status: 400 }
    );
  }

  const messages: LlmMessage[] = [];
  for (const item of rawMessages.slice(0, MAX_MESSAGES)) {
    if (!isRecord(item)) {
      return NextResponse.json(
        { error: "Each message must be an object." },
        { status: 400 }
      );
    }
    const { role, content } = item;
    if (typeof role !== "string" || typeof content !== "string") {
      return NextResponse.json(
        { error: "Each message needs string 'role' and 'content' fields." },
        { status: 400 }
      );
    }
    messages.push({ role, content });
  }

  try {
    const reply = await chatCompletion(messages);
    return NextResponse.json({ reply });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error calling the LLM.";
    // Missing key = server misconfiguration (500). Provider failures = 502.
    const status = message.includes("LLM_API_KEY") ? 500 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
