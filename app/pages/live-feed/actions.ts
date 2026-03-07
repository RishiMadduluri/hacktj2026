"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.GOOGLE_API_KEY;
if (!API_KEY) {
  throw new Error("GOOGLE_API_KEY environment variable is not set");
}
const genAI = new GoogleGenerativeAI(API_KEY);

export interface MedicalVideoEvent {
  timestamp: string;
  description: string;
  isDangerous: boolean;
  emergencyType: "STROKE" | "FALL" | "CARDIAC" | "SEIZURE" | "DISTRESS" | "NORMAL";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

async function callWithRetry(
  fn: () => Promise<{ events: MedicalVideoEvent[]; rawResponse: string }>,
  maxRetries = 3
): Promise<{ events: MedicalVideoEvent[]; rawResponse: string }> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const is429 = message.includes("429") || message.includes("Too Many Requests") || message.includes("quota");
      if (is429 && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 2000 + Math.random() * 1000;
        console.log(`Rate limited, retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries})...`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error("Max retries exceeded");
}

export async function detectMedicalEvents(
  base64Image: string,
  transcript: string = "",
  patientName: string = "the patient"
): Promise<{ events: MedicalVideoEvent[]; rawResponse: string }> {
  console.log("Starting medical frame analysis...");

  if (!base64Image) throw new Error("No image data provided");

  const base64Data = base64Image.split(",")[1];
  if (!base64Data) throw new Error("Invalid image data format");

  return callWithRetry(async () => {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: "image/jpeg",
      },
    };

    const prompt = `You are a medical emergency AI monitoring ${patientName}, an elderly person living alone.
Carefully analyze this video frame and detect any of the following medical emergency conditions:

- STROKE: facial drooping on one side, sudden slumping, disorientation, head tilt, asymmetric facial expression, sudden inability to move
- FALL: person on the floor, rapid descent, motionless lying down, unable to get up, sprawled position
- CARDIAC: clutching chest or left arm, sudden collapse, doubling over in pain, pressing hand to chest, visible distress with chest pain
- SEIZURE: convulsive movements, uncontrolled jerking, unresponsive while on floor, rigid posture followed by convulsions
- DISTRESS: visible severe pain expression, calling for help (mouth open, distressed face), unconscious and slumped, faint

If the person appears completely normal (sitting, standing, walking, eating, reading — no signs of distress), classify as NORMAL with isDangerous=false.

${transcript ? `Audio transcript context: "${transcript}"` : ""}

Respond ONLY with valid JSON in this exact format — no markdown, no explanation:
{
  "events": [
    {
      "timestamp": "mm:ss",
      "description": "One sentence describing what you observe",
      "isDangerous": true,
      "emergencyType": "STROKE",
      "severity": "HIGH"
    }
  ]
}

emergencyType must be exactly one of: STROKE, FALL, CARDIAC, SEIZURE, DISTRESS, NORMAL
severity must be exactly one of: LOW, MEDIUM, HIGH, CRITICAL
If normal: isDangerous=false, emergencyType=NORMAL, severity=LOW`;

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();
    console.log("Raw medical API response:", text);

    let jsonStr = text;
    const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1];
    } else {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) jsonStr = jsonMatch[0];
    }

    try {
      const parsed = JSON.parse(jsonStr);
      return { events: parsed.events || [], rawResponse: text };
    } catch {
      console.error("Parse error, returning empty");
      return { events: [], rawResponse: text };
    }
  });
}
