"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.GOOGLE_API_KEY;
if (!API_KEY) {
    throw new Error('GOOGLE_API_KEY environment variable is not set');
}
const genAI = new GoogleGenerativeAI(API_KEY);

export interface VideoEvent {
    isDangerous: boolean;
    timestamp: string;
    description: string;
}

async function callWithRetry(
    fn: () => Promise<{ events: VideoEvent[], rawResponse: string }>,
    maxRetries = 3
): Promise<{ events: VideoEvent[], rawResponse: string }> {
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

export async function detectEvents(base64Image: string): Promise<{ events: VideoEvent[], rawResponse: string }> {
    console.log('Starting frame analysis...');

    if (!base64Image) {
        throw new Error("No image data provided");
    }

    const base64Data = base64Image.split(',')[1];
    if (!base64Data) {
        throw new Error("Invalid image data format");
    }

    return callWithRetry(async () => {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const imagePart = {
            inlineData: {
                data: base64Data,
                mimeType: 'image/jpeg'
            },
        };

        const prompt = `Analyze this frame and determine if any of these specific dangerous situations are occurring:

1. Medical Emergencies:
- Person unconscious or lying motionless
- Person clutching chest/showing signs of heart problems
- Seizures or convulsions
- Difficulty breathing or choking

2. Falls and Injuries:
- Person falling or about to fall
- Person on the ground after a fall
- Signs of injury or bleeding
- Limping or showing signs of physical trauma

3. Distress Signals:
- Person calling for help or showing distress
- Panic attacks or severe anxiety symptoms
- Signs of fainting or dizziness
- Headache or unease
- Signs of unconsciousness

4. Violence or Threats:
- Physical altercations
- Threatening behavior
- Weapons visible

5. Suspicious Activities:
- Shoplifting
- Vandalism
- Trespassing

Return a JSON object in this exact format:

{
    "events": [
        {
            "timestamp": "mm:ss",
            "description": "Brief description of what's happening in this frame",
            "isDangerous": true/false // Set to true if the event involves a fall, injury, unease, pain, accident, or concerning behavior
        }
    ]
}`;

        const result = await model.generateContent([
            prompt,
            imagePart,
        ]);

        const response = await result.response;
        const text = response.text();
        console.log('Raw API Response:', text);

        let jsonStr = text;
        const codeBlockMatch = text.match(/```(?:json)?\s*({[\s\S]*?})\s*```/);
        if (codeBlockMatch) {
            jsonStr = codeBlockMatch[1];
        } else {
            const jsonMatch = text.match(/\{[^]*\}/);
            if (jsonMatch) {
                jsonStr = jsonMatch[0];
            }
        }

        const parsed = JSON.parse(jsonStr);
        return {
            events: parsed.events || [],
            rawResponse: text
        };
    });
}
