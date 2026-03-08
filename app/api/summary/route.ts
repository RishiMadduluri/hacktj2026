import { NextResponse } from "next/server";
import OpenAI from "openai";

/* ------------------------------------------------------------------ */
/*  POST /api/summary — generate an AI summary of key medical moments  */
/* ------------------------------------------------------------------ */

function createClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");
  return new OpenAI({ apiKey });
}

export async function POST(req: Request) {
  let openai: OpenAI;
  try {
    openai = createClient();
  } catch (err) {
    console.error("[summary] client init failed:", err);
    return NextResponse.json(
      { error: "OpenAI API key not configured" },
      { status: 500 },
    );
  }

  try {
    const { keyMoments } = await req.json();

    // Build a readable block of text from the key moments
    const formattedMoments = (keyMoments as any[])
      .map(
        (m) =>
          `Feed: ${m.videoName}\nTime: ${m.timestamp}\nDetails: ${m.description}\nCritical: ${m.isDangerous ? "Yes" : "No"}`,
      )
      .join("\n\n");

    const result = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      temperature: 0.7,
      max_tokens: 500,
      messages: [
        {
          role: "system",
          content:
            "You are a medical safety analyst. Provide concise, clear summaries of medical monitoring data. Highlight any critical health events and suggest follow-up actions.",
        },
        {
          role: "user",
          content: `Summarise the following medical monitoring moments:\n\n${formattedMoments}\n\nFormat:\n1. Overall Assessment (2-3 sentences)\n2. Critical Health Concerns (if any)\n3. Recommended Actions (if any)`,
        },
      ],
    });

    const summary =
      result.choices[0]?.message?.content ?? "Unable to produce summary.";
    return NextResponse.json({ summary });
  } catch (err: unknown) {
    console.error("[summary] error:", err);
    const msg = err instanceof Error ? err.message : "Unexpected failure";
    return NextResponse.json(
      { error: msg, details: String(err) },
      { status: 500 },
    );
  }
}
