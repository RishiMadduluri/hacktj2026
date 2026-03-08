import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

/* ------------------------------------------------------------------ */
/*  POST /api/analyze — mock video-analysis endpoint                   */
/* ------------------------------------------------------------------ */

const geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { videoUrl } = body;

    // TODO: replace mock with real Gemini vision pipeline
    const mockResults = [
      { timestamp: "00:03", description: "Resident begins morning routine" },
      { timestamp: "01:30", description: "Possible unsteady gait detected" },
      { timestamp: "02:45", description: "Subject appears to grip furniture for support" },
      { timestamp: "04:20", description: "Analysis summary: no critical incidents" },
    ];

    // Simulate processing latency
    await new Promise((r) => setTimeout(r, 2000));

    return NextResponse.json(mockResults);
  } catch (_err) {
    return NextResponse.json(
      { error: "Failed to analyse video feed" },
      { status: 500 },
    );
  }
}
