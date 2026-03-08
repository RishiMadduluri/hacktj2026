import { NextResponse } from "next/server";
import OpenAI from "openai";

/* ------------------------------------------------------------------ */
/*  POST /api/chat — conversational assistant powered by GPT           */
/* ------------------------------------------------------------------ */

function buildClient(): OpenAI {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set");
  return new OpenAI({ apiKey: key });
}

export async function POST(req: Request) {
  // Initialise client
  let client: OpenAI;
  try {
    client = buildClient();
  } catch (err) {
    console.error("[chat] client init failed:", err);
    return NextResponse.json(
      { error: "OpenAI API key not configured" },
      { status: 500 },
    );
  }

  try {
    const { messages, events } = await req.json();

    /* Build context from detected medical events */
    const eventContext =
      events.length > 0
        ? `Below are recent events from the medical monitoring feed:\n${events
          .map(
            (ev: any) =>
              `- ${ev.timestamp}: ${ev.description}${ev.isDangerous ? " (⚠️ Critical)" : ""}`,
          )
          .join("\n")}\n\nAssist the user with questions about these events or provide general guidance.`
        : "No events have been detected yet. You can still help the user with questions about the monitoring feed.";

    const completion = await client.chat.completions.create({
      model: "gpt-3.5-turbo",
      temperature: 0.7,
      max_tokens: 150,
      messages: [
        {
          role: "system",
          content:
            "You are a medical monitoring assistant for FirstWatch. You help caregivers understand real-time health events detected in video feeds. Be concise, calm, and medically cautious.",
        },
        { role: "system", content: eventContext },
        ...messages,
      ],
    });

    const reply = completion.choices?.[0]?.message?.content;
    if (!reply) throw new Error("Empty response from model");

    return NextResponse.json({ content: reply, role: "assistant" });
  } catch (err: unknown) {
    console.error("[chat] error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Chat failed: ${msg}` },
      { status: 500 },
    );
  }
}
