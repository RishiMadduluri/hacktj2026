import { NextResponse } from "next/server";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
// Sarah voice — mature, reassuring, confident. Good for medical check-ins.
const VOICE_ID = "EXAVITQu4vr4xnSDxMaL";

export async function POST(request: Request) {
    try {
        const { text } = await request.json();

        if (!text) {
            return NextResponse.json({ error: "No text provided" }, { status: 400 });
        }

        if (!ELEVENLABS_API_KEY) {
            // Return a flag telling the client to use browser TTS
            return NextResponse.json(
                { fallback: true, message: "ElevenLabs API key not configured" },
                { status: 200 }
            );
        }

        const response = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
            {
                method: "POST",
                headers: {
                    Accept: "audio/mpeg",
                    "Content-Type": "application/json",
                    "xi-api-key": ELEVENLABS_API_KEY,
                },
                body: JSON.stringify({
                    text,
                    model_id: "eleven_monolingual_v1",
                    voice_settings: {
                        stability: 0.75,
                        similarity_boost: 0.75,
                        style: 0.0,
                        use_speaker_boost: true,
                    },
                }),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error("[ElevenLabs] API error:", response.status, errorText);
            return NextResponse.json(
                { fallback: true, message: "ElevenLabs API error" },
                { status: 200 }
            );
        }

        const audioBuffer = await response.arrayBuffer();

        return new NextResponse(audioBuffer, {
            status: 200,
            headers: {
                "Content-Type": "audio/mpeg",
                "Content-Length": audioBuffer.byteLength.toString(),
            },
        });
    } catch (error: any) {
        console.error("[ElevenLabs] Error:", error);
        return NextResponse.json(
            { fallback: true, message: error.message || "TTS failed" },
            { status: 200 }
        );
    }
}
